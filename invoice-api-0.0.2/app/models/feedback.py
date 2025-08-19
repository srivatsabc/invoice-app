# app/models/feedback.py
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class BrandFeedback(BaseModel):
    id: int = Field(..., description="Unique identifier")
    regionCode: str = Field(..., description="Region code")
    countryCode: str = Field(..., description="Country code")
    brandName: str = Field(..., description="Brand name")
    feedback: Optional[str] = Field(None, description="Feedback content")
    rating: Optional[int] = Field(None, description="Rating (1-5 scale)")
    category: Optional[str] = Field(None, description="Feedback category")
    notes: Optional[str] = Field(None, description="Additional notes")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")
    createdBy: Optional[str] = Field(None, description="Created by user")
    updatedBy: Optional[str] = Field(None, description="Updated by user")


class BrandFeedbackRequest(BaseModel):
    feedback: Optional[str] = Field(None, description="Feedback content")
    region: Optional[str] = Field(None, description="Region code from payload")
    country: Optional[str] = Field(None, description="Country code from payload") 
    brand: Optional[str] = Field(None, description="Brand name from payload")
    timestamp: Optional[str] = Field(None, description="Timestamp from client")
    updatedBy: Optional[str] = Field(None, description="User submitting the feedback")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating (1-5 scale)")
    category: Optional[str] = Field(None, description="Feedback category (e.g., 'quality', 'service', 'accuracy')")
    notes: Optional[str] = Field(None, description="Additional notes")


class BrandFeedbackResponse(BaseModel):
    regionCode: str = Field(..., description="Region code")
    countryCode: str = Field(..., description="Country code") 
    brandName: str = Field(..., description="Brand name")
    feedback: Optional[str] = Field(None, description="Feedback content")
    rating: Optional[int] = Field(None, description="Rating (1-5 scale)")
    category: Optional[str] = Field(None, description="Feedback category")
    notes: Optional[str] = Field(None, description="Additional notes")
    hasActiveFeedback: bool = Field(..., description="Whether there is active feedback for this brand")
    lastUpdated: Optional[str] = Field(None, description="Last update timestamp")
    updatedBy: Optional[str] = Field(None, description="Last updated by user")