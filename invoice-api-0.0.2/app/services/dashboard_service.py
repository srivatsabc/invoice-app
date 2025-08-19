# app/services/dashboard_service.py
import pyodbc
import os
from typing import Dict, List, Tuple, Optional
from datetime import datetime, date, timedelta
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class DashboardService:
    """Service class for handling dashboard database operations"""
    
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
    
    @log_function_call
    async def get_statistics(self, from_date: Optional[date] = None, to_date: Optional[date] = None, 
                           region: Optional[str] = None, country: Optional[str] = None, 
                           vendor: Optional[str] = None) -> Dict:
        """Get overall statistics for dashboard"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause for filtering
            where_conditions = ["1=1"]
            params = []
            
            if from_date and to_date:
                where_conditions.append("CAST(created_at AS DATE) BETWEEN ? AND ?")
                params.extend([from_date, to_date])
            
            if region:
                where_conditions.append("region = ?")
                params.append(region)
            
            if country:
                where_conditions.append("supplier_country_code = ?")
                params.append(country)
            
            if vendor:
                where_conditions.append("supplier_name LIKE ?")
                params.append(f"%{vendor}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # First, let's see what status values we have
            status_check_query = f"""
                SELECT status, COUNT(*) as count
                FROM invoice_headers 
                WHERE {where_clause}
                GROUP BY status
                ORDER BY count DESC
            """
            
            cursor.execute(status_check_query, params)
            status_results = cursor.fetchall()
            logger.info(f"{Colors.CYAN}Status breakdown: {[(row[0], row[1]) for row in status_results]}{Colors.RESET}")
            
            # Get statistics - including 'Extracted' as success
            stats_query = f"""
                SELECT 
                    COUNT(*) as totalProcessed,
                    SUM(CASE WHEN status IN ('Approved', 'Processed', 'Completed', 'Extracted') THEN 1 ELSE 0 END) as totalSuccess,
                    SUM(CASE WHEN status IN ('Failed', 'Rejected', 'Error') THEN 1 ELSE 0 END) as totalFailed
                FROM invoice_headers 
                WHERE {where_clause}
            """
            
            cursor.execute(stats_query, params)
            result = cursor.fetchone()
            
            return {
                "totalProcessed": result[0] or 0,
                "totalSuccess": result[1] or 0,
                "totalFailed": result[2] or 0
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_processing_trend(self, from_date: Optional[date] = None, to_date: Optional[date] = None,
                                 region: Optional[str] = None, country: Optional[str] = None,
                                 vendor: Optional[str] = None) -> Dict:
        """Get processing trend data for dashboard"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # First, let's get the actual date range from the database
            cursor.execute("""
                SELECT 
                    MIN(CAST(created_at AS DATE)) as min_date,
                    MAX(CAST(created_at AS DATE)) as max_date
                FROM invoice_headers 
                WHERE created_at IS NOT NULL
            """)
            db_date_range = cursor.fetchone()
            
            # Use provided dates or fall back to database range
            if not from_date or not to_date:
                if db_date_range[0] and db_date_range[1]:
                    from_date = db_date_range[0]
                    to_date = db_date_range[1]
                else:
                    # Final fallback
                    to_date = date.today()
                    from_date = to_date - timedelta(days=30)
            
            logger.info(f"{Colors.CYAN}Processing trend date range: {from_date} to {to_date}{Colors.RESET}")
            
            # Build WHERE clause for filtering
            where_conditions = ["CAST(created_at AS DATE) BETWEEN ? AND ?"]
            params = [from_date, to_date]
            
            if region:
                where_conditions.append("region = ?")
                params.append(region)
            
            if country:
                where_conditions.append("supplier_country_code = ?")
                params.append(country)
            
            if vendor:
                where_conditions.append("supplier_name LIKE ?")
                params.append(f"%{vendor}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # First, let's see what status values actually exist
            status_query = f"""
                SELECT DISTINCT status, COUNT(*) as count
                FROM invoice_headers 
                WHERE {where_clause}
                GROUP BY status
                ORDER BY count DESC
            """
            
            cursor.execute(status_query, params)
            status_results = cursor.fetchall()
            logger.info(f"{Colors.CYAN}Available status values: {[f'{row[0]}({row[1]})' for row in status_results]}{Colors.RESET}")
            
            # Get daily trend data - simplified to show all invoices first
            trend_query = f"""
                SELECT 
                    CAST(created_at AS DATE) as date,
                    COUNT(*) as total_count,
                    SUM(CASE WHEN status IN ('Approved', 'Processed', 'Completed', 'Extracted') THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status IN ('Failed', 'Rejected', 'Error') THEN 1 ELSE 0 END) as failed_count
                FROM invoice_headers 
                WHERE {where_clause}
                GROUP BY CAST(created_at AS DATE)
                ORDER BY CAST(created_at AS DATE)
            """
            
            cursor.execute(trend_query, params)
            results = cursor.fetchall()
            
            logger.info(f"{Colors.CYAN}Trend query returned {len(results)} rows{Colors.RESET}")
            
            # If no results, create a single data point for today
            if not results:
                logger.warning(f"{Colors.YELLOW}No trend data found, creating default data point{Colors.RESET}")
                labels = [date.today().strftime("%m/%d/%Y")]
                success = [0]
                failed = [0]
            else:
                # Format results
                labels = []
                success = []
                failed = []
                
                for row in results:
                    labels.append(row[0].strftime("%m/%d/%Y"))
                    # For now, let's treat 'Extracted' as success since that seems to be the default status
                    success.append(row[2] or 0)  # success_count
                    failed.append(row[3] or 0)   # failed_count
                    logger.debug(f"{Colors.CYAN}Date: {row[0]}, Total: {row[1]}, Success: {row[2]}, Failed: {row[3]}{Colors.RESET}")
            
            return {
                "labels": labels,
                "success": success,
                "failed": failed
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_top_header_fields(self, from_date: Optional[date] = None, to_date: Optional[date] = None,
                                  region: Optional[str] = None, country: Optional[str] = None,
                                  vendor: Optional[str] = None) -> Dict:
        """Get top 5 values for header fields"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause for filtering
            where_conditions = ["1=1"]
            params = []
            
            if from_date and to_date:
                where_conditions.append("CAST(created_at AS DATE) BETWEEN ? AND ?")
                params.extend([from_date, to_date])
            
            if region:
                where_conditions.append("region = ?")
                params.append(region)
            
            if country:
                where_conditions.append("supplier_country_code = ?")
                params.append(country)
            
            if vendor:
                where_conditions.append("supplier_name LIKE ?")
                params.append(f"%{vendor}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Define header fields to analyze
            header_fields = {
                "Invoice Number": "invoice_number",
                "PO Number": "po_number", 
                "Invoice Date": "issue_date",
                "Due Date": "invoice_receipt_date",
                "Total Amount": "total"
            }
            
            header_values = []
            
            for field_name, column_name in header_fields.items():
                if column_name == "total":
                    # For total amount, format with currency
                    query = f"""
                        SELECT TOP 5 
                            CONCAT(CAST(total AS VARCHAR), ' ', ISNULL(currency, 'USD')) as value,
                            COUNT(*) as count
                        FROM invoice_headers 
                        WHERE {where_clause} AND total IS NOT NULL
                        GROUP BY total, currency
                        ORDER BY COUNT(*) DESC
                    """
                else:
                    query = f"""
                        SELECT TOP 5 
                            {column_name} as value,
                            COUNT(*) as count
                        FROM invoice_headers 
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                
                top_values = []
                for row in results:
                    top_values.append({
                        "value": str(row[0]),
                        "count": row[1]
                    })
                
                header_values.append({
                    "field": field_name,
                    "topValues": top_values
                })
            
            return {
                "fields": list(header_fields.keys()),
                "values": header_values
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_top_line_item_fields(self, from_date: Optional[date] = None, to_date: Optional[date] = None,
                                     region: Optional[str] = None, country: Optional[str] = None,
                                     vendor: Optional[str] = None) -> Dict:
        """Get top 5 values for line item fields"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause for filtering
            where_conditions = ["1=1"]
            params = []
            
            if from_date and to_date:
                where_conditions.append("CAST(h.created_at AS DATE) BETWEEN ? AND ?")
                params.extend([from_date, to_date])
            
            if region:
                where_conditions.append("h.region = ?")
                params.append(region)
            
            if country:
                where_conditions.append("h.supplier_country_code = ?")
                params.append(country)
            
            if vendor:
                where_conditions.append("h.supplier_name LIKE ?")
                params.append(f"%{vendor}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Define line item fields to analyze
            line_item_fields = {
                "Item Description": "li.description",
                "Quantity": "li.quantity",
                "Unit Price": "li.unit_price", 
                "Total Price": "li.amount_gross_per_line",
                "Tax Rate": "li.tax_rate"
            }
            
            line_item_values = []
            
            for field_name, column_name in line_item_fields.items():
                if column_name in ["li.unit_price", "li.amount_gross_per_line"]:
                    # For price fields, format with currency
                    query = f"""
                        SELECT TOP 5 
                            CONCAT('$', CAST({column_name} AS VARCHAR)) as value,
                            COUNT(*) as count
                        FROM invoice_line_items li
                        INNER JOIN invoice_headers h ON li.invoice_header_id = h.id
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                elif column_name == "li.tax_rate":
                    # For tax rate, format as percentage
                    query = f"""
                        SELECT TOP 5 
                            CONCAT(CAST({column_name} AS VARCHAR), '%') as value,
                            COUNT(*) as count
                        FROM invoice_line_items li
                        INNER JOIN invoice_headers h ON li.invoice_header_id = h.id
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                else:
                    query = f"""
                        SELECT TOP 5 
                            {column_name} as value,
                            COUNT(*) as count
                        FROM invoice_line_items li
                        INNER JOIN invoice_headers h ON li.invoice_header_id = h.id
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                
                top_values = []
                for row in results:
                    top_values.append({
                        "value": str(row[0]),
                        "count": row[1]
                    })
                
                line_item_values.append({
                    "field": field_name,
                    "topValues": top_values
                })
            
            return {
                "fields": list(line_item_fields.keys()),
                "values": line_item_values
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_top_tax_data_fields(self, from_date: Optional[date] = None, to_date: Optional[date] = None,
                                    region: Optional[str] = None, country: Optional[str] = None,
                                    vendor: Optional[str] = None) -> Dict:
        """Get top 5 values for tax-related fields"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause for filtering
            where_conditions = ["1=1"]
            params = []
            
            if from_date and to_date:
                where_conditions.append("CAST(h.created_at AS DATE) BETWEEN ? AND ?")
                params.extend([from_date, to_date])
            
            if region:
                where_conditions.append("h.region = ?")
                params.append(region)
            
            if country:
                where_conditions.append("h.supplier_country_code = ?")
                params.append(country)
            
            if vendor:
                where_conditions.append("h.supplier_name LIKE ?")
                params.append(f"%{vendor}%")
            
            where_clause = " AND ".join(where_conditions)
            
            # Define tax fields to analyze (using line items table for tax data)
            tax_fields = {
                "Tax Amount": "li.tax_amount_per_line",
                "Tax Category": "li.tax_rate",  # Using tax_rate as category proxy
                "Tax Jurisdiction": "h.region",  # Using region as jurisdiction proxy
                "Tax Registration": "h.supplier_tax_id"
            }
            
            tax_values = []
            
            for field_name, column_name in tax_fields.items():
                if column_name == "li.tax_amount_per_line":
                    # For tax amount, format with currency
                    query = f"""
                        SELECT TOP 5 
                            CONCAT('$', CAST({column_name} AS VARCHAR)) as value,
                            COUNT(*) as count
                        FROM invoice_line_items li
                        INNER JOIN invoice_headers h ON li.invoice_header_id = h.id
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                elif column_name == "li.tax_rate":
                    # For tax rate (as category), format as percentage
                    query = f"""
                        SELECT TOP 5 
                            CASE 
                                WHEN {column_name} = 0 THEN 'Exempt'
                                WHEN {column_name} <= 5 THEN 'Low Rate'
                                WHEN {column_name} <= 10 THEN 'Standard Rate'
                                ELSE 'High Rate'
                            END as value,
                            COUNT(*) as count
                        FROM invoice_line_items li
                        INNER JOIN invoice_headers h ON li.invoice_header_id = h.id
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY 
                            CASE 
                                WHEN {column_name} = 0 THEN 'Exempt'
                                WHEN {column_name} <= 5 THEN 'Low Rate'
                                WHEN {column_name} <= 10 THEN 'Standard Rate'
                                ELSE 'High Rate'
                            END
                        ORDER BY COUNT(*) DESC
                    """
                else:
                    query = f"""
                        SELECT TOP 5 
                            {column_name} as value,
                            COUNT(*) as count
                        FROM invoice_headers h
                        WHERE {where_clause} AND {column_name} IS NOT NULL
                        GROUP BY {column_name}
                        ORDER BY COUNT(*) DESC
                    """
                
                cursor.execute(query, params)
                results = cursor.fetchall()
                
                top_values = []
                for row in results:
                    top_values.append({
                        "value": str(row[0]),
                        "count": row[1]
                    })
                
                tax_values.append({
                    "field": field_name,
                    "topValues": top_values
                })
            
            return {
                "fields": list(tax_fields.keys()),
                "values": tax_values
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_dashboard_filters(self) -> Dict:
        """Get available filter options for dashboard"""
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
            
            # Get date range (earliest and latest created_at)
            cursor.execute("""
                SELECT 
                    MIN(CAST(created_at AS DATE)) as min_date,
                    MAX(CAST(created_at AS DATE)) as max_date
                FROM invoice_headers 
                WHERE created_at IS NOT NULL
            """)
            date_result = cursor.fetchone()
            
            date_range = {
                "from": date_result[0].strftime("%Y-%m-%d") if date_result[0] else "2024-01-01",
                "to": date_result[1].strftime("%Y-%m-%d") if date_result[1] else "2024-12-31"
            }
            
            return {
                "regions": regions,
                "countries": countries,
                "vendors": vendors,
                "dateRange": date_range
            }
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_dashboard_data(self, from_date: Optional[date] = None, to_date: Optional[date] = None,
                               region: Optional[str] = None, country: Optional[str] = None,
                               vendor: Optional[str] = None) -> Dict:
        """Get complete dashboard data"""
        try:
            # Get all dashboard components
            statistics = await self.get_statistics(from_date, to_date, region, country, vendor)
            processing_trend = await self.get_processing_trend(from_date, to_date, region, country, vendor)
            header_fields = await self.get_top_header_fields(from_date, to_date, region, country, vendor)
            line_item_fields = await self.get_top_line_item_fields(from_date, to_date, region, country, vendor)
            tax_data_fields = await self.get_top_tax_data_fields(from_date, to_date, region, country, vendor)
            filters = await self.get_dashboard_filters()
            
            return {
                "statistics": statistics,
                "processingTrend": processing_trend,
                "top5Fields": {
                    "header": header_fields,
                    "lineItems": line_item_fields,
                    "taxData": tax_data_fields
                },
                "filters": filters
            }
            
        except Exception as e:
            logger.error(f"{Colors.RED}Error getting dashboard data: {str(e)}{Colors.RESET}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error getting dashboard data: {str(e)}")