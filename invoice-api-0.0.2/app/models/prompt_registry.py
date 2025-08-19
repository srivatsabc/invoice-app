# app/models/prompt_registry.py
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class PromptRegistryItem(BaseModel):
    id: int = Field(..., description="Unique identifier")
    brandName: str = Field(..., description="Brand name")
    processingMethod: str = Field(..., description="Processing method: text, image, or both")
    regionCode: str = Field(..., description="Region code")
    regionName: str = Field(..., description="Region name")
    countryCode: str = Field(..., description="Country code")
    countryName: str = Field(..., description="Country name")
    schemaJson: Optional[str] = Field(None, description="JSON schema as string")
    prompt: Optional[str] = Field(None, description="Extraction prompt/instructions")
    specialInstructions: Optional[str] = Field(None, description="Additional processing instructions")
    feedback: Optional[str] = Field(None, description="Performance feedback and notes")
    isActive: bool = Field(..., description="Whether the configuration is active")
    version: int = Field(..., description="Version number")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")
    createdBy: Optional[str] = Field(None, description="Created by user")
    updatedBy: Optional[str] = Field(None, description="Updated by user")


class PromptRegistryListResponse(BaseModel):
    brandName: str = Field(..., description="Brand name that was queried")
    countryCode: str = Field(..., description="Country code that was queried")
    totalItems: int = Field(..., description="Total number of items for this brand/country")
    activeItems: int = Field(..., description="Number of active items")
    inactiveItems: int = Field(..., description="Number of inactive items")
    items: List[PromptRegistryItem] = Field(..., description="List of prompt registry items")


class PromptRegistryStatsResponse(BaseModel):
    totalBrands: int = Field(..., description="Total number of distinct brands")
    totalCountries: int = Field(..., description="Total number of distinct countries")
    totalConfigurations: int = Field(..., description="Total number of configurations")
    activeConfigurations: int = Field(..., description="Number of active configurations")
    inactiveConfigurations: int = Field(..., description="Number of inactive configurations")
    brands: List[str] = Field(..., description="List of all brand names")
    countries: List[str] = Field(..., description="List of all country codes")


class PromptRegistryDetailResponse(BaseModel):
    item: PromptRegistryItem = Field(..., description="Prompt registry item details")
    parsedSchema: Optional[Dict[str, Any]] = Field(None, description="Parsed JSON schema object")


class CreatePromptRegistryRequest(BaseModel):
    brandName: str = Field(..., description="Brand name")
    countryCode: str = Field(..., description="Country code")
    processingMethod: str = Field(..., description="Processing method: text, image, or both")
    schemaJson: Optional[str] = Field(None, description="JSON schema as string")
    prompt: Optional[str] = Field(None, description="Extraction prompt/instructions")
    specialInstructions: Optional[str] = Field(None, description="Additional processing instructions")
    feedback: Optional[str] = Field(None, description="Performance feedback and notes")
    isActive: bool = Field(True, description="Whether the configuration is active")
    createdBy: Optional[str] = Field(None, description="Created by user")


class UpdatePromptRegistryRequest(BaseModel):
    processingMethod: Optional[str] = Field(None, description="Processing method: text, image, or both")
    schemaJson: Optional[str] = Field(None, description="JSON schema as string")
    prompt: Optional[str] = Field(None, description="Extraction prompt/instructions")
    specialInstructions: Optional[str] = Field(None, description="Additional processing instructions")
    feedback: Optional[str] = Field(None, description="Performance feedback and notes")
    isActive: Optional[bool] = Field(None, description="Whether the configuration is active")
    updatedBy: Optional[str] = Field(None, description="Updated by user")


class OverwritePromptRegistryRequest(BaseModel):
    id: int = Field(..., description="ID of the prompt to overwrite")
    brandName: str = Field(..., description="Brand name")
    processingMethod: str = Field(..., description="Processing method: text, image, or both")
    regionCode: str = Field(..., description="Region code")
    regionName: str = Field(..., description="Region name")
    countryCode: str = Field(..., description="Country code")
    countryName: str = Field(..., description="Country name")
    schemaJson: Optional[str] = Field(None, description="JSON schema as string - will be updated")
    prompt: Optional[str] = Field(None, description="Extraction prompt/instructions - will be updated")
    specialInstructions: Optional[str] = Field(None, description="Additional processing instructions - will be updated")
    feedback: Optional[str] = Field(None, description="Performance feedback and notes - will be PRESERVED from existing")
    isActive: bool = Field(..., description="Whether the configuration is active")
    version: int = Field(..., description="Version number")
    createdAt: str = Field(..., description="Creation timestamp")
    updatedAt: str = Field(..., description="Last update timestamp")
    createdBy: Optional[str] = Field(None, description="Created by user")
    updatedBy: Optional[str] = Field(None, description="Updated by user")