# app/routers/invoice.py - Clean API endpoints only
from fastapi import APIRouter, HTTPException, Request, Body, Path, Depends
from ..models.invoice import (
    InvoiceSearchResults, InvoiceSearchResponse, 
    InvoiceFilters, Pagination, Sort, PaginationResponse,
    FilterOptions, FilterOptionsResponse,
    InvoiceSearchRequest, InvoiceSearchResultsResponse,
    InvoiceDetailResponse
)
from ..services.invoice_service import InvoiceService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from typing import Dict
import json
from pathlib import Path as FilePath

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["invoices"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get invoice service
def get_invoice_service():
    return InvoiceService()

# Dependency to load search defaults (only for backward compatibility)
async def get_search_defaults():
    """Load search defaults from JSON file"""
    data_dir = FilePath(__file__).parent.parent / "data"
    file_path = data_dir / "search_defaults.json"
    
    try:
        with open(file_path, "r") as file:
            return json.load(file)
    except FileNotFoundError:
        log_event("file_error", "search_defaults.json not found", level="error")
        raise HTTPException(status_code=500, detail="Search defaults configuration not found")
    except json.JSONDecodeError:
        log_event("file_error", "Error parsing search_defaults.json", level="error")
        raise HTTPException(status_code=500, detail="Error parsing search defaults configuration")

@router.get("/filters", response_model=FilterOptionsResponse)
@log_function_call
async def get_filters(
    request: Request, 
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get available filter options for the invoice search page from database"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    log_event("filters_requested", "Filter options requested", {
        "request_id": request_id,
        "client_ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown")
    })
    
    try:
        filter_data = await invoice_service.get_filter_options()
        filter_options = FilterOptions(**filter_data)
        return FilterOptionsResponse(filters=filter_options)
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error getting filter options: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting filter options: {str(e)}")

@router.get("/search", response_model=InvoiceSearchResults)
@log_function_call
async def search_invoices(
    request: Request,
    defaults: Dict = Depends(get_search_defaults)
):
    """Get initial search configuration with default filters"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing initial search config request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Get default values from the JSON configuration
        default_results = defaults.get("results", {})
        default_filters = default_results.get("filters", {})
        default_pagination = default_results.get("pagination", {})
        default_sort = default_results.get("sort", {})
        
        # Create search response from default values
        search_response = InvoiceSearchResponse(
            filters=InvoiceFilters(**default_filters),
            pagination=Pagination(**default_pagination),
            sort=Sort(**default_sort)
        )
        
        log_event("search_config", "Initial search configuration retrieved", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown"
        })
        
        return InvoiceSearchResults(results=search_response)
    
    except Exception as e:
        logger.error(f"{Colors.RED}Error loading search configuration | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error loading search configuration: {str(e)}")

@router.post("/search-invoices", response_model=InvoiceSearchResultsResponse)
@log_function_call
async def search_invoices_post(
    request: Request,
    search_request: InvoiceSearchRequest = Body(...),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Search invoices based on filtering criteria and return invoice data from database"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing invoice search request | Request ID: {request_id}{Colors.RESET}")
    
    # Extract search parameters
    filters = search_request.filters
    pagination = search_request.pagination
    sort = search_request.sort
    
    # Log search parameters
    log_event("invoice_search", "Invoice search performed", {
        "request_id": request_id,
        "client_ip": request.client.host if request.client else "unknown",
        "filters": filters.dict(),
        "pagination": pagination.dict(),
        "sort": sort.dict()
    })
    
    try:
        # Search invoices using service
        invoice_results, total_count, total_pages = await invoice_service.search_invoices(
            filters=filters,
            page=pagination.page,
            page_size=pagination.pageSize,
            sort=sort
        )
        
        # Create pagination response
        pagination_response = PaginationResponse(
            page=pagination.page,
            pageSize=pagination.pageSize,
            totalPages=total_pages
        )
        
        logger.info(f"{Colors.GREEN}Invoice search successful | Request ID: {request_id} | Found: {total_count} invoices{Colors.RESET}")
        
        return InvoiceSearchResultsResponse(
            results=invoice_results,
            totalCount=total_count,
            filters=filters,
            pagination=pagination_response,
            sort=sort
        )
        
    except Exception as e:
        logger.error(f"{Colors.RED}Invoice search failed | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing invoice search: {str(e)}")

@router.get("/invoices/{invoice_number}", response_model=InvoiceDetailResponse)
@log_function_call
async def get_invoice_detail(
    request: Request,
    invoice_number: str = Path(..., description="Invoice number to retrieve", example="INV-123"),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get detailed information for a specific invoice by invoice number from database"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Retrieving invoice details | Invoice: {invoice_number} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        invoice_detail = await invoice_service.get_invoice_detail(invoice_number)
        
        logger.info(f"{Colors.GREEN}Invoice details retrieved successfully | Invoice: {invoice_number} | Request ID: {request_id}{Colors.RESET}")
        
        return invoice_detail
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving invoice details | Invoice: {invoice_number} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving invoice details: {str(e)}")
    
# Updated invoice router endpoint - add this to your app/routers/invoice.py

@router.get("/invoices/{invoice_number}/ids/{invoice_id}", response_model=InvoiceDetailResponse)
@log_function_call
async def get_invoice_detail_by_id(
    request: Request,
    invoice_number: str = Path(..., description="Invoice number to retrieve", example="INV-123"),
    invoice_id: str = Path(..., description="Invoice ID to retrieve", example="2958d15a-5ad0-400a-b9bc-8bd359e7617f"),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get detailed information for a specific invoice by invoice number and ID from database"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Retrieving invoice details | Invoice: {invoice_number} | ID: {invoice_id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        invoice_detail = await invoice_service.get_invoice_detail(invoice_number, invoice_id)
        
        logger.info(f"{Colors.GREEN}Invoice details retrieved successfully | Invoice: {invoice_number} | ID: {invoice_id} | Request ID: {request_id}{Colors.RESET}")
        
        return invoice_detail
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving invoice details | Invoice: {invoice_number} | ID: {invoice_id} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving invoice details: {str(e)}")

# Keep the old endpoint for backward compatibility
@router.get("/invoices/{invoice_number}", response_model=InvoiceDetailResponse)
@log_function_call
async def get_invoice_detail(
    request: Request,
    invoice_number: str = Path(..., description="Invoice number to retrieve", example="INV-123"),
    invoice_service: InvoiceService = Depends(get_invoice_service)
):
    """Get detailed information for a specific invoice by invoice number from database (backward compatibility)"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Retrieving invoice details (legacy) | Invoice: {invoice_number} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # For backward compatibility, we'll get the first matching invoice by number
        # This uses the old method signature but calls the new service method with empty ID
        conn = await invoice_service.get_connection()
        try:
            cursor = conn.cursor()
            # Get the first ID for this invoice number
            id_query = "SELECT TOP 1 id FROM invoice_headers WHERE invoice_number = ?"
            cursor.execute(id_query, [invoice_number])
            id_row = cursor.fetchone()
            
            if not id_row:
                raise HTTPException(status_code=404, detail=f"Invoice {invoice_number} not found")
            
            invoice_id = str(id_row[0])
            
        finally:
            cursor.close()
            conn.close()
        
        invoice_detail = await invoice_service.get_invoice_detail(invoice_number, invoice_id)
        
        logger.info(f"{Colors.GREEN}Invoice details retrieved successfully (legacy) | Invoice: {invoice_number} | Request ID: {request_id}{Colors.RESET}")
        
        return invoice_detail
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving invoice details (legacy) | Invoice: {invoice_number} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving invoice details: {str(e)}")