# models.py - Updated Pydantic Models with Tax and New Fields
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
import uuid

class InvoiceHeader(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_name: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_type: Optional[str] = None
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None                    # NEW: due date
    tax_point_date: Optional[str] = None              # NEW: tax point date
    invoice_receipt_date: Optional[str] = None
    po_number: Optional[str] = None
    supplier_tax_id: Optional[str] = None
    buyer_company_reg_id: Optional[str] = None        # NEW: buyer company registration ID
    buyer_tax_id: Optional[str] = None
    supplier_details: Optional[str] = None
    supplier_country_code: Optional[str] = None
    buyer_details: Optional[str] = None
    buyer_country_code: Optional[str] = None
    ship_to_details: Optional[str] = None             # NEW: ship to address
    ship_to_country_code: Optional[str] = None        # NEW: ship to country
    payment_information: Optional[str] = None         # NEW: payment information
    payment_terms: Optional[str] = None               # NEW: payment terms
    subtotal: Optional[float] = None                  # net amount before tax
    tax: Optional[float] = None                       # NEW: tax amount
    total: Optional[float] = None                     # gross amount (subtotal + tax)
    currency: Optional[str] = None
    notes: Optional[str] = None                       # NEW: invoice notes
    delivery_note: Optional[str] = None
    exchange_rate: Optional[float] = None
    system_routing: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = Field(default="Extracted")
    feedback: Optional[str] = Field(default="No")
    extraction_method: Optional[str] = None
    processing_method: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

    # Date validation for multiple date fields
    @field_validator('issue_date', 'due_date', 'tax_point_date', 'invoice_receipt_date', mode='before')
    @classmethod
    def parse_date(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            # Handle DD.MM.YYYY format
            if '.' in v and len(v.split('.')) == 3:
                day, month, year = v.split('.')
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            # Handle YYYY-MM-DD format (already correct)
            elif '-' in v and len(v.split('-')) == 3:
                return v
        return v

    class Config:
        extra = "ignore"

class InvoiceLineItem(BaseModel):
    """Enhanced Invoice Line Item Model"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_header_id: str
    line_number: Optional[str] = None                 # from JSON
    item_number: Optional[str] = None                 # NEW: item number from JSON
    item_code: Optional[str] = None
    po_number: Optional[str] = None                   # NEW: PO number per line item
    description: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_of_measure: Optional[str] = None
    unit_price: Optional[Decimal] = None
    amount: Optional[Decimal] = None                  # NEW: amount per line from JSON
    weight: Optional[Decimal] = None
    pick_slip: Optional[str] = None
    tool_number: Optional[str] = None
    customer_reference: Optional[str] = None
    
    # Additional fields for compatibility with existing schema
    price_per: Optional[Decimal] = None
    amount_gross_per_line: Optional[Decimal] = None
    amount_net_per_line: Optional[Decimal] = None
    tax_amount_per_line: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    delivery_note: Optional[str] = None
    material_number: Optional[str] = None
    customer_po: Optional[str] = None
    currency_per_line: Optional[str] = None
    is_additional_charge: Optional[bool] = False
    
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)

# Response models for API
class InvoiceHeaderResponse(BaseModel):
    """Invoice Header Response Model for API"""
    id: str
    brand_name: Optional[str] = None
    supplier_name: Optional[str] = None
    invoice_type: Optional[str] = None
    invoice_number: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    tax_point_date: Optional[str] = None
    invoice_receipt_date: Optional[str] = None
    po_number: Optional[str] = None
    supplier_tax_id: Optional[str] = None
    buyer_company_reg_id: Optional[str] = None
    buyer_tax_id: Optional[str] = None
    supplier_details: Optional[str] = None
    supplier_country_code: Optional[str] = None
    buyer_details: Optional[str] = None
    buyer_country_code: Optional[str] = None
    ship_to_details: Optional[str] = None
    ship_to_country_code: Optional[str] = None
    payment_information: Optional[str] = None
    payment_terms: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None                       # NEW: tax amount
    total: Optional[float] = None
    currency: Optional[str] = None
    notes: Optional[str] = None
    delivery_note: Optional[str] = None
    exchange_rate: Optional[float] = None
    system_routing: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = "Extracted"
    feedback: Optional[str] = "No"
    extraction_method: Optional[str] = None
    processing_method: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Additional fields for API compatibility
    poNumber: Optional[str] = None
    shipmentNumber: Optional[str] = None
    
    class Config:
        extra = "ignore"

class InvoiceLineItemResponse(BaseModel):
    """Enhanced Invoice Line Item Response Model"""
    id: Optional[str] = None
    invoice_header_id: str
    line_number: Optional[str] = None
    item_number: Optional[str] = None                 # NEW: item number
    item_code: Optional[str] = None
    po_number: Optional[str] = None                   # NEW: PO number per line
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_of_measure: Optional[str] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None                    # NEW: amount per line
    
    # Legacy fields for compatibility
    price_per: Optional[float] = None
    amount_gross_per_line: Optional[float] = None
    amount_net_per_line: Optional[float] = None
    tax_amount_per_line: Optional[float] = None
    tax_rate: Optional[float] = None
    delivery_note: Optional[str] = None
    material_number: Optional[str] = None
    customer_po: Optional[str] = None
    currency_per_line: Optional[str] = None
    is_additional_charge: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None