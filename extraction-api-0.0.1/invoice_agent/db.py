import pyodbc
import json
import base64
import os
from typing import Dict, List, Any, Optional
import logging
from contextlib import contextmanager
from datetime import datetime
from invoice_agent.models import InvoiceHeader, InvoiceLineItem

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleInvoiceInserter:
    """
    Simple invoice database inserter with base64 file storage
    Assumes JSON has correct field names matching Pydantic models
    """
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
    
    def file_to_base64(self, file_path: str) -> Optional[str]:
        """Convert file to base64 string"""
        try:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                return None
            
            with open(file_path, 'rb') as file:
                file_content = file.read()
                base64_string = base64.b64encode(file_content).decode('utf-8')
                return base64_string
        except Exception as e:
            logger.error(f"Error converting file to base64: {e}")
            return None
    
    @contextmanager
    def get_connection(self):
        """Database connection context manager"""
        conn = None
        try:
            conn = pyodbc.connect(self.connection_string)
            conn.autocommit = False
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def insert_invoice(self, invoice_json: Dict[str, Any], header_id: Optional[str] = None) -> str:
        """
        Insert invoice from JSON
        Args:
            invoice_json: JSON with 'header' and 'line_items' keys
            header_id: Optional UUID for header. If not provided, must be in header data
        """
        try:
            # Extract header data
            header_data = invoice_json.get('header', {})
            
            # Use provided header_id or get from header_data
            if header_id:
                header_data['id'] = header_id
            elif 'id' not in header_data:
                raise ValueError("Header ID must be provided either as parameter or in header data")
            
            header = InvoiceHeader(**header_data)
            
            # Extract line items and add foreign key
            line_items_data = invoice_json.get('line_items', [])
            line_items = []
            
            for item_data in line_items_data:
                # Add foreign key reference
                item_with_fk = {**item_data, 'invoice_header_id': header.id}
                line_item = InvoiceLineItem(**item_with_fk)
                line_items.append(line_item)
            
            # Insert into database
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Insert header
                self._insert_header(cursor, header)
                logger.info(f"Inserted header for invoice: {header.invoice_number} with ID: {header.id}")
                
                # Insert line items
                for line_item in line_items:
                    self._insert_line_item(cursor, line_item)
                
                logger.info(f"Inserted {len(line_items)} line items")
                
                conn.commit()
                logger.info(f"Successfully inserted invoice {header.invoice_number}")
                return header.id
                
        except Exception as e:
            logger.error(f"Error inserting invoice: {e}")
            raise
    
    def _insert_header(self, cursor, header: InvoiceHeader):
        """Insert invoice header - uses getattr with defaults for missing fields"""
        sql = """
        INSERT INTO invoice_headers (
            id, brand_name, supplier_name, invoice_type, invoice_number, issue_date, due_date, tax_point_date,
            invoice_receipt_date, po_number, supplier_tax_id, buyer_company_reg_id, buyer_tax_id, 
            supplier_details, supplier_country_code, buyer_details, buyer_country_code,
            ship_to_details, ship_to_country_code, payment_information, payment_terms,
            subtotal, tax, total, currency, notes, delivery_note, exchange_rate, system_routing, 
            region, status, feedback, extraction_method, processing_method, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Get current datetime
        current_time = datetime.now()
        
        # Use getattr with None defaults for fields that might not exist in the model
        # status and feedback will use database defaults if not provided
        values = (
            getattr(header, 'id', None),
            getattr(header, 'brand_name', None),              # ADD THIS LINE
            getattr(header, 'supplier_name', None),
            getattr(header, 'invoice_type', None),
            getattr(header, 'invoice_number', None),
            getattr(header, 'issue_date', None),
            getattr(header, 'due_date', None),                    # NEW
            getattr(header, 'tax_point_date', None),              # NEW
            getattr(header, 'invoice_receipt_date', None),
            getattr(header, 'po_number', None),
            getattr(header, 'supplier_tax_id', None),
            getattr(header, 'buyer_company_reg_id', None),        # NEW
            getattr(header, 'buyer_tax_id', None),
            getattr(header, 'supplier_details', None),
            getattr(header, 'supplier_country_code', None),
            getattr(header, 'buyer_details', None),
            getattr(header, 'buyer_country_code', None),
            getattr(header, 'ship_to_details', None),             # NEW
            getattr(header, 'ship_to_country_code', None),        # NEW
            getattr(header, 'payment_information', None),         # NEW
            getattr(header, 'payment_terms', None),               # NEW
            float(getattr(header, 'subtotal', 0)) if getattr(header, 'subtotal', None) else None,
            float(getattr(header, 'tax', 0)) if getattr(header, 'tax', None) else None,  # NEW: tax field
            float(getattr(header, 'total', 0)) if getattr(header, 'total', None) else None,
            getattr(header, 'currency', None),
            getattr(header, 'notes', None),                       # NEW
            getattr(header, 'delivery_note', None),
            float(getattr(header, 'exchange_rate', 0)) if getattr(header, 'exchange_rate', None) else None,
            getattr(header, 'system_routing', None),
            getattr(header, 'region', None),
            getattr(header, 'status', 'Extracted'),     # Default to 'Extracted' if not in model
            getattr(header, 'feedback', 'No'),          # Default to 'No' if not in model
            getattr(header, 'extraction_method', None),
            getattr(header, 'processing_method', None),
            getattr(header, 'created_at', current_time),    # Use current datetime if not provided
            getattr(header, 'updated_at', current_time)     # Use current datetime if not provided
        )
        
        cursor.execute(sql, values)
    
    def _insert_line_item(self, cursor, line_item: InvoiceLineItem):
        """Insert line item - uses getattr with defaults for missing fields"""
        sql = """
        INSERT INTO invoice_line_items (
            id, invoice_header_id, line_number, item_number, item_code, description, quantity, 
            unit_of_measure, unit_price, amount, price_per, amount_gross_per_line, amount_net_per_line,
            tax_amount_per_line, tax_rate, delivery_note, material_number, customer_po, po_number,
            currency_per_line, is_additional_charge, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Get current datetime
        current_time = datetime.now()
        
        # Use getattr with None defaults for fields that might not exist in the model
        values = (
            getattr(line_item, 'id', None),
            getattr(line_item, 'invoice_header_id', None),
            getattr(line_item, 'line_number', None),              # NEW
            getattr(line_item, 'item_number', None),              # NEW
            getattr(line_item, 'item_code', None),
            getattr(line_item, 'description', None),
            float(getattr(line_item, 'quantity', 0)) if getattr(line_item, 'quantity', None) else None,
            getattr(line_item, 'unit_of_measure', None),
            float(getattr(line_item, 'unit_price', 0)) if getattr(line_item, 'unit_price', None) else None,
            float(getattr(line_item, 'amount', 0)) if getattr(line_item, 'amount', None) else None,  # NEW
            float(getattr(line_item, 'price_per', 0)) if getattr(line_item, 'price_per', None) else None,
            float(getattr(line_item, 'amount_gross_per_line', 0)) if getattr(line_item, 'amount_gross_per_line', None) else None,
            float(getattr(line_item, 'amount_net_per_line', 0)) if getattr(line_item, 'amount_net_per_line', None) else None,
            float(getattr(line_item, 'tax_amount_per_line', 0)) if getattr(line_item, 'tax_amount_per_line', None) else None,
            float(getattr(line_item, 'tax_rate', 0)) if getattr(line_item, 'tax_rate', None) else None,
            getattr(line_item, 'delivery_note', None),
            getattr(line_item, 'material_number', None),
            getattr(line_item, 'customer_po', None),
            getattr(line_item, 'po_number', None),                # NEW: per line PO number
            getattr(line_item, 'currency_per_line', None),
            getattr(line_item, 'is_additional_charge', False),
            getattr(line_item, 'created_at', current_time),    # Use current datetime if not provided
            getattr(line_item, 'updated_at', current_time)     # Use current datetime if not provided
        )
        
        cursor.execute(sql, values)
    
    def get_invoice(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """Get invoice by number"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get header
                cursor.execute(
                    "SELECT * FROM invoice_headers WHERE invoice_number = ?", 
                    (invoice_number,)
                )
                header_row = cursor.fetchone()
                
                if not header_row:
                    return None
                
                # Convert to dict
                header_columns = [desc[0] for desc in cursor.description]
                header_data = dict(zip(header_columns, header_row))
                
                # Get line items
                cursor.execute(
                    "SELECT * FROM invoice_line_items WHERE invoice_header_id = ?", 
                    (header_data['id'],)
                )
                line_rows = cursor.fetchall()
                
                line_columns = [desc[0] for desc in cursor.description]
                line_items = [dict(zip(line_columns, row)) for row in line_rows]
                
                return {
                    'header': header_data,
                    'line_items': line_items
                }
                
        except Exception as e:
            logger.error(f"Error getting invoice: {e}")
            return None
    
    def update_invoice_status(self, invoice_number: str, status: str) -> bool:
        """Update invoice status"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE invoice_headers SET status = ?, updated_at = ? WHERE invoice_number = ?",
                    (status, datetime.now(), invoice_number)
                )
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating invoice status: {e}")
    def get_invoice_with_file(self, invoice_number: str) -> Optional[Dict[str, Any]]:
        """Get invoice by number including base64 file content"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get header
                cursor.execute(
                    "SELECT * FROM invoice_headers WHERE invoice_number = ?", 
                    (invoice_number,)
                )
                header_row = cursor.fetchone()
                
                if not header_row:
                    return None
                
                # Convert to dict
                header_columns = [desc[0] for desc in cursor.description]
                header_data = dict(zip(header_columns, header_row))
                
                # Get line items
                cursor.execute(
                    "SELECT * FROM invoice_line_items WHERE invoice_header_id = ?", 
                    (header_data['id'],)
                )
                line_rows = cursor.fetchall()
                
                line_columns = [desc[0] for desc in cursor.description]
                line_items = [dict(zip(line_columns, row)) for row in line_rows]
                
                # Get file information including base64 content
                cursor.execute("""
                    SELECT original_file_path, file_base64_content, file_name, file_size, created_at, updated_at
                    FROM invoice_files 
                    WHERE invoice_header_id = ?
                """, (header_data['id'],))
                
                file_row = cursor.fetchone()
                file_info = None
                
                if file_row:
                    file_columns = [desc[0] for desc in cursor.description]
                    file_info = dict(zip(file_columns, file_row))
                
                return {
                    'header': header_data,
                    'line_items': line_items,
                    'file_info': file_info
                }
                
        except Exception as e:
            logger.error(f"Error getting invoice with file: {e}")
            return None
    
    def update_invoice_feedback(self, invoice_number: str, feedback: str) -> bool:
        """Update invoice feedback"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE invoice_headers SET feedback = ?, updated_at = ? WHERE invoice_number = ?",
                    (feedback, datetime.now(), invoice_number)
                )
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating invoice feedback: {e}")
            return False
    
    def batch_insert(self, invoices: List[Dict[str, Any]], header_ids: Optional[List[str]] = None) -> List[str]:
        """
        Insert multiple invoices
        Args:
            invoices: List of invoice JSON data
            header_ids: Optional list of header UUIDs (must match invoices length if provided)
        """
        if header_ids and len(header_ids) != len(invoices):
            raise ValueError("header_ids length must match invoices length")
        
        inserted_ids = []
        for i, invoice_data in enumerate(invoices):
            try:
                header_id = header_ids[i] if header_ids else None
                invoice_id = self.insert_invoice(invoice_data, header_id)
                inserted_ids.append(invoice_id)
            except Exception as e:
                logger.error(f"Failed to insert invoice {i}: {e}")
                continue
        return inserted_ids
    
    def insert_invoice_with_file_path(self, invoice_json: Dict[str, Any], file_path: str, header_id: Optional[str] = None) -> str:
        """
        Insert invoice with file converted to base64
        Args:
            invoice_json: JSON with 'header' and 'line_items' keys
            file_path: Original invoice file path
            header_id: Optional UUID for header. If not provided, must be in header data
        """
        try:
            # Insert the invoice first
            invoice_id = self.insert_invoice(invoice_json, header_id)
            
            # Convert file to base64
            base64_content = self.file_to_base64(file_path)
            if not base64_content:
                logger.warning(f"Could not convert file to base64: {file_path}")
            
            # Get file information
            file_name = os.path.basename(file_path) if file_path else None
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
            
            # Insert the file information with base64 content
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO invoice_files (
                        invoice_header_id, 
                        original_file_path, 
                        file_base64_content, 
                        file_name, 
                        file_size
                    ) VALUES (?, ?, ?, ?, ?)
                """, (invoice_id, file_path, base64_content, file_name, file_size))
                conn.commit()
                
            logger.info(f"Inserted file as base64 for invoice {invoice_id}")
            logger.info(f"Original file path: {file_path}")
            logger.info(f"File name: {file_name}")
            logger.info(f"File size: {file_size} bytes")
            if base64_content:
                logger.info(f"Base64 content length: {len(base64_content)} characters")
            
            return invoice_id
            
        except Exception as e:
            logger.error(f"Error inserting invoice with file: {e}")
            raise

    def insert_initial_header(self, header_id: str, supplier_name: str, brand_name: str, 
                         supplier_details: str, buyer_details: str, ship_to_details: str,
                         supplier_country_code: str, buyer_country_code: str, ship_to_country_code: str,
                         region: str, extraction_method: str, processing_method: str,
                         status: str = "Received") -> bool:
        """
        Insert initial header record with basic info after supplier identification
        Args:
            header_id: Transaction ID
            supplier_name: Extracted supplier name
            brand_name: Extracted brand name
            ... (all the basic fields available after identify_supplier)
            status: Status to set (default: "Received")
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                current_time = datetime.now()
                
                sql = """
                INSERT INTO invoice_headers (
                    id, brand_name, supplier_name, supplier_details, buyer_details, ship_to_details,
                    supplier_country_code, buyer_country_code, ship_to_country_code, region,
                    extraction_method, processing_method, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                values = (
                    header_id, brand_name, supplier_name, supplier_details, buyer_details, ship_to_details,
                    supplier_country_code, buyer_country_code, ship_to_country_code, region,
                    extraction_method, processing_method, status, current_time, current_time
                )
                
                cursor.execute(sql, values)
                conn.commit()
                logger.info(f"Inserted initial header with ID: {header_id}, status: {status}")
                return True
                
        except Exception as e:
            logger.error(f"Error inserting initial header: {e}")
            return False

    def update_header_with_invoice_number(self, header_id: str, invoice_number: str, 
                                        status: str = "Processing") -> bool:
        """
        Update header with invoice number and change status to Processing
        Args:
            header_id: Transaction ID
            invoice_number: Extracted invoice number
            status: Status to set (default: "Processing")
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                sql = """
                UPDATE invoice_headers 
                SET invoice_number = ?, status = ?, updated_at = ?
                WHERE id = ?
                """
                
                cursor.execute(sql, (invoice_number, status, datetime.now(), header_id))
                conn.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"Updated header {header_id} with invoice_number: {invoice_number}, status: {status}")
                    return True
                else:
                    logger.warning(f"No header found with ID: {header_id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating header with invoice number: {e}")
            return False

    def update_full_invoice_data(self, invoice_json: Dict[str, Any], header_id: str) -> str:
        """
        Update existing header with full invoice data and insert line items
        Args:
            invoice_json: JSON with 'header' and 'line_items' keys
            header_id: Existing header ID to update
        """
        try:
            # Extract header data
            header_data = invoice_json.get('header', {})
            header_data['id'] = header_id  # Ensure we use the existing ID
            header_data['status'] = 'Extracted'  # Set final status
            
            header = InvoiceHeader(**header_data)
            
            # Extract line items and add foreign key
            line_items_data = invoice_json.get('line_items', [])
            line_items = []
            
            for item_data in line_items_data:
                # Add foreign key reference
                item_with_fk = {**item_data, 'invoice_header_id': header.id}
                line_item = InvoiceLineItem(**item_with_fk)
                line_items.append(line_item)
            
            # Update database
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Update header with full data
                self._update_full_header(cursor, header)
                logger.info(f"Updated full header for invoice: {header.invoice_number} with ID: {header.id}")
                
                # Insert line items
                for line_item in line_items:
                    self._insert_line_item(cursor, line_item)
                
                logger.info(f"Inserted {len(line_items)} line items")
                
                conn.commit()
                logger.info(f"Successfully updated full invoice {header.invoice_number}")
                return header.id
                
        except Exception as e:
            logger.error(f"Error updating full invoice data: {e}")
            raise

    def _update_full_header(self, cursor, header: InvoiceHeader):
        """Update header with full invoice data"""
        sql = """
        UPDATE invoice_headers SET
            brand_name = ?, supplier_name = ?, invoice_type = ?, invoice_number = ?, 
            issue_date = ?, due_date = ?, tax_point_date = ?, invoice_receipt_date = ?, 
            po_number = ?, supplier_tax_id = ?, buyer_company_reg_id = ?, buyer_tax_id = ?, 
            supplier_details = ?, supplier_country_code = ?, buyer_details = ?, buyer_country_code = ?,
            ship_to_details = ?, ship_to_country_code = ?, payment_information = ?, payment_terms = ?,
            subtotal = ?, tax = ?, total = ?, currency = ?, notes = ?, delivery_note = ?, 
            exchange_rate = ?, system_routing = ?, region = ?, status = ?, feedback = ?, 
            extraction_method = ?, processing_method = ?, updated_at = ?
        WHERE id = ?
        """
        
        current_time = datetime.now()
        
        values = (
            getattr(header, 'brand_name', None),
            getattr(header, 'supplier_name', None),
            getattr(header, 'invoice_type', None),
            getattr(header, 'invoice_number', None),
            getattr(header, 'issue_date', None),
            getattr(header, 'due_date', None),
            getattr(header, 'tax_point_date', None),
            getattr(header, 'invoice_receipt_date', None),
            getattr(header, 'po_number', None),
            getattr(header, 'supplier_tax_id', None),
            getattr(header, 'buyer_company_reg_id', None),
            getattr(header, 'buyer_tax_id', None),
            getattr(header, 'supplier_details', None),
            getattr(header, 'supplier_country_code', None),
            getattr(header, 'buyer_details', None),
            getattr(header, 'buyer_country_code', None),
            getattr(header, 'ship_to_details', None),
            getattr(header, 'ship_to_country_code', None),
            getattr(header, 'payment_information', None),
            getattr(header, 'payment_terms', None),
            float(getattr(header, 'subtotal', 0)) if getattr(header, 'subtotal', None) else None,
            float(getattr(header, 'tax', 0)) if getattr(header, 'tax', None) else None,
            float(getattr(header, 'total', 0)) if getattr(header, 'total', None) else None,
            getattr(header, 'currency', None),
            getattr(header, 'notes', None),
            getattr(header, 'delivery_note', None),
            float(getattr(header, 'exchange_rate', 0)) if getattr(header, 'exchange_rate', None) else None,
            getattr(header, 'system_routing', None),
            getattr(header, 'region', None),
            getattr(header, 'status', 'Extracted'),
            getattr(header, 'feedback', 'No'),
            getattr(header, 'extraction_method', None),
            getattr(header, 'processing_method', None),
            current_time,
            getattr(header, 'id', None)
        )
        
        cursor.execute(sql, values)

    def _insert_file_for_existing_invoice(self, invoice_id: str, file_path: str):
        """Insert file record for an existing invoice"""
        # Convert file to base64
        base64_content = self.file_to_base64(file_path)
        if not base64_content:
            logger.warning(f"Could not convert file to base64: {file_path}")
            return
        
        # Get file information
        file_name = os.path.basename(file_path) if file_path else None
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else None
        
        # Insert the file information with base64 content
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO invoice_files (
                    invoice_header_id, 
                    original_file_path, 
                    file_base64_content, 
                    file_name, 
                    file_size
                ) VALUES (?, ?, ?, ?, ?)
            """, (invoice_id, file_path, base64_content, file_name, file_size))
            conn.commit()
            
        logger.info(f"Inserted file as base64 for existing invoice {invoice_id}")

    def update_invoice_status_by_id(self, header_id: str, status: str) -> bool:
        """Update invoice status by header ID"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE invoice_headers SET status = ?, updated_at = ? WHERE id = ?",
                    (status, datetime.now(), header_id)
                )
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating invoice status by ID: {e}")
            return False

