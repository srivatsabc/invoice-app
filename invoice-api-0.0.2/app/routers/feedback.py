# app/routers/feedback.py - Brand Feedback API endpoints
from fastapi import APIRouter, HTTPException, Request, Path, Body, Depends
from ..models.feedback import BrandFeedbackRequest, BrandFeedbackResponse
from ..services.feedback_service import FeedbackService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["brand-feedback"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get feedback service
def get_feedback_service():
    return FeedbackService()

@router.get("/regions/{region_code}/countries/{country_code}/brands/{brand_name}/feedback", 
           response_model=BrandFeedbackResponse)
@log_function_call
async def get_brand_feedback(
    request: Request,
    region_code: str = Path(..., description="Region code", example="EMEA"),
    country_code: str = Path(..., description="Country code", example="DE"),
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """
    Get feedback for a specific region/country/brand combination
    
    Returns the current feedback for the specified brand in the given region and country.
    If no feedback exists, returns an empty feedback response with hasActiveFeedback=false.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get brand feedback request | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        feedback_response = await feedback_service.get_brand_feedback(region_code, country_code, brand_name)
        
        log_event("brand_feedback_retrieved", f"Retrieved feedback for {region_code}/{country_code}/{brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "region_code": region_code,
            "country_code": country_code,
            "brand_name": brand_name,
            "has_feedback": feedback_response.hasActiveFeedback,
            "rating": feedback_response.rating,
            "category": feedback_response.category
        })
        
        status_msg = "with active feedback" if feedback_response.hasActiveFeedback else "without feedback"
        logger.info(f"{Colors.GREEN}Brand feedback retrieved successfully ({status_msg}) | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
        
        return feedback_response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving brand feedback | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving brand feedback: {str(e)}")

@router.post("/regions/{region_code}/countries/{country_code}/brands/{brand_name}/feedback", 
            response_model=BrandFeedbackResponse)
@log_function_call
async def create_or_update_brand_feedback(
    request: Request,
    region_code: str = Path(..., description="Region code", example="EMEA"),
    country_code: str = Path(..., description="Country code", example="DE"),
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    feedback_request: BrandFeedbackRequest = Body(...),
    feedback_service: FeedbackService = Depends(get_feedback_service)
):
    """
    Create new feedback or update existing feedback for a region/country/brand combination
    
    This endpoint creates new feedback if none exists, or overwrites existing feedback
    for the specified brand in the given region and country.
    
    The feedback includes:
    - feedback: Text content of the feedback
    - rating: Numeric rating (1-5 scale)
    - category: Category of feedback (e.g., 'quality', 'service', 'accuracy')
    - notes: Additional notes or comments
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing create/update brand feedback request | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        feedback_response = await feedback_service.create_or_update_brand_feedback(
            region_code, country_code, brand_name, feedback_request
        )
        
        log_event("brand_feedback_submitted", f"Submitted feedback for {region_code}/{country_code}/{brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "region_code": region_code,
            "country_code": country_code,
            "brand_name": brand_name,
            "rating": feedback_request.rating,
            "category": feedback_request.category,
            "updated_by": feedback_request.updatedBy,  # Changed from submittedBy
            "payload_region": feedback_request.region,
            "payload_country": feedback_request.country,
            "payload_brand": feedback_request.brand,
            "client_timestamp": feedback_request.timestamp,
            "has_feedback_content": bool(feedback_request.feedback),
            "has_notes": bool(feedback_request.notes)
        })
        
        logger.info(f"{Colors.GREEN}Brand feedback submitted successfully | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | UpdatedBy: {feedback_request.updatedBy} | Feedback: '{feedback_request.feedback}'{Colors.RESET}")
        
        return feedback_response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error submitting brand feedback | Region: {region_code} | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error submitting brand feedback: {str(e)}")