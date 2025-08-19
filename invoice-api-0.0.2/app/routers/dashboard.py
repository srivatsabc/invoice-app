# app/routers/dashboard.py - Clean API endpoints only
from fastapi import APIRouter, HTTPException, Query, Depends, Request, Body
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field
from ..models.dashboard import DashboardResponse
from ..services.dashboard_service import DashboardService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors

# Define a filter request model for dashboard filtering
class DashboardFilterRequest(BaseModel):
    from_date: Optional[date] = Field(None, description="Start date for filtering")
    to_date: Optional[date] = Field(None, description="End date for filtering")
    region: Optional[str] = Field(None, description="Region filter")
    country: Optional[str] = Field(None, description="Country filter")
    vendor: Optional[str] = Field(None, description="Vendor filter")

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get dashboard service
def get_dashboard_service():
    return DashboardService()

@router.get("/dashboard", response_model=DashboardResponse)
@log_function_call
async def get_dashboard(
    request: Request, 
    region: Optional[str] = None,
    country: Optional[str] = None,
    vendor: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """
    Get dashboard data including statistics, trends, and top field values from database
    
    Optionally filter the dashboard data by region, country, vendor, and date range.
    If no filters are provided, returns the overall dashboard.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"{Colors.BLUE}Processing dashboard request | Request ID: {request_id} | Client: {client_ip}{Colors.RESET}")
    
    try:
        # Log filters if any were applied
        filters = {}
        if region:
            filters["region"] = region
        if country:
            filters["country"] = country
        if vendor:
            filters["vendor"] = vendor
        if from_date:
            filters["from_date"] = from_date.isoformat()
        if to_date:
            filters["to_date"] = to_date.isoformat()
            
        if filters:
            log_event(
                "dashboard_filtered", 
                "Dashboard data filtered",
                details={
                    "request_id": request_id,
                    "client_ip": client_ip,
                    "filters": filters
                }
            )
        
        # Get dashboard data from service
        dashboard_data = await dashboard_service.get_dashboard_data(
            from_date=from_date,
            to_date=to_date,
            region=region,
            country=country,
            vendor=vendor
        )
        
        # Log success
        logger.info(f"{Colors.GREEN}Dashboard data retrieved successfully | Request ID: {request_id}{Colors.RESET}")
        
        # Return the dashboard data - will be validated against DashboardResponse model
        return dashboard_data
        
    except Exception as e:
        # Log error
        logger.error(f"{Colors.RED}Error retrieving dashboard data | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard data: {str(e)}")

@router.post("/dashboard/filter", response_model=DashboardResponse)
@log_function_call
async def filter_dashboard(
    request: Request,
    filter_request: DashboardFilterRequest = Body(...),
    dashboard_service: DashboardService = Depends(get_dashboard_service)
):
    """
    Filter dashboard data based on provided criteria
    
    This endpoint accepts a flexible set of filter criteria and returns dashboard data
    that matches the specified filters. As new filter types are added to the 
    DashboardFilterRequest model, they will automatically be supported by this endpoint.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    client_ip = request.client.host if request.client else "unknown"
    
    # Extract filters for logging
    filter_dict = filter_request.dict(exclude_none=True)
    # Convert dates to strings for logging
    for key, value in filter_dict.items():
        if isinstance(value, date):
            filter_dict[key] = value.isoformat()
            
    filter_str = ", ".join([f"{k}={v}" for k, v in filter_dict.items()])
    logger.info(f"{Colors.BLUE}Processing filtered dashboard request | Filters: {filter_str} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Get filtered dashboard data from service
        dashboard_data = await dashboard_service.get_dashboard_data(
            from_date=filter_request.from_date,
            to_date=filter_request.to_date,
            region=filter_request.region,
            country=filter_request.country,
            vendor=filter_request.vendor
        )
        
        # Log the filtering results
        log_event(
            "dashboard_filtered", 
            f"Dashboard filtered with {len(filter_dict)} criteria",
            details={
                "request_id": request_id,
                "client_ip": client_ip,
                "filters": filter_dict
            }
        )
        
        # Log success
        logger.info(f"{Colors.GREEN}Filtered dashboard data generated successfully | Request ID: {request_id}{Colors.RESET}")
        
        # Return the filtered dashboard data
        return dashboard_data
    
    except Exception as e:
        # Log error
        logger.error(f"{Colors.RED}Error generating filtered dashboard | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating filtered dashboard: {str(e)}")