# app/services/invoice_service.py - Updated with brand_name support
import pyodbc
import os
from typing import Dict, List, Tuple, Optional
from datetime import datetime, date
from ..models.invoice import InvoiceFilters, Sort, InvoiceData, InvoiceDetailResponse, InvoiceHeader, InvoiceLineItem, InvoiceTaxData
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class InvoiceService:
    """Service class for handling invoice database operations"""
    
    def __init__(self):
        self.connection_string = os.getenv("DBConnectionStringGwh")
        if not self.connection_string:
            raise ValueError("Database connection string not configured")
    
    @log_function_call
    async def get_connection(self) -> pyodbc.Connection:
        """Get database connection"""
        try:
            return pyodbc.connect(self.connection_string)
        except Exception as e:
            logger.error(f"{Colors.RED}Database connection failed: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    
    def build_where_clause(self, filters: InvoiceFilters) -> Tuple[str, List]:
        """
        Build WHERE clause and parameters for invoice filtering
        Returns: (where_clause, parameters)
        """
        where_conditions = []
        parameters = []
        
        # Filter by region if not "All"
        if filters.region and filters.region != "All":
            where_conditions.append("region = ?")
            parameters.append(filters.region)
        
        # Filter by country (supplier_country_code) if not "All"
        if filters.country and filters.country != "All":
            where_conditions.append("supplier_country_code = ?")
            parameters.append(filters.country)
        
        # Filter by vendor (supplier_name) if not "All"
        if filters.vendor and filters.vendor != "All":
            where_conditions.append("supplier_name LIKE ?")
            parameters.append(f"%{filters.vendor}%")
        
        # Filter by brand name if not "All"
        if filters.brandName and filters.brandName != "All":
            where_conditions.append("brand_name LIKE ?")
            parameters.append(f"%{filters.brandName}%")
        
        # Filter by PO number if provided
        if filters.poNumber and filters.poNumber.strip():
            where_conditions.append("po_number LIKE ?")
            parameters.append(f"%{filters.poNumber}%")
        
        # Filter by invoice number if provided
        if filters.invoiceNumber and filters.invoiceNumber.strip():
            where_conditions.append("invoice_number LIKE ?")
            parameters.append(f"%{filters.invoiceNumber}%")
        
        # Filter by invoice type if not "All"
        if filters.invoiceType and filters.invoiceType != "All":
            where_conditions.append("invoice_type = ?")
            parameters.append(filters.invoiceType)
        
        # Filter by received date range
        if filters.receivedFrom and filters.receivedTo:
            where_conditions.append("CAST(created_at AS DATE) BETWEEN ? AND ?")
            parameters.append(filters.receivedFrom)
            parameters.append(filters.receivedTo)
        elif filters.receivedFrom:
            where_conditions.append("CAST(created_at AS DATE) >= ?")
            parameters.append(filters.receivedFrom)
        elif filters.receivedTo:
            where_conditions.append("CAST(created_at AS DATE) <= ?")
            parameters.append(filters.receivedTo)
        
        # Filter by status if not "All"
        if filters.status and filters.status != "All":
            where_conditions.append("status = ?")
            parameters.append(filters.status)
        
        # Filter by user feedback if not "Select"
        if filters.hasUserFeedback and filters.hasUserFeedback != "Select":
            where_conditions.append("feedback = ?")
            parameters.append(filters.hasUserFeedback)
        
        # Combine all conditions
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        return where_clause, parameters
    
    def build_order_clause(self, sort: Sort) -> str:
        """Build ORDER BY clause for sorting - defaults to received date descending"""
        # Map frontend field names to database column names
        field_mapping = {
            "invoiceNumber": "invoice_number",
            "vendor": "supplier_name",
            "brandName": "brand_name",
            "invoiceType": "invoice_type",
            "receivedDate": "created_at",
            "processedDate": "updated_at",
            "status": "status",
            "region": "region",
            "country": "supplier_country_code"
        }
        
        # Default to receivedDate descending if no specific field or if invoiceNumber
        if not sort.field or sort.field == "invoiceNumber":
            return "ORDER BY created_at DESC"
        
        db_field = field_mapping.get(sort.field, "created_at")
        direction = "DESC" if sort.direction == "desc" else "ASC"
        
        return f"ORDER BY {db_field} {direction}"
    
    def format_date(self, dt) -> str:
        """Format date for response"""
        if dt is None:
            return ""
        if isinstance(dt, datetime):
            return dt.strftime("%m/%d/%Y")
        elif isinstance(dt, date):
            return dt.strftime("%m/%d/%Y")
        return str(dt)
    
    def format_invoice_data(self, row) -> Dict[str, str]:
        """Format database row into InvoiceData format"""
        # Format invoice total with currency
        invoice_total = ""
        if row[8] is not None:  # total column (adjusted index)
            currency = row[9] if row[9] else "USD"  # currency column (adjusted index)
            invoice_total = f"{row[8]} {currency}"
        
        # Convert has_logs to "Yes"/"No" string format
        has_logs = "Yes" if row[13] and int(row[13]) == 1 else "No"  # has_logs column (index 13)
        
        return {
            "id": str(row[0]) if row[0] else "",  # Convert UUID to string - KEEP THIS!
            "invoiceNumber": row[1] or "",
            "region": row[2] or "",
            "country": row[3] or "",  # supplier_country_code
            "vendor": row[4] or "",
            "brandName": row[5] or "",  # brand_name column
            "invoiceType": row[6] or "",
            "recdDate": self.format_date(row[7]),  # created_at
            "invoiceTotal": invoice_total,
            "processedDate": self.format_date(row[10]),  # updated_at (adjusted index)
            "status": row[11] or "",  # status (adjusted index)
            "hasUserFeedback": row[12] or "",  # feedback (adjusted index)
            "hasLogs": has_logs  # NEW: has_logs flag (index 13)
        }
    
    @log_function_call
    async def get_filter_options(self) -> Dict[str, any]:
        """Get available filter options from database"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Get distinct regions
            cursor.execute("SELECT DISTINCT region FROM invoice_headers WHERE region IS NOT NULL ORDER BY region")
            regions = [row[0] for row in cursor.fetchall()]
            
            # Get distinct countries grouped by region
            cursor.execute("""
                SELECT DISTINCT region, supplier_country_code 
                FROM invoice_headers 
                WHERE region IS NOT NULL AND supplier_country_code IS NOT NULL 
                ORDER BY region, supplier_country_code
            """)
            countries_data = cursor.fetchall()
            countries = {}
            for region, country in countries_data:
                if region not in countries:
                    countries[region] = []
                if country not in countries[region]:
                    countries[region].append(country)
            
            # Get distinct vendors
            cursor.execute("SELECT DISTINCT supplier_name FROM invoice_headers WHERE supplier_name IS NOT NULL ORDER BY supplier_name")
            vendors = [row[0] for row in cursor.fetchall()]
            
            # Get distinct brand names
            cursor.execute("SELECT DISTINCT brand_name FROM invoice_headers WHERE brand_name IS NOT NULL ORDER BY brand_name")
            brand_names = [row[0] for row in cursor.fetchall()]
            
            # Get distinct invoice types
            cursor.execute("SELECT DISTINCT invoice_type FROM invoice_headers WHERE invoice_type IS NOT NULL ORDER BY invoice_type")
            invoice_types = [row[0] for row in cursor.fetchall()]
            
            # Get distinct statuses
            cursor.execute("SELECT DISTINCT status FROM invoice_headers WHERE status IS NOT NULL ORDER BY status")
            statuses = [row[0] for row in cursor.fetchall()]
            
            return {
                "regions": regions,
                "countries": countries,
                "vendors": vendors,
                "brandNames": brand_names,
                "invoiceTypes": invoice_types,
                "statuses": statuses
            }
            
        finally:
            cursor.close()
            conn.close()
    
    # Corrected portion of the search_invoices method in invoice_service.py

    @log_function_call
    async def search_invoices(self, filters: InvoiceFilters, page: int, page_size: int, sort: Sort) -> Tuple[List[InvoiceData], int, int]:
        """
        Search invoices based on filters and pagination
        Returns: (invoice_list, total_count, total_pages)
        """
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause and parameters
            where_clause, where_params = self.build_where_clause(filters)
            
            # Build ORDER BY clause
            order_clause = self.build_order_clause(sort)
            
            # Count total records matching filters
            count_query = f"""
                SELECT COUNT(*) 
                FROM invoice_headers 
                WHERE {where_clause}
            """
            
            logger.debug(f"{Colors.CYAN}Count Query: {count_query}{Colors.RESET}")
            logger.debug(f"{Colors.CYAN}Parameters: {where_params}{Colors.RESET}")
            
            cursor.execute(count_query, where_params)
            total_count = cursor.fetchone()[0]
            
            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
            
            # Build main query with pagination and UUID-based logs check
            main_query = f"""
                SELECT 
                    h.id,
                    h.invoice_number,
                    h.region,
                    h.supplier_country_code,
                    h.supplier_name,
                    h.brand_name,
                    h.invoice_type,
                    h.created_at,
                    h.total,
                    h.currency,
                    h.updated_at,
                    h.status,
                    h.feedback,
                    CASE 
                        WHEN logs.transaction_id IS NOT NULL THEN 1
                        ELSE 0
                    END as has_logs
                FROM invoice_headers h
                LEFT JOIN (
                    SELECT DISTINCT transaction_id 
                    FROM agent_control_center_logs
                    WHERE transaction_id IS NOT NULL
                ) logs ON h.id = logs.transaction_id
                WHERE {where_clause}
                {order_clause}
                OFFSET ? ROWS 
                FETCH NEXT ? ROWS ONLY
            """
            
            # Execute main query with pagination parameters
            main_params = where_params + [offset, page_size]
            logger.debug(f"{Colors.CYAN}Main Query: {main_query}{Colors.RESET}")
            logger.debug(f"{Colors.CYAN}Parameters: {main_params}{Colors.RESET}")
            
            cursor.execute(main_query, main_params)
            rows = cursor.fetchall()
            
            # Format results
            invoice_results = []
            for row in rows:
                formatted_data = self.format_invoice_data(row)
                invoice_results.append(InvoiceData(**formatted_data))
            
            return invoice_results, total_count, total_pages
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_invoice_detail(self, invoice_number: str, invoice_id: str) -> InvoiceDetailResponse:
        """Get detailed information for a specific invoice by invoice number and ID from all 3 tables"""
        
        # Helper function to safely convert to float
        def safe_float(value):
            """Safely convert value to float, return None if conversion fails"""
            if value is None:
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                logger.warning(f"{Colors.YELLOW}Could not convert '{value}' to float, returning None{Colors.RESET}")
                return None

        # Helper function to safely format date
        def safe_date(value):
            """Safely format date, return None if conversion fails"""
            if value is None:
                return None
            try:
                if isinstance(value, (datetime, date)):
                    return value.strftime("%Y-%m-%d")
                # Try to parse string dates
                elif isinstance(value, str):
                    # Skip if it's clearly not a date
                    if len(value) < 8 or any(char.isalpha() for char in value):
                        return None
                    return value  # Return as-is if it looks like a date string
                return None
            except (AttributeError, ValueError):
                logger.warning(f"{Colors.YELLOW}Could not format date '{value}', returning None{Colors.RESET}")
                return None

        # Helper function to safely convert to string
        def safe_string(value):
            """Safely convert any value to string, handle dates and other types"""
            if value is None:
                return None
            try:
                if isinstance(value, (datetime, date)):
                    return value.strftime("%Y-%m-%d")
                return str(value)
            except Exception:
                logger.warning(f"{Colors.YELLOW}Could not convert '{value}' to string, returning empty string{Colors.RESET}")
                return ""
        
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Query invoice header with all fields including financial data and brand_name
            header_query = """
                SELECT 
                    h.id,                        -- 0
                    h.region,                    -- 1
                    h.supplier_country_code,     -- 2  
                    h.supplier_name,             -- 3
                    h.invoice_number,            -- 4
                    h.supplier_details,          -- 5
                    h.po_number,                 -- 6
                    h.supplier_tax_id,           -- 7
                    h.delivery_note,             -- 8
                    h.created_at,                -- 9
                    h.updated_at,                -- 10
                    h.issue_date,                -- 11
                    h.invoice_receipt_date,      -- 12
                    h.subtotal,                  -- 13
                    h.total,                     -- 14
                    h.currency,                  -- 15
                    h.buyer_details,             -- 16
                    h.buyer_tax_id,              -- 17
                    h.status,                    -- 18
                    h.feedback,                  -- 19
                    h.invoice_type,              -- 20
                    h.extraction_method,         -- 21
                    h.tax,                       -- 22
                    h.due_date,                  -- 23
                    h.tax_point_date,            -- 24
                    h.buyer_company_reg_id,      -- 25
                    h.ship_to_details,           -- 26
                    h.ship_to_country_code,      -- 27
                    h.payment_information,       -- 28
                    h.payment_terms,             -- 29
                    h.notes,                     -- 30
                    h.exchange_rate,             -- 31
                    h.processing_method,         -- 32
                    h.brand_name                 -- 33
                FROM invoice_headers h
                WHERE h.invoice_number = ? AND h.id = ?
            """
            
            cursor.execute(header_query, [invoice_number, invoice_id])
            header_row = cursor.fetchone()
            
            if not header_row:
                raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} with ID {invoice_id} not found")
            
            # Format header data with proper NULL handling and safe type conversion
            header_data = InvoiceHeader(
                id=safe_string(header_row[0]) or "",                  # h.id
                region=safe_string(header_row[1]) or "",               # h.region
                country=safe_string(header_row[2]) or "",              # h.supplier_country_code
                vendor=safe_string(header_row[3]) or "",               # h.supplier_name
                invoiceNumber=safe_string(header_row[4]) or "",        # h.invoice_number
                vendorAddress=safe_string(header_row[5]) or "",        # h.supplier_details
                poNumber=safe_string(header_row[6]) or "",             # h.po_number
                taxId=safe_string(header_row[7]) or "",                # h.supplier_tax_id
                shipmentNumber=safe_string(header_row[8]) or "",       # h.delivery_note
                receivedDate=safe_date(header_row[9]) or "",           # h.created_at
                processedDate=safe_date(header_row[10]) or "",         # h.updated_at
                # Financial fields with safe conversion
                subtotal=safe_float(header_row[13]),                   # h.subtotal
                total=safe_float(header_row[14]),                      # h.total
                currency=safe_string(header_row[15]),                  # h.currency
                tax=safe_float(header_row[22]),                        # h.tax
                # Date fields with safe conversion
                issueDate=safe_date(header_row[11]),                   # h.issue_date
                dueDate=safe_date(header_row[23]),                     # h.due_date
                taxPointDate=safe_date(header_row[24]),                # h.tax_point_date
                # Additional fields with safe string conversion
                buyerDetails=safe_string(header_row[16]),              # h.buyer_details
                buyerTaxId=safe_string(header_row[17]),                # h.buyer_tax_id
                buyerCompanyRegId=safe_string(header_row[25]),         # h.buyer_company_reg_id
                shipToDetails=safe_string(header_row[26]),             # h.ship_to_details
                shipToCountryCode=safe_string(header_row[27]),         # h.ship_to_country_code
                paymentInformation=safe_string(header_row[28]),        # h.payment_information
                paymentTerms=safe_string(header_row[29]),              # h.payment_terms
                notes=safe_string(header_row[30]),                     # h.notes
                exchangeRate=safe_float(header_row[31]),               # h.exchange_rate
                # Status and metadata fields
                status=safe_string(header_row[18]),                    # h.status
                feedback=safe_string(header_row[19]),                  # h.feedback
                invoiceType=safe_string(header_row[20]),               # h.invoice_type
                extractionMethod=safe_string(header_row[21]),          # h.extraction_method
                processingMethod=safe_string(header_row[32]),          # h.processing_method
                brandName=safe_string(header_row[33])                  # h.brand_name
            )
            
            # Query line items using the invoice header ID
            line_items_query = """
                SELECT 
                    li.id, li.description, li.quantity, li.unit_price, 
                    li.amount, li.tax_rate, li.currency_per_line
                FROM invoice_line_items li
                WHERE li.invoice_header_id = ?
                ORDER BY li.line_number, li.id
            """
            
            cursor.execute(line_items_query, [invoice_id])
            line_items_rows = cursor.fetchall()
            
            line_items = []
            for row in line_items_rows:
                line_items.append(InvoiceLineItem(
                    id=row[0] or "",
                    description=row[1] or "",
                    quantity=safe_float(row[2]) or 0.0,
                    unitPrice=safe_float(row[3]) or 0.0,
                    totalPrice=safe_float(row[4]) or 0.0,
                    taxRate=safe_float(row[5]) or 0.0,
                    currency=safe_string(row[6])  # Add currency field
                ))
            
            # Query tax data (derive from line items since we don't have a separate tax table)
            tax_data = []
            for i, row in enumerate(line_items_rows):
                amount = safe_float(row[4])  # amount_gross_per_line
                rate = safe_float(row[5])    # tax_rate
                currency = safe_string(row[6]) or "USD"  # currency_per_line
                
                if amount and rate:
                    tax_amount = amount * rate / 100
                    tax_data.append(InvoiceTaxData(
                        id=str(i + 1),
                        taxAmount=round(tax_amount, 2),
                        taxCategory="Sales Tax",
                        taxJurisdiction=header_row[0] or "Unknown",  # Use region
                        taxRegistration=header_row[6] or f"REG-{invoice_number}"  # Use supplier_tax_id
                    ))
            
            # Query invoice file using the invoice header ID
            file_query = """
                SELECT files.file_base64_content
                FROM invoice_files files
                WHERE files.invoice_header_id = ?
            """
            
            cursor.execute(file_query, [invoice_id])
            file_row = cursor.fetchone()
            
            pdf_url = ""
            if file_row and file_row[0]:
                try:
                    base64_content = file_row[0]
                    logger.info(f"{Colors.CYAN}Loading PDF from database base64 content for invoice {invoice_number}{Colors.RESET}")
                    
                    # Create data URL directly from database base64 content
                    pdf_url = f"data:application/pdf;base64,{base64_content}"
                    
                    logger.info(f"{Colors.GREEN}PDF loaded successfully from database for invoice {invoice_number}{Colors.RESET}")
                    
                except Exception as e:
                    logger.error(f"{Colors.RED}Error processing base64 content: {str(e)}{Colors.RESET}")
                    # Set empty if content can't be processed
                    pdf_url = ""
            else:
                logger.warning(f"{Colors.YELLOW}No PDF content found in database for invoice {invoice_number}{Colors.RESET}")
            
            return InvoiceDetailResponse(
                header=header_data,
                lineItems=line_items,
                taxData=tax_data,
                pdfUrl=pdf_url
            )
            
        finally:
            cursor.close()
            conn.close()