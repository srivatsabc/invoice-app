# app/models/agent_logs.py
from typing import List
from pydantic import BaseModel, Field


class AgentLogEntry(BaseModel):
    transactionId: str = Field(..., description="Transaction ID")
    log: str = Field(..., description="Log content")


class AgentLogsResponse(BaseModel):
    logs: List[AgentLogEntry] = Field(..., description="List of log entries")