# app/routers/agent_logs.py - Simplified Agent Logs API
from fastapi import APIRouter, HTTPException, Request, Path, Depends
from ..models.agent_logs import AgentLogsResponse
from ..services.agent_logs_service import AgentLogsService
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/agent-logs",
    tags=["agent-logs"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get agent logs service
def get_agent_logs_service():
    return AgentLogsService()

@router.get("/transactions/{transaction_id}", response_model=AgentLogsResponse)
@log_function_call
async def get_logs_by_transaction_id(
    request: Request,
    transaction_id: str = Path(..., description="Transaction ID to retrieve logs for", example="TXN-12345"),
    agent_logs_service: AgentLogsService = Depends(get_agent_logs_service)
):
    """
    Get all log entries for a specific transaction ID
    
    Returns simple log entries with just transactionId and log content.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get logs request | Transaction ID: {transaction_id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        logs_response = await agent_logs_service.get_logs_by_transaction_id(transaction_id)
        
        logger.info(f"{Colors.GREEN}Agent logs retrieved successfully | Transaction ID: {transaction_id} | Request ID: {request_id} | Count: {len(logs_response.logs)}{Colors.RESET}")
        
        return logs_response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving agent logs | Transaction ID: {transaction_id} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving agent logs: {str(e)}")