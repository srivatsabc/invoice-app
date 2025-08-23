# app/services/invoice_payment_service.py
import pyodbc
import os
from typing import List, Tuple, Optional
from datetime import datetime, date
from ..models.invoice_payment import (
    InvoicePaymentEntry, CreateInvoicePaymentRequest, InvoicePaymentListResponse,
    CreateInvoicePaymentResponse
)
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class InvoicePaymentService:
    """Service class for handling invoice payment database operations"""
    
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
    
    def format_invoice_payment_entry(self, row) -> InvoicePaymentEntry:
        """Format database row into InvoicePaymentEntry"""
        return InvoicePaymentEntry(
            id=row[0],
            invoice_header_id=str(row[1]) if row[1] else "",
            invoice_number=row[2] or "",
            batch_number=row[3],
            pay_rule_id=row[4] or "",
            payment_time=str(row[5]) if row[5] else "",
            payment_date=row[6].strftime("%Y-%m-%d") if row[6] else "",
            batch_amount=float(row[7]) if row[7] else 0.0,
            currency=row[8] or "USD",
            amount_paid=float(row[9]) if row[9] else 0.0,
            created_at=row[10] if row[10] else datetime.now(),
            updated_at=row[11] if row[11] else datetime.now(),
            created_by=row[12]
        )
    
    @log_function_call
    async def verify_invoice_exists(self, invoice_number: str, invoice_id: str) -> bool:
        """Verify that the invoice exists with the given number and ID"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT COUNT(*) 
                FROM invoice_headers 
                WHERE invoice_number = ? AND id = ?
            """
            
            cursor.execute(query, [invoice_number, invoice_id])
            count = cursor.fetchone()[0]
            
            return count > 0
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def update_invoice_status_to_posted(self, invoice_id: str) -> bool:
        """Update invoice status to 'Posted'"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            update_query = """
                UPDATE invoice_headers 
                SET status = 'Posted', updated_at = GETDATE()
                WHERE id = ?
            """
            
            cursor.execute(update_query, [invoice_id])
            rows_affected = cursor.rowcount
            conn.commit()
            
            logger.info(f"{Colors.GREEN}Updated invoice status to 'Posted' for invoice ID: {invoice_id}{Colors.RESET}")
            return rows_affected > 0
            
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error updating invoice status: {str(e)}{Colors.RESET}")
            raise
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def create_invoice_payment(self, invoice_number: str, invoice_id: str, request: CreateInvoicePaymentRequest) -> CreateInvoicePaymentResponse:
        """Create a new invoice payment with auto-generated batch number and pay rule ID"""
        
        # First verify the invoice exists
        if not await self.verify_invoice_exists(invoice_number, invoice_id):
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} with ID {invoice_id} not found")
        
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Generate Pay Rule ID using stored procedure
            cursor.execute("DECLARE @PayRuleId NVARCHAR(50); EXEC sp_GeneratePayRuleId @PayRuleId OUTPUT; SELECT @PayRuleId AS PayRuleId")
            pay_rule_id = cursor.fetchone()[0]
            
            # Get next batch number
            cursor.execute("SELECT NEXT VALUE FOR batch_number_seq")
            batch_number = cursor.fetchone()[0]
            
            # Insert new payment with generated values
            insert_query = """
                INSERT INTO invoice_payments (
                    invoice_header_id,
                    invoice_number,
                    batch_number,
                    pay_rule_id,
                    payment_time,
                    payment_date,
                    batch_amount,
                    currency,
                    amount_paid,
                    created_by
                )
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            cursor.execute(insert_query, [
                invoice_id,
                invoice_number,
                batch_number,
                pay_rule_id,
                request.payment_time,
                request.payment_date,
                request.batch_amount,
                request.currency,
                request.amount_paid,
                request.created_by
            ])
            
            new_id = cursor.fetchone()[0]
            conn.commit()
            
            # Update invoice status to 'Posted'
            status_updated = await self.update_invoice_status_to_posted(invoice_id)
            
            # Retrieve the created payment
            created_payment = await self.get_payment_by_id(new_id)
            if not created_payment:
                raise HTTPException(status_code=500, detail="Failed to retrieve created payment")
            
            logger.info(f"{Colors.GREEN}Created payment for invoice {invoice_number} (ID: {invoice_id}) with batch {created_payment.batch_number}, pay rule {created_payment.pay_rule_id}{Colors.RESET}")
            
            return CreateInvoicePaymentResponse(
                success=True,
                message=f"Payment created successfully for invoice {invoice_number} with batch number {created_payment.batch_number}",
                payment=created_payment,
                invoice_status_updated=status_updated
            )
            
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error creating invoice payment: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error creating invoice payment: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_payment_by_id(self, payment_id: int) -> Optional[InvoicePaymentEntry]:
        """Get a specific payment by ID"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id, invoice_header_id, invoice_number, batch_number, pay_rule_id, 
                    payment_time, payment_date, batch_amount, currency, amount_paid, 
                    created_at, updated_at, created_by
                FROM invoice_payments 
                WHERE id = ?
            """
            
            cursor.execute(query, [payment_id])
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self.format_invoice_payment_entry(row)
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_all_payments(self, limit: Optional[int] = None, offset: Optional[int] = None) -> InvoicePaymentListResponse:
        """Get all invoice payments with optional pagination"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build query with optional pagination
            base_query = """
                SELECT 
                    id, invoice_header_id, invoice_number, batch_number, pay_rule_id, 
                    payment_time, payment_date, batch_amount, currency, amount_paid, 
                    created_at, updated_at, created_by
                FROM invoice_payments
                ORDER BY created_at DESC, batch_number DESC
            """
            
            if limit and offset is not None:
                query = f"{base_query} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
                cursor.execute(query, [offset, limit])
            else:
                cursor.execute(base_query)
            
            rows = cursor.fetchall()
            
            # Format results
            payments = []
            for row in rows:
                payment = self.format_invoice_payment_entry(row)
                payments.append(payment)
            
            # Get total count and sum
            stats_query = """
                SELECT 
                    COUNT(*) as total_count,
                    ISNULL(SUM(amount_paid), 0) as total_amount
                FROM invoice_payments
            """
            cursor.execute(stats_query)
            stats_row = cursor.fetchone()
            
            response = InvoicePaymentListResponse(
                payments=payments,
                total_count=stats_row[0] if stats_row else 0,
                total_amount=float(stats_row[1]) if stats_row and stats_row[1] else 0.0
            )
            
            logger.info(f"{Colors.GREEN}Retrieved {len(payments)} invoice payments (total: {response.total_count}){Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()