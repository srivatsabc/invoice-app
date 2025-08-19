# app/routers/agent_control.py - Agent Control Center API endpoints
from fastapi import APIRouter, HTTPException, Request, Path, Body, Depends
from ..models.agent_control import (
    AgentControlEntry, CreateAgentControlRequest, UpdateAgentControlRequest, 
    AgentControlListResponse
)
from ..services.agent_control_service import AgentControlService
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/agent-control",
    tags=["agent-control"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get agent control service
def get_agent_control_service():
    return AgentControlService()

@router.get("/controls", response_model=AgentControlListResponse)
@log_function_call
async def get_all_controls(
    request: Request,
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Get all control entries from the agent control center
    
    Returns all control configurations ordered by control name.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all controls request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        controls_response = await agent_control_service.get_all_controls()
        
        logger.info(f"{Colors.GREEN}All controls retrieved successfully | Request ID: {request_id} | Count: {controls_response.totalCount}{Colors.RESET}")
        
        return controls_response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving all controls | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving controls: {str(e)}")

@router.get("/controls/{control_name}", response_model=AgentControlEntry)
@log_function_call
async def get_control_by_name(
    request: Request,
    control_name: str = Path(..., description="Control name to retrieve", example="logging"),
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Get a specific control entry by control name
    
    Returns the control configuration for the specified control name.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get control request | Control: {control_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        control_entry = await agent_control_service.get_control_by_name(control_name)
        
        if not control_entry:
            raise HTTPException(status_code=404, detail=f"Control '{control_name}' not found")
        
        logger.info(f"{Colors.GREEN}Control retrieved successfully | Control: {control_name} | Request ID: {request_id}{Colors.RESET}")
        
        return control_entry
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving control | Control: {control_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving control: {str(e)}")

@router.post("/controls", response_model=AgentControlEntry)
@log_function_call
async def create_control(
    request: Request,
    control_request: CreateAgentControlRequest = Body(...),
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Create a new control entry in the agent control center
    
    Creates a new control configuration. The control name must be unique.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing create control request | Control: {control_request.control} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        created_control = await agent_control_service.create_control(control_request)
        
        logger.info(f"{Colors.GREEN}Control created successfully | Control: {control_request.control} | Request ID: {request_id} | ID: {created_control.id} | Value: {control_request.value}{Colors.RESET}")
        
        return created_control
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 409 for conflict)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error creating control | Control: {control_request.control} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating control: {str(e)}")

@router.put("/controls/{control_name}", response_model=AgentControlEntry)
@log_function_call
async def update_control(
    request: Request,
    control_name: str = Path(..., description="Control name to update", example="logging"),
    update_request: UpdateAgentControlRequest = Body(...),
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Update an existing control entry
    
    Updates the specified control configuration. Only provided fields will be updated.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing update control request | Control: {control_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        updated_control = await agent_control_service.update_control(control_name, update_request)
        
        logger.info(f"{Colors.GREEN}Control updated successfully | Control: {control_name} | Request ID: {request_id} | UpdatedBy: {update_request.updatedBy}{Colors.RESET}")
        
        return updated_control
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error updating control | Control: {control_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating control: {str(e)}")

@router.delete("/controls/{control_name}")
@log_function_call
async def delete_control(
    request: Request,
    control_name: str = Path(..., description="Control name to delete", example="logging"),
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Delete a control entry from the agent control center
    
    Permanently removes the specified control configuration.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing delete control request | Control: {control_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        success = await agent_control_service.delete_control(control_name)
        
        if success:
            logger.info(f"{Colors.GREEN}Control deleted successfully | Control: {control_name} | Request ID: {request_id}{Colors.RESET}")
            return {"message": f"Control '{control_name}' deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete control")
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error deleting control | Control: {control_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting control: {str(e)}")
    
# Add this endpoint to app/routers/agent_control.py

@router.delete("/invoice_processing")
@log_function_call
async def delete_invoice_processing_control(
    request: Request,
    agent_control_service: AgentControlService = Depends(get_agent_control_service)
):
    """
    Delete the invoice_processing control entry from the agent control center
    
    This is a convenience endpoint specifically for deleting the invoice_processing control.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    control_name = "invoice_processing"
    
    logger.info(f"{Colors.BLUE}Processing delete invoice_processing control request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        success = await agent_control_service.delete_control(control_name)
        
        if success:
            logger.info(f"{Colors.GREEN}Invoice processing control deleted successfully | Request ID: {request_id}{Colors.RESET}")
            return {"message": f"Control '{control_name}' deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete invoice processing control")
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error deleting invoice processing control | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting invoice processing control: {str(e)}")