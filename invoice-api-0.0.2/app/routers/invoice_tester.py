from fastapi import APIRouter, HTTPException, Query, Depends, Request, Path, UploadFile, File, Form
from typing import Optional, Dict, Any, List
import json
import os
import uuid
import base64
from datetime import date, datetime
from pathlib import Path as FilePath
from ..models.invoice import InvoiceDetailResponse, InvoiceHeader, InvoiceLineItem, InvoiceTaxData
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["invoice-testing"],
    responses={404: {"description": "Not found"}},
)

# Helper function to load JSON data
@log_function_call
async def load_json_data(filename: str) -> Dict[str, Any]:
    """
    Load and parse a JSON file from the data directory
    """
    data_dir = FilePath(__file__).parent.parent / "data"
    file_path = data_dir / filename
    
    try:
        with open(file_path, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        log_event("file_error", f"Configuration file {filename} not found", level="error")
        raise HTTPException(status_code=500, detail=f"Configuration file {filename} not found")
    except json.JSONDecodeError:
        log_event("file_error", f"Error parsing {filename}", level="error")
        raise HTTPException(status_code=500, detail=f"Error parsing {filename}")

# Helper function to save uploaded file
@log_function_call
async def save_uploaded_file(file: UploadFile) -> str:
    """
    Save an uploaded file to the uploads directory
    Returns the filepath
    """
    # Create uploads directory if it doesn't exist
    upload_dir = FilePath(__file__).parent.parent / "uploads"
    upload_dir.mkdir(exist_ok=True)
    
    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save the file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        return str(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    finally:
        # Reset file pointer for potential future reads
        await file.seek(0)

# Dependency to load sample invoice details
async def get_invoice_details():
    data = await load_json_data("invoice_details.json")
    return data.get("invoices", {})

# Simple OCR simulation function
def extract_invoice_details_from_pdf(pdf_path: str, invoice_id: str = None) -> Dict[str, Any]:
    """
    Simulates extracting invoice details from a PDF file
    
    In a real implementation, this would use an OCR or PDF parsing library
    to extract actual information from the PDF.
    """
    # For demo purposes, we'll return a sample invoice with some details
    # derived from the uploaded file
    
    # Get file size and creation time
    file_size = os.path.getsize(pdf_path)
    file_modified = datetime.fromtimestamp(os.path.getmtime(pdf_path))
    
    # Generate an invoice number if not provided
    if not invoice_id:
        invoice_id = f"INV-{uuid.uuid4().hex[:6].upper()}"
    
    # Current date for received date
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    # Use file size to generate some mock values
    amount = round(file_size / 100, 2)
    tax_rate = 8.5
    tax_amount = round(amount * tax_rate / 100, 2)
    
    return {
        "header": {
            "id": "fe0db17c-5d4f-4e31-a41b-90c275ad0cc8",
            "region": "EMEA",
            "country": "CZ",
            "vendor": "Linde Gas a.s.",
            "invoiceNumber": "4237123870",
            "vendorAddress": "Linde Gas a.s.\nU Technoplynu 1324\n198 00 Praha 9",
            "poNumber": "0000125535",
            "taxId": "CZ00011754",
            "shipmentNumber": "",
            "receivedDate": "2025-07-02",
            "processedDate": "2025-07-02",
            "subtotal": 14130.8,
            "tax": 2967.47,
            "total": 17098.27,
            "currency": "CZK",
            "issueDate": "2024-11-30",
            "dueDate": "2025-01-14",
            "taxPointDate": "2024-11-30",
            "buyerDetails": "Cooper-Standard Automotive\nČeská republika s.r.o.\nJamská 2191/33\n591 01 Žďár nad Sázavou",
            "buyerTaxId": "CZ25824031",
            "buyerCompanyRegId": "25824031",
            "shipToDetails": "",
            "shipToCountryCode": "",
            "paymentInformation": "Bankovní spojení pro platby v CZK:\nUniCredit Bank Czech Republic\nand Slovakia,a.s\nČ.účtu: 2113539415/2700\nIBAN: CZ31 2700 0000 0021 13539415\nBIC: BACX CZ PP\nBankovní spojení pro platby v EUR:\nDeutsche Bank AG München\nČ.účtu: 220 230667 800\nBLZ: 700 700 10\nIBAN: DE62 7007 0010 0230 6678 00\nBIC/SWIFT:DEUTDEMMXXX",
            "paymentTerms": "",
            "notes": "Pokyn pro platbu v CZK:č.ú.:2113539415/2700, variabilní symbol= číslo dokladu.\nV případě dotazů k obsahu faktury kontaktujte, prosím, pracovnici péče o zákazníky uvedenou v záhlaví faktury.\nVaše faktury a dodací listy naleznete také na našem eshopu, registrujte se na linde-gas.cz/shop",
            "exchangeRate": 0,
            "invoiceType": "",
            "status": "Extracted",
            "feedback": "No",
            "extractionMethod": "vision_per_invoice",
            "processingMethod": "image",
            "brandName": "Linde"
        },
        "lineItems": [
            {
                "id": "5769f23f-d977-4c10-b6cb-c8331e5d70cd",
                "description": "DENNÍ NÁJEM TECH. PLYNY\nLAHVE\n7730000000\nObdobí zúčtování: 01.11.2024-30.11.2024",
                "quantity": 420.0,
                "unitPrice": 14.9,
                "totalPrice": 6258.0,
                "taxRate": 0.0,
                "currency": "CZK"
            },
            {
                "id": "aafe7271-0752-42e1-9099-e0306170bab3",
                "description": "DODATKOVÝ NÁJEM LAHVE\nTG\n7730000000\nObdobí zúčtování: 01.11.2024-30.11.2024",
                "quantity": 232.0,
                "unitPrice": 23.9,
                "totalPrice": 5544.8,
                "taxRate": 0.0,
                "currency": "CZK"
            },
            {
                "id": "6d9396b0-f438-4390-9f1f-238d6ed9eb11",
                "description": "DENNÍ NÁJEM LAHVE ACE\n7730000000\nObdobí zúčtování:01.11.2024-30.11.2024",
                "quantity": 60.0,
                "unitPrice": 14.9,
                "totalPrice": 894.0,
                "taxRate": 0.0,
                "currency": "CZK"
            },
            {
                "id": "863d2fae-6ced-4e12-974f-4a5e4f950838",
                "description": "DODATKOVÝ NÁJEM LAHVE\nACE\n7730000000\nObdobí zúčtování: 01.11.2024-30.11.2024",
                "quantity": 60.0,
                "unitPrice": 23.9,
                "totalPrice": 1434.0,
                "taxRate": 0.0,
                "currency": "CZK"
            }
        ],
        "taxData": [],
        "pdfUrl": ""
    }

@router.post("/analyze-invoice", response_model=InvoiceDetailResponse)
@log_function_call
async def analyze_invoice(
    request: Request,
    invoice_file: UploadFile = File(...),
    inference_type: Optional[str] = Form(None)
):
    """
    Upload an invoice PDF and get extracted details
    
    This endpoint accepts a PDF file upload and returns extracted invoice details.
    It simulates what an OCR or PDF parsing system would return.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"{Colors.BLUE}Processing invoice PDF analysis request | " 
                f"Filename: {invoice_file.filename} | "
                f"Request ID: {request_id} | "
                f"Client: {client_ip}{Colors.RESET}")
    
    try:
        # Verify file type (basic check, could be enhanced)
        if not invoice_file.content_type or "pdf" not in invoice_file.content_type.lower():
            logger.warning(f"{Colors.YELLOW}Non-PDF file uploaded: {invoice_file.content_type} | Request ID: {request_id}{Colors.RESET}")
            # Still process it, but log the warning
        
        # Save the uploaded file
        file_path = await save_uploaded_file(invoice_file)
        file_size = os.path.getsize(file_path)
        logger.info(f"{Colors.CYAN}Invoice PDF saved | Path: {file_path} | Size: {file_size} bytes{Colors.RESET}")
        
        # Extract invoice details from the PDF (simulated)
        invoice_details = extract_invoice_details_from_pdf(file_path, inference_type)
        
        # Set pdfUrl to empty string as requested
        invoice_details["pdfUrl"] = ""
        
        # Log success
        logger.info(f"{Colors.GREEN}Invoice PDF analysis completed successfully | " 
                    f"Invoice: {invoice_details['header']['invoiceNumber']} | "
                    f"Request ID: {request_id}{Colors.RESET}")
        
        # Return the extracted invoice details
        return InvoiceDetailResponse(**invoice_details)
    
    except Exception as e:
        # Log error
        logger.error(f"{Colors.RED}Error analyzing invoice PDF | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error analyzing invoice PDF: {str(e)}")

@router.post("/compare-invoice", response_model=Dict[str, Any])
@log_function_call
async def compare_invoice(
    request: Request,
    invoice_file: UploadFile = File(...),
    invoice_id: str = Form(...),
    sample_invoices: Dict = Depends(get_invoice_details)
):
    """
    Upload an invoice PDF and compare it to a known invoice
    
    This endpoint accepts a PDF file upload along with an invoice ID,
    extracts details from the PDF, compares them to the stored invoice details,
    and returns a comparison result.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    
    logger.info(f"{Colors.BLUE}Processing invoice comparison request | " 
                f"Invoice ID: {invoice_id} | "
                f"Filename: {invoice_file.filename} | "
                f"Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Check if invoice exists in sample data
        if invoice_id not in sample_invoices:
            logger.warning(f"{Colors.YELLOW}Unknown invoice ID for comparison: {invoice_id} | Request ID: {request_id}{Colors.RESET}")
            raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found for comparison")
        
        # Get the reference invoice
        reference_invoice = sample_invoices[invoice_id]
        
        # Save the uploaded file
        file_path = await save_uploaded_file(invoice_file)
        
        # Extract invoice details from the PDF (simulated)
        extracted_invoice = extract_invoice_details_from_pdf(file_path, invoice_id)
        
        # Compare the extracted invoice with the reference (simple comparison)
        comparison_result = {
            "invoice_id": invoice_id,
            "match_percentage": 70,  # Fixed for demo purposes
            "reference_invoice": {
                "header": reference_invoice["header"],
                # Exclude other fields for brevity
            },
            "extracted_invoice": {
                "header": extracted_invoice["header"],
                # Exclude other fields for brevity
            },
            "differences": [
                {
                    "field": "vendor",
                    "reference_value": reference_invoice["header"]["vendor"],
                    "extracted_value": extracted_invoice["header"]["vendor"],
                    "match": False
                },
                {
                    "field": "invoiceNumber",
                    "reference_value": reference_invoice["header"]["invoiceNumber"],
                    "extracted_value": extracted_invoice["header"]["invoiceNumber"],
                    "match": True
                }
                # Additional differences would be calculated in a real implementation
            ]
        }
        
        # Log success
        logger.info(f"{Colors.GREEN}Invoice comparison completed | " 
                    f"Invoice: {invoice_id} | "
                    f"Match: {comparison_result['match_percentage']}% | "
                    f"Request ID: {request_id}{Colors.RESET}")
        
        # Return the comparison result
        return comparison_result
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log error
        logger.error(f"{Colors.RED}Error comparing invoice | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error comparing invoice: {str(e)}")