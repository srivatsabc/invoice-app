# app/models/agent_control.py
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AgentControlEntry(BaseModel):
    id: int = Field(..., description="Unique identifier")
    control: str = Field(..., description="Control name")
    isActive: bool = Field(..., description="Whether the control is active")
    value: str = Field(..., description="Control value")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")
    createdBy: Optional[str] = Field(None, description="Created by user")
    updatedBy: Optional[str] = Field(None, description="Updated by user")


class CreateAgentControlRequest(BaseModel):
    control: str = Field(..., description="Control name", max_length=255)
    isActive: bool = Field(True, description="Whether the control is active")
    value: str = Field(..., description="Control value", max_length=500)
    createdBy: Optional[str] = Field(None, description="User creating the control")


class UpdateAgentControlRequest(BaseModel):
    isActive: Optional[bool] = Field(None, description="Whether the control is active")
    value: Optional[str] = Field(None, description="Control value", max_length=500)
    updatedBy: Optional[str] = Field(None, description="User updating the control")


class AgentControlListResponse(BaseModel):
    controls: List[AgentControlEntry] = Field(..., description="List of control entries")
    totalCount: int = Field(..., description="Total number of control entries")