# ========================================================================
# json_transformer.py - Transform your current JSON to expected format

def transform_invoice_json(original_json: Dict[str, Any], header_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Transform your current JSON structure to expected format including tax and new fields
    Args:
        original_json: Your current JSON structure
        header_id: Optional UUID for the header
    """
    invoice_data = original_json.get('invoice_data', {})
    
    # DEBUG: Log what we're finding including tax and brand_name
    print(f"DEBUG: brand_name = {original_json.get('brand_name')}")  # NEW: Debug brand_name
    print(f"DEBUG: supplier_name = {original_json.get('supplier_name')}")
    print(f"DEBUG: issue_date = {invoice_data.get('issue_date')}")
    print(f"DEBUG: due_date = {invoice_data.get('due_date')}")
    print(f"DEBUG: tax_point_date = {invoice_data.get('tax_point_date')}")
    print(f"DEBUG: supplier_tax_id = {invoice_data.get('supplier_tax_id')}")
    print(f"DEBUG: buyer_tax_id = {invoice_data.get('buyer_tax_id')}")
    print(f"DEBUG: buyer_company_reg_id = {invoice_data.get('buyer_company_reg_id')}")
    print(f"DEBUG: subtotal = {invoice_data.get('subtotal')}")
    print(f"DEBUG: tax = {invoice_data.get('tax')}")              # NEW: tax field
    print(f"DEBUG: total = {invoice_data.get('total')}")
    print(f"DEBUG: region = {invoice_data.get('region')}")
    
    # DEBUG: Show the entire top-level JSON structure to find brand_name
    print(f"DEBUG: Top-level JSON keys: {list(original_json.keys())}")
    print(f"DEBUG: Invoice_data keys: {list(invoice_data.keys())}")
    
    # Prepare header data - only include fields that exist
    header_data = {}
    
    # Enhanced field mappings including tax and all new fields
    # Check both top-level and invoice_data level for brand_name
    brand_name_value = original_json.get('brand_name') or invoice_data.get('brand_name')
    
    field_mappings = {
        'brand_name': brand_name_value,                            # Check both locations
        'supplier_name': original_json.get('supplier_name'),
        'invoice_type': invoice_data.get('invoice_type'),
        'invoice_number': invoice_data.get('invoice_number'),
        'issue_date': invoice_data.get('issue_date'),
        'due_date': invoice_data.get('due_date'),                      # NEW
        'tax_point_date': invoice_data.get('tax_point_date'),          # NEW
        'invoice_receipt_date': invoice_data.get('invoice_receipt_date'),
        'po_number': invoice_data.get('po_number'),
        'supplier_tax_id': invoice_data.get('supplier_tax_id'),
        'buyer_company_reg_id': invoice_data.get('buyer_company_reg_id'),  # NEW
        'buyer_tax_id': invoice_data.get('buyer_tax_id'),
        'supplier_details': invoice_data.get('supplier_details'),
        'supplier_country_code': invoice_data.get('supplier_country_code'),
        'buyer_details': invoice_data.get('buyer_details'),
        'buyer_country_code': invoice_data.get('buyer_country_code'),
        'ship_to_details': invoice_data.get('ship_to_details'),        # NEW
        'ship_to_country_code': invoice_data.get('ship_to_country_code'),  # NEW
        'payment_information': invoice_data.get('payment_information'), # NEW
        'payment_terms': invoice_data.get('payment_terms'),            # NEW
        'subtotal': invoice_data.get('subtotal'),
        'tax': invoice_data.get('tax'),                                # NEW: tax field
        'total': invoice_data.get('total'),
        'currency': invoice_data.get('currency'),
        'notes': invoice_data.get('notes'),                            # NEW
        'delivery_note': invoice_data.get('delivery_note'),
        'exchange_rate': invoice_data.get('exchange_rate'),
        'system_routing': invoice_data.get('system_routing'),
        'region': invoice_data.get('region'),
        'extraction_method': original_json.get('extraction_method'),
        'processing_method': original_json.get('processing_method'),
    }
    
    # Add header ID if provided
    if header_id:
        header_data['id'] = header_id
    
    # Only add fields that are not None
    for key, value in field_mappings.items():
        if value is not None:
            header_data[key] = value
            print(f"DEBUG: Added {key} = {value}")  # DEBUG logging
        else:
            print(f"DEBUG: Skipped {key} = {value} (is None)")  # Debug skipped fields
    
    # Get line items and transform currency field to currency_per_line
    line_items = invoice_data.get('line_items', [])
    transformed_line_items = []
    
    print(f"DEBUG: Processing {len(line_items)} line items")
    
    for i, item in enumerate(line_items):
        # Copy the item and map currency to currency_per_line
        transformed_item = item.copy()
        
        # Debug: Show the original item structure
        print(f"DEBUG: Line item {i+1} original data: {item}")
        
        # Map currency field to currency_per_line if it exists
        if 'currency' in item:
            transformed_item['currency_per_line'] = item['currency']
            print(f"DEBUG: Line item {i+1} currency mapped: {item['currency']} -> currency_per_line")
        else:
            print(f"DEBUG: Line item {i+1} has NO currency field")
            # If no currency at line level, use header currency if available
            header_currency = invoice_data.get('currency')
            if header_currency:
                transformed_item['currency_per_line'] = header_currency
                print(f"DEBUG: Line item {i+1} using header currency: {header_currency} -> currency_per_line")
        
        transformed_line_items.append(transformed_item)
        print(f"DEBUG: Line item {i+1} final fields: {list(transformed_item.keys())}")
    
    return {
        'header': header_data,
        'line_items': transformed_line_items
    }