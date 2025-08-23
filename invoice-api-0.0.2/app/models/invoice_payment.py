# app/models/invoice_payment.py
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, date, time
from decimal import Decimal


class CreateInvoicePaymentRequest(BaseModel):
    payment_time: str = Field(..., description="Payment time in HH:MM:SS format", example="14:30:00")
    payment_date: str = Field(..., description="Payment date in YYYY-MM-DD format", example="2024-08-20")
    batch_amount: float = Field(..., description="Total batch amount", example=1500.00)
    currency: str = Field("USD", description="Currency code", example="USD")
    amount_paid: float = Field(..., description="Amount paid", example=1500.00)
    created_by: Optional[str] = Field(None, description="User who created the payment")


class InvoicePaymentEntry(BaseModel):
    id: int = Field(..., description="Unique identifier")
    invoice_header_id: str = Field(..., description="Invoice header ID reference")
    invoice_number: str = Field(..., description="Invoice number")
    batch_number: int = Field(..., description="Auto-generated batch number starting from 5001")
    pay_rule_id: str = Field(..., description="Auto-generated pay rule ID in format: 1 2000_A, 2 2000_B, etc.")
    payment_time: str = Field(..., description="Payment time")
    payment_date: str = Field(..., description="Payment date")
    batch_amount: float = Field(..., description="Total batch amount")
    currency: str = Field(..., description="Currency code")
    amount_paid: float = Field(..., description="Amount paid")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    created_by: Optional[str] = Field(None, description="User who created the payment")


class InvoicePaymentListResponse(BaseModel):
    payments: List[InvoicePaymentEntry] = Field(..., description="List of invoice payments")
    total_count: int = Field(..., description="Total number of payments")
    total_amount: float = Field(..., description="Sum of all payment amounts")


class CreateInvoicePaymentResponse(BaseModel):
    success: bool = Field(..., description="Whether the payment was created successfully")
    message: str = Field(..., description="Success message")
    payment: InvoicePaymentEntry = Field(..., description="Created payment details")
    invoice_status_updated: bool = Field(..., description="Whether invoice status was updated to 'Posted'")