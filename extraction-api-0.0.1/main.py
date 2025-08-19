from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging
import json
import os
import uuid
from datetime import datetime

# Import your invoice extraction agent
from invoice_agent.extraction import process_main
from invoice_agent.formatter import transform_json_to_target_format, create_development_response
from fastapi.middleware.cors import CORSMiddleware
from middleware.logging import RequestLoggingMiddleware, logger, Colors

# Add these imports at the top
import tempfile
import os
import base64

# Add this right after creating the FastAPI app
app = FastAPI(
    title="Invoice Management API",
    description="API for managing invoices and retrieving invoice data",
    version="0.0.1",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# AZURE APP SERVICE: Configure temp directory for file uploads
if os.environ.get('WEBSITE_SITE_NAME'):  # Running in Azure App Service
    # Use Azure App Service specific temp directory
    temp_dir = "/home/temp"
    upload_dir = "/home/uploads"
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Set temp directory for file operations
    tempfile.tempdir = temp_dir
    os.environ['TMPDIR'] = temp_dir
    os.environ['TEMP'] = temp_dir
    os.environ['TMP'] = temp_dir
    
    print(f"Azure App Service detected - using temp dir: {temp_dir}")
else:
    print("Running locally or in Docker")

# Add this middleware for Azure App Service
@app.middleware("http")
async def azure_app_service_middleware(request, call_next):
    # Set temp directory for this request
    if os.environ.get('WEBSITE_SITE_NAME'):
        tempfile.tempdir = "/home/temp"
    
    response = await call_next(request)
    return response

# Add request logging middleware
# Add this to your main.py after creating the FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Add file upload size limits
from fastapi.middleware.trustedhost import TrustedHostMiddleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Response model
class InvoiceProcessingResponse(BaseModel):
    status: str
    transaction_id: str
    invoice_header_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: str

def process_invoice_from_file(request_data):
    """
    Process an invoice from uploaded file content and save to invoice_store.
    """
    try:
        # Extract parameters
        file_name = request_data["file_name"]
        #filename = request_data["filename"]
        processing_method = request_data["processing_method"]
        processing_level = request_data["processing_level"]
        processing_max_pages = request_data["processing_max_pages"]
        pages = request_data["pages"]
        timestamp = request_data["timestamp"]
        transaction_id = request_data["transaction_id"]
        development = request_data.get("development", False)  # Get development flag
        
        logger.info(f"Processing file: {file_name} with method: {processing_method}")
        logger.info(f"Development mode: {development}")
        
        # # Save uploaded file to invoice_store directory
        # invoice_store_dir = "invoice_store"
        # os.makedirs(invoice_store_dir, exist_ok=True)
        
        # # Create a safe filename
        # safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        # temp_file_path = os.path.join(invoice_store_dir, safe_filename)
        
        # with open(temp_file_path, 'wb') as f:
        #     f.write(file_content)
        
        # logger.info(f"File saved to: {temp_file_path}")
        
        # Create the invoice request JSON that your existing agent expects
        invoice_request_json = json.dumps({
            "invoice_path": file_name,  # Relative path from invoice_store
            "processing_method": processing_method,
            "processing_level": processing_level,
            "processing_max_pages": processing_max_pages,
            "pages": pages,
            "timestamp": timestamp,
            "transaction_id": transaction_id
        })
        
        # Call the main processing function from extraction.py
        # Pass development flag to control database insertion
        result = process_main(invoice_request_json, skip_db_insert=development)
        
        return result, None  # Return None for output_filename since it's handled internally
        
    except Exception as e:
        logger.error(f"Error processing invoice from file: {str(e)}")
        
        # Create error response
        error_response = {
            "status": "error",
            "error": f"Error processing invoice from file: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return error_response, None


@app.post("/api/v3/process-management/process-invoice", response_model=InvoiceProcessingResponse)
async def process_invoice_endpoint(
    file: UploadFile = File(..., description="Invoice PDF file to process"),
    processing_method: str = Form("image", description="Processing method: 'image' or 'text'"),
    processing_level: str = Form("invoice", description="Processing level: 'invoice' or 'page'"),
    processing_max_pages: int = Form(2, description="Maximum pages per batch"),
    pages: str = Form("all", description="Pages to process: 'all', 'first', or specific pages"),
    transaction_id: Optional[str] = Form(None, description="Optional transaction ID"),
    development: Optional[bool] = Form(None, description="Flag to indicate whether the incoming transaction is for testing or production purposes"),
):
    """
    Process an uploaded invoice file using the invoice extraction agent.
    Returns status and invoice header UUID.
    """

    print(f"DEBUG: Endpoint called with file: {file.filename}")
    print(f"DEBUG: Processing method: {processing_method}")
    print(f"DEBUG: Development mode: {development}")
    
    # Generate transaction ID if not provided
    if not transaction_id:
        transaction_id = str(uuid.uuid4())
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported"
            )
        
        # Validate processing parameters
        if processing_method not in ["image", "text"]:
            raise HTTPException(
                status_code=400,
                detail="processing_method must be 'image' or 'text'"
            )
        
        if processing_level not in ["invoice", "page"]:
            raise HTTPException(
                status_code=400,
                detail="processing_level must be 'invoice' or 'page'"
            )
        
        # Log the incoming request
        logger.info(f"Processing invoice: {file.filename}")
        logger.info(f"Transaction ID: {transaction_id}")
        logger.info(f"Processing method: {processing_method}")
        logger.info(f"Processing scenario development: {development}")
        
        # Read file content
        file_data = await file.read()
        file_size = len(file_data)
        
        logger.info(f"File size: {file_size} bytes")

        # Validate file size (e.g., max 50MB)
        max_file_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {max_file_size / (1024*1024):.1f}MB"
            )

        # Determine if the file is JSON with base64 content or raw PDF
        pdf_data = None
        
        try:
            # Try to parse as JSON first (for base64 encoded files)
            try:
                file_json = json.loads(file_data.decode('utf-8'))
                content_bytes = file_json.get("ContentBytes")
                if content_bytes:
                    # Decode the base64 content
                    pdf_data = base64.b64decode(content_bytes)
                    logger.info("File processed as JSON with base64 content")
                else:
                    raise ValueError("No ContentBytes found in JSON")
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
                # If JSON parsing fails, treat as raw PDF file
                pdf_data = file_data
                logger.info("File processed as raw PDF content")
                
        except Exception as e:
            logger.error(f"Error processing file content: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. Expected PDF file or JSON with base64 content."
            )
        
        # Create a unique filename
        file_id = str(uuid.uuid4())
        file_extension = ".pdf"
        unique_filename = f"{file_id}{file_extension}"
        
        # Save the PDF file to the upload directory
        invoice_store_dir = "invoice_store"
        os.makedirs(invoice_store_dir, exist_ok=True)
        file_path = os.path.join(invoice_store_dir, unique_filename)
        
        with open(file_path, "wb") as f:
            f.write(pdf_data)
        
        logger.info(f"File saved to {file_path}")
        
        # Create the invoice processing request
        invoice_request = {
            "file_name": unique_filename,
            "processing_method": processing_method,
            "processing_level": processing_level,
            "processing_max_pages": processing_max_pages,
            "pages": pages,
            "timestamp": timestamp,
            "transaction_id": transaction_id,
            "development": development  # Pass development flag
        }
        
        # Process the invoice using simplified approach
        logger.info("Invoking invoice extraction agent...")
        result, _ = process_invoice_from_file(invoice_request)
        
        logger.info(f"Agent processing completed with status: {result.get('status')}")
        
        # Prepare response
        response_data = {
            "status": result.get("status", "error"),
            "transaction_id": transaction_id,
            "timestamp": timestamp
        }
        
        # Handle development vs production responses
        if development and result.get('status') == 'success':
            # Transform to target format for development
            target_format = transform_json_to_target_format(result)
            development_response = create_development_response(target_format, transaction_id, timestamp)
            
            return JSONResponse(
                status_code=200,
                content=development_response
            )
        else:
            # Production response
            if result.get('status') == 'success':
                if result.get("invoice_header_id"):
                    response_data["invoice_header_id"] = result["invoice_header_id"]
                    response_data["extracted_data"] = result
            else:
                response_data["error"] = result.get("error", "Unknown processing error")
        
        return JSONResponse(
            status_code=200 if response_data["status"] == "success" else 400,
            content=response_data
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing invoice: {str(e)}", exc_info=True)
        
        error_response = {
            "status": "error",
            "transaction_id": transaction_id,
            "error": f"Unexpected error: {str(e)}",
            "timestamp": timestamp
        }
        
        return JSONResponse(
            status_code=500,
            content=error_response
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Invoice Extraction API",
        "version": "1.0.0",
        "description": "API for processing invoice files using AI extraction",
        "endpoints": {
            "POST /process-invoice": "Process an uploaded invoice file",
            "GET /health": "Health check endpoint",
            "GET /": "API information"
        }
    }

@app.get("/test-import")
async def test_import():
    """Test if imports work in Docker"""
    print("=== TESTING IMPORTS ===")
    import sys
    sys.stdout.flush()
    
    try:
        print("Testing process_invoice_from_file import...")
        sys.stdout.flush()
        # This might be where it hangs
        from main import process_invoice_from_file
        print("Import successful!")
        sys.stdout.flush()
        return {"status": "success", "message": "Imports work"}
    except Exception as e:
        print(f"Import failed: {e}")
        sys.stdout.flush()
        return {"status": "error", "message": str(e)}
    
@app.post("/test-file-upload")
async def test_file_upload(file: UploadFile = File(...)):
    """Test just the file upload part"""
    print("=== FILE UPLOAD TEST STARTED ===")
    import sys
    sys.stdout.flush()
    
    print(f"File received: {file.filename}")
    print(f"Content type: {file.content_type}")
    sys.stdout.flush()
    
    try:
        print("About to read file...")
        sys.stdout.flush()
        
        # This is probably where it hangs
        content = await file.read()
        
        print(f"File read successfully: {len(content)} bytes")
        sys.stdout.flush()
        
        return {
            "status": "success", 
            "filename": file.filename,
            "size": len(content)
        }
        
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.stdout.flush()
        return {"status": "error", "error": str(e)}

@app.post("/process-invoice-minimal")
async def process_invoice_minimal(
    file: UploadFile = File(...),
    development: Optional[bool] = Form(False)
):
    """Minimal version to isolate the issue"""
    print("=== MINIMAL ENDPOINT STARTED ===")
    import sys
    sys.stdout.flush()
    
    print(f"File: {file.filename}")
    print(f"Development: {development}")
    sys.stdout.flush()
    
    try:
        print("Reading file...")
        sys.stdout.flush()
        
        file_content = await file.read()
        
        print(f"File read: {len(file_content)} bytes")
        sys.stdout.flush()
        
        # Skip all the heavy processing for now
        return {
            "status": "success",
            "message": "File upload works",
            "filename": file.filename,
            "size": len(file_content)
        }
        
    except Exception as e:
        print(f"Error: {e}")
        sys.stdout.flush()
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)