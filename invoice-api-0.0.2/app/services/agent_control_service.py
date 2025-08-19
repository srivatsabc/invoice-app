# app/services/agent_control_service.py
import pyodbc
import os
from typing import List, Optional
from datetime import datetime
from ..models.agent_control import (
    AgentControlEntry, CreateAgentControlRequest, UpdateAgentControlRequest, 
    AgentControlListResponse
)
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class AgentControlService:
    """Service class for handling agent control center database operations"""
    
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
    
    def format_agent_control_entry(self, row) -> AgentControlEntry:
        """Format database row into AgentControlEntry"""
        return AgentControlEntry(
            id=row[0],
            control=row[1] or "",
            isActive=bool(row[2]) if row[2] is not None else True,
            value=row[3] or "",
            createdAt=row[4] if row[4] else datetime.now(),
            updatedAt=row[5] if row[5] else datetime.now(),
            createdBy=row[6],
            updatedBy=row[7]
        )
    
    @log_function_call
    async def get_all_controls(self) -> AgentControlListResponse:
        """Get all control entries"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id, control, is_active, value, created_at, updated_at, created_by, updated_by
                FROM agent_control_center 
                ORDER BY control ASC, id ASC
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            # Format results
            control_entries = []
            for row in rows:
                control_entry = self.format_agent_control_entry(row)
                control_entries.append(control_entry)
            
            response = AgentControlListResponse(
                controls=control_entries,
                totalCount=len(control_entries)
            )
            
            logger.info(f"{Colors.GREEN}Retrieved {len(control_entries)} control entries{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_control_by_name(self, control_name: str) -> Optional[AgentControlEntry]:
        """Get a specific control entry by control name"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id, control, is_active, value, created_at, updated_at, created_by, updated_by
                FROM agent_control_center 
                WHERE control = ?
            """
            
            cursor.execute(query, [control_name])
            row = cursor.fetchone()
            
            if not row:
                return None
            
            control_entry = self.format_agent_control_entry(row)
            logger.info(f"{Colors.GREEN}Retrieved control entry for '{control_name}'{Colors.RESET}")
            return control_entry
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def create_control(self, request: CreateAgentControlRequest) -> AgentControlEntry:
        """Create a new control entry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if control already exists
            existing_control = await self.get_control_by_name(request.control)
            if existing_control:
                raise HTTPException(status_code=409, detail=f"Control '{request.control}' already exists")
            
            # Insert new control
            insert_query = """
                INSERT INTO agent_control_center (
                    control, is_active, value, created_by, updated_by
                ) 
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?)
            """
            
            cursor.execute(insert_query, [
                request.control,
                request.isActive,
                request.value,
                request.createdBy,
                request.createdBy  # updatedBy = createdBy for new entries
            ])
            
            new_id = cursor.fetchone()[0]
            conn.commit()
            
            # Retrieve and return the created control
            created_control = await self.get_control_by_id(new_id)
            if not created_control:
                raise HTTPException(status_code=500, detail="Failed to retrieve created control")
            
            logger.info(f"{Colors.GREEN}Created new control '{request.control}' with ID {new_id}{Colors.RESET}")
            return created_control
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error creating control: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error creating control: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_control_by_id(self, control_id: int) -> Optional[AgentControlEntry]:
        """Get a specific control entry by ID"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id, control, is_active, value, created_at, updated_at, created_by, updated_by
                FROM agent_control_center 
                WHERE id = ?
            """
            
            cursor.execute(query, [control_id])
            row = cursor.fetchone()
            
            if not row:
                return None
            
            control_entry = self.format_agent_control_entry(row)
            return control_entry
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def update_control(self, control_name: str, request: UpdateAgentControlRequest) -> AgentControlEntry:
        """Update an existing control entry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if control exists
            existing_control = await self.get_control_by_name(control_name)
            if not existing_control:
                raise HTTPException(status_code=404, detail=f"Control '{control_name}' not found")
            
            # Build dynamic update query
            set_clauses = []
            params = []
            
            if request.isActive is not None:
                set_clauses.append("is_active = ?")
                params.append(request.isActive)
            
            if request.value is not None:
                set_clauses.append("value = ?")
                params.append(request.value)
            
            if request.updatedBy is not None:
                set_clauses.append("updated_by = ?")
                params.append(request.updatedBy)
            
            # Always update the timestamp
            set_clauses.append("updated_at = GETDATE()")
            
            if not set_clauses:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            # Add the control name parameter for WHERE clause
            params.append(control_name)
            
            update_query = f"""
                UPDATE agent_control_center 
                SET {', '.join(set_clauses)}
                WHERE control = ?
            """
            
            cursor.execute(update_query, params)
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Control '{control_name}' not found")
            
            conn.commit()
            
            # Retrieve and return the updated control
            updated_control = await self.get_control_by_name(control_name)
            if not updated_control:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated control")
            
            logger.info(f"{Colors.GREEN}Updated control '{control_name}'{Colors.RESET}")
            return updated_control
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error updating control: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error updating control: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def delete_control(self, control_name: str) -> bool:
        """Delete a control entry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if control exists
            existing_control = await self.get_control_by_name(control_name)
            if not existing_control:
                raise HTTPException(status_code=404, detail=f"Control '{control_name}' not found")
            
            delete_query = "DELETE FROM agent_control_center WHERE control = ?"
            cursor.execute(delete_query, [control_name])
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Control '{control_name}' not found")
            
            conn.commit()
            logger.info(f"{Colors.GREEN}Deleted control '{control_name}'{Colors.RESET}")
            return True
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error deleting control: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error deleting control: {str(e)}")
        finally:
            cursor.close()
            conn.close()