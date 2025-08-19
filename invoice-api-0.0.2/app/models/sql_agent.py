from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import date

# Models for the API
class SQLAgentRequest(BaseModel):
    question: str = Field(..., description="The natural language question to query the database")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")

class SQLQueryResult(BaseModel):
    query: str = Field(..., description="The SQL query that was executed")
    successful: bool = Field(..., description="Whether the query was successful")
    
class SQLAgentResponse(BaseModel):
    question: str = Field(..., description="The original question")
    answer: str = Field(..., description="The answer to the question")
    sql_queries: List[str] = Field(..., description="The SQL queries that were executed")
    session_id: str = Field(..., description="Session ID for conversation continuity")