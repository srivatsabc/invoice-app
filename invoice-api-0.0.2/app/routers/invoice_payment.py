# app/routers/invoice_payment.py
from fastapi import APIRouter, HTTPException, Request, Path, Query, Body, Depends
from typing import Optional
from ..models.invoice_payment import (
    CreateInvoicePaymentRequest, CreateInvoicePaymentResponse,
    InvoicePaymentListResponse
)
from ..services.invoice_payment_service import InvoicePaymentService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["invoice-payments"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get invoice payment service
def get_invoice_payment_service():
    return InvoicePaymentService()

@router.post("/invoices/{invoice_number}/ids/{invoice_id}/payments", response_model=CreateInvoicePaymentResponse)
@log_function_call
async def create_invoice_payment(
    request: Request,
    invoice_number: str = Path(..., description="Invoice number", example="4881435208"),
    invoice_id: str = Path(..., description="Invoice header ID", example="a5537578-00f7-4a7e-a73b-4ee2c5eb1989"),
    payment_request: CreateInvoicePaymentRequest = Body(...),
    payment_service: InvoicePaymentService = Depends(get_invoice_payment_service)
):
    """
    Create a new invoice payment entry for a specific invoice
    
    This endpoint creates a new payment for the specified invoice with auto-generated:
    - Batch number (starting from 5001 and incrementing)
    - Pay Rule ID (format: 1 2000_A, 2 2000_B, 3 2000_C, etc.)
    
    Also updates the invoice status to 'Posted' in the invoice_headers table.
    
    URL Format: /api/v3/invoice-management/invoices/{invoice_number}/ids/{invoice_id}/payments
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing create payment for invoice {invoice_number} (ID: {invoice_id}) | Request ID: {request_id} | Amount: {payment_request.amount_paid} {payment_request.currency}{Colors.RESET}")
    
    try:
        payment_response = await payment_service.create_invoice_payment(
            invoice_number=invoice_number,
            invoice_id=invoice_id,
            request=payment_request
        )
        
        log_event("invoice_payment_created", f"Created payment for invoice {invoice_number}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "invoice_number": invoice_number,
            "invoice_id": invoice_id,
            "batch_number": payment_response.payment.batch_number,
            "pay_rule_id": payment_response.payment.pay_rule_id,
            "amount_paid": payment_response.payment.amount_paid,
            "currency": payment_response.payment.currency,
            "created_by": payment_request.created_by,
            "invoice_status_updated": payment_response.invoice_status_updated
        })
        
        logger.info(f"{Colors.GREEN}Payment created successfully for invoice {invoice_number} | Request ID: {request_id} | Batch: {payment_response.payment.batch_number} | Pay Rule: {payment_response.payment.pay_rule_id} | Status Updated: {payment_response.invoice_status_updated}{Colors.RESET}")
        
        return payment_response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404 for invoice not found)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error creating payment for invoice {invoice_number} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating invoice payment: {str(e)}")

@router.get("/payments", response_model=InvoicePaymentListResponse)
@log_function_call
async def get_all_invoice_payments(
    request: Request,
    limit: Optional[int] = Query(None, description="Maximum number of payments to return", ge=1, le=1000),
    offset: Optional[int] = Query(None, description="Number of payments to skip", ge=0),
    payment_service: InvoicePaymentService = Depends(get_invoice_payment_service)
):
    """
    Get all invoice payments
    
    Returns a list of all invoice payments ordered by creation date (newest first).
    Supports optional pagination with limit and offset parameters.
    
    Each payment includes:
    - Invoice number and header ID reference
    - Auto-generated batch number and pay rule ID
    - Payment details (amount, currency, date, time)
    - Creation metadata
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all payments request | Request ID: {request_id} | Limit: {limit} | Offset: {offset}{Colors.RESET}")
    
    try:
        payments_response = await payment_service.get_all_payments(limit=limit, offset=offset)
        
        log_event("invoice_payments_retrieved", f"Retrieved {len(payments_response.payments)} payments", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "returned_count": len(payments_response.payments),
            "total_count": payments_response.total_count,
            "total_amount": payments_response.total_amount,
            "pagination": {"limit": limit, "offset": offset}
        })
        
        logger.info(f"{Colors.GREEN}Invoice payments retrieved successfully | Request ID: {request_id} | Count: {len(payments_response.payments)}/{payments_response.total_count} | Total Amount: {payments_response.total_amount}{Colors.RESET}")
        
        return payments_response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving invoice payments | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving invoice payments: {str(e)}")