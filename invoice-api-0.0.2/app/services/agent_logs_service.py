# app/services/agent_logs_service.py
import pyodbc
import os
from typing import List
from ..models.agent_logs import AgentLogEntry, AgentLogsResponse
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class AgentLogsService:
    """Service class for handling agent control center logs database operations"""
    
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
    
    @log_function_call
    async def get_logs_by_transaction_id(self, transaction_id: str) -> AgentLogsResponse:
        """Get all log entries for a specific transaction ID"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    transaction_id, log
                FROM agent_control_center_logs 
                WHERE transaction_id = ?
                ORDER BY created_at ASC, id ASC
            """
            
            cursor.execute(query, [transaction_id])
            rows = cursor.fetchall()
            
            # Format results
            log_entries = []
            for row in rows:
                log_entries.append(AgentLogEntry(
                    transactionId=row[0] or "",
                    log=row[1] or ""
                ))
            
            response = AgentLogsResponse(logs=log_entries)
            
            logger.info(f"{Colors.GREEN}Retrieved {len(log_entries)} log entries for transaction ID '{transaction_id}'{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()