from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Statistics models
class Statistics(BaseModel):
    totalProcessed: int = Field(..., description="Total number of invoices processed")
    totalSuccess: int = Field(..., description="Total number of successfully processed invoices")
    totalFailed: int = Field(..., description="Total number of failed invoices")

# Processing trend models
class ProcessingTrend(BaseModel):
    labels: List[str] = Field(..., description="Date labels for the trend chart")
    success: List[int] = Field(..., description="Number of successful invoices per day")
    failed: List[int] = Field(..., description="Number of failed invoices per day")

# Top values models
class TopValue(BaseModel):
    value: str = Field(..., description="Field value")
    count: int = Field(..., description="Occurrence count of the value")

class FieldTopValues(BaseModel):
    field: str = Field(..., description="Field name")
    topValues: List[TopValue] = Field(..., description="Top values for this field")

class FieldGroup(BaseModel):
    fields: List[str] = Field(..., description="List of fields in this group")
    values: List[FieldTopValues] = Field(..., description="Top values for each field")

class TopFields(BaseModel):
    header: FieldGroup = Field(..., description="Top values for header fields")
    lineItems: FieldGroup = Field(..., description="Top values for line item fields")
    taxData: FieldGroup = Field(..., description="Top values for tax data fields")

# Filter models
class DateRange(BaseModel):
    from_: str = Field(..., alias="from", description="Start date of the date range")
    to: str = Field(..., description="End date of the date range")

class DashboardFilters(BaseModel):
    regions: List[str] = Field(..., description="Available regions")
    countries: Dict[str, List[str]] = Field(..., description="Available countries by region")
    vendors: List[str] = Field(..., description="Available vendors")
    dateRange: DateRange = Field(..., description="Default date range")

# Dashboard response model
class DashboardResponse(BaseModel):
    statistics: Statistics = Field(..., description="Aggregate statistics")
    processingTrend: ProcessingTrend = Field(..., description="Processing trend over time")
    top5Fields: TopFields = Field(..., description="Top 5 values for various fields")
    filters: DashboardFilters = Field(..., description="Available filters for the dashboard")