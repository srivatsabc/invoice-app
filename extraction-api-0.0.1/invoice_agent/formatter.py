import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

def transform_json_to_target_format(original_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform original JSON sample directly to target format
    without going through database operations
    """
    
    # Extract the main data sections
    invoice_data = original_json.get('invoice_data', {})
    supplier_name = original_json.get('supplier_name')
    brand_name = original_json.get('brand_name')
    extraction_method = original_json.get('extraction_method')
    processing_method = original_json.get('processing_method')
    
    # Helper functions for safe conversion
    def safe_float(value):
        """Safely convert value to float, return None if conversion fails"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def safe_string(value):
        """Safely convert value to string, return None for null values"""
        if value is None:
            return None
        return str(value)

    def format_date(date_str):
        """Format date string to YYYY-MM-DD format"""
        if not date_str:
            return None
        
        # Handle DD.MM.YYYY format (common in the sample)
        if '.' in date_str:
            try:
                day, month, year = date_str.split('.')
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            except:
                return date_str
        
        return date_str

    # Transform header data
    header = {
        "id": original_json.get('invoice_header_id', str(uuid.uuid4())),
        "region": invoice_data.get('region'),
        "country": invoice_data.get('supplier_country_code'),
        "vendor": supplier_name,
        "invoiceNumber": invoice_data.get('invoice_number'),
        "vendorAddress": invoice_data.get('supplier_details'),
        "poNumber": invoice_data.get('po_number'),
        "taxId": invoice_data.get('supplier_tax_id'),
        "shipmentNumber": invoice_data.get('delivery_note_number') or "",
        "receivedDate": datetime.now().strftime("%Y-%m-%d"),  # Current date as received
        "processedDate": datetime.now().strftime("%Y-%m-%d"),  # Current date as processed
        "subtotal": safe_float(invoice_data.get('subtotal')),
        "tax": safe_float(invoice_data.get('tax')),
        "total": safe_float(invoice_data.get('total')),
        "currency": invoice_data.get('currency'),
        "issueDate": format_date(invoice_data.get('issue_date')),
        "dueDate": format_date(invoice_data.get('due_date')),
        "taxPointDate": format_date(invoice_data.get('tax_point_date')),
        "buyerDetails": invoice_data.get('buyer_details'),
        "buyerTaxId": invoice_data.get('buyer_tax_id'),
        "buyerCompanyRegId": invoice_data.get('buyer_company_reg_id'),
        "shipToDetails": invoice_data.get('ship_to_details'),
        "shipToCountryCode": invoice_data.get('ship_to_country_code'),
        "paymentInformation": invoice_data.get('payment_information'),
        "paymentTerms": invoice_data.get('payment_terms'),
        "notes": invoice_data.get('notes'),
        "exchangeRate": safe_float(invoice_data.get('exchange_rate')),
        "invoiceType": invoice_data.get('invoice_type'),
        "status": "Extracted",  # Default status
        "feedback": "No",  # Default feedback
        "extractionMethod": extraction_method,
        "processingMethod": processing_method,
        "brandName": brand_name
    }

    # Transform line items - filter out items with null amounts
    line_items_raw = invoice_data.get('line_items', [])
    line_items = []
    
    for item in line_items_raw:
        # Skip line items that don't have meaningful data (like delivery notes)
        if (item.get('amount') is None or 
            item.get('quantity') is None or 
            item.get('unit_price') is None):
            continue
            
        line_item = {
            "id": str(uuid.uuid4()),  # Generate new UUID for each line item
            "description": item.get('description', ''),
            "quantity": safe_float(item.get('quantity', 0)),
            "unitPrice": safe_float(item.get('unit_price', 0)),
            "totalPrice": safe_float(item.get('amount', 0)),  # 'amount' maps to 'totalPrice'
            "taxRate": safe_float(item.get('tax_rate', 0)),
            "currency": item.get('currency', invoice_data.get('currency'))  # Use line currency or header currency
        }
        line_items.append(line_item)

    # Generate tax data from line items
    tax_data = []
    for i, item in enumerate(line_items):
        if item['totalPrice'] and item['taxRate']:
            # Calculate tax amount: totalPrice * taxRate / 100
            tax_amount = item['totalPrice'] * item['taxRate'] / 100
            
            tax_entry = {
                "id": str(i + 1),
                "taxAmount": round(tax_amount, 2),
                "taxCategory": "Sales Tax",
                "taxJurisdiction": header['id'],  # Use header ID as jurisdiction
                "taxRegistration": header['poNumber'] or f"REG-{header['invoiceNumber']}"
            }
            tax_data.append(tax_entry)

    # Handle PDF URL (placeholder since we don't have file content)
    pdf_url = "data:application/pdf;base64,JVBERi0xLjcKC"  # Placeholder base64 start

    # Construct final response
    target_format = {
        "header": header,
        "lineItems": line_items,
        "taxData": tax_data,
        "pdfUrl": pdf_url
    }

    return target_format


def transform_with_file_content(original_json: Dict[str, Any], file_base64: Optional[str] = None) -> Dict[str, Any]:
    """
    Transform original JSON with optional file content
    """
    result = transform_json_to_target_format(original_json)
    
    if file_base64:
        result["pdfUrl"] = f"data:application/pdf;base64,{file_base64}"
    
    return result


# FastAPI Response Models for development mode
class InvoiceDetailResponse(BaseModel):
    header: dict
    lineItems: list
    taxData: list
    pdfUrl: str

class DevelopmentResponse(BaseModel):
    status: str
    transaction_id: str
    timestamp: str
    invoice_data: InvoiceDetailResponse

def create_development_response(target_format: dict, transaction_id: str, timestamp: str) -> dict:
    """
    Create a development response that matches the expected response model
    """
    return target_format