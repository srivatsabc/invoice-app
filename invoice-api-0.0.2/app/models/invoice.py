# app/models/invoice.py - Updated InvoiceHeader model with brand_name
from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import date


class InvoiceFilters(BaseModel):
    region: str = Field("NA", description="Region filter")
    country: str = Field("US", description="Country filter")
    vendor: str = Field("All", description="Vendor filter")
    brandName: str = Field("All", description="Brand name filter")
    poNumber: str = Field("", description="Purchase Order Number filter")
    invoiceNumber: str = Field("", description="Invoice Number filter")
    invoiceType: str = Field("All", description="Invoice Type filter")
    receivedFrom: Optional[str] = Field("2024-06-01", description="Invoice received date from")
    receivedTo: Optional[str] = Field("2024-06-30", description="Invoice received date to")
    status: str = Field("All", description="Invoice status filter")
    hasUserFeedback: str = Field("Select", description="User feedback filter")


class Pagination(BaseModel):
    page: int = Field(1, description="Current page number")
    pageSize: int = Field(10, description="Number of items per page")


class PaginationResponse(BaseModel):
    page: int = Field(1, description="Current page number")
    pageSize: int = Field(10, description="Number of items per page")
    totalPages: int = Field(1, description="Total number of pages")


class Sort(BaseModel):
    field: str = Field("invoiceNumber", description="Field to sort by")
    direction: Literal["asc", "desc"] = Field("asc", description="Sort direction")


class InvoiceSearchResponse(BaseModel):
    filters: InvoiceFilters
    pagination: Pagination
    sort: Sort


class InvoiceSearchResults(BaseModel):
    results: InvoiceSearchResponse


class FilterOptions(BaseModel):
    regions: List[str]
    countries: Dict[str, List[str]]
    vendors: List[str]
    brandNames: List[str]
    invoiceTypes: List[str]
    statuses: List[str]


class FilterOptionsResponse(BaseModel):
    filters: FilterOptions


class InvoiceSearchRequest(BaseModel):
    filters: InvoiceFilters
    pagination: Pagination
    sort: Sort


class InvoiceData(BaseModel):
    id: str
    invoiceNumber: str
    region: str
    country: str
    vendor: str
    brandName: str
    invoiceType: str
    recdDate: str
    invoiceTotal: str
    processedDate: str
    status: str
    hasUserFeedback: str
    hasLogs: str 


class InvoiceSearchResultsResponse(BaseModel):
    results: List[InvoiceData]
    totalCount: int
    filters: InvoiceFilters
    pagination: PaginationResponse
    sort: Sort


# Detailed invoice models for GET /invoices/{invoiceNumber}

class InvoiceLineItem(BaseModel):
    id: str
    description: str
    quantity: float
    unitPrice: float
    totalPrice: float
    taxRate: float
    currency: Optional[str] = Field(None, description="Currency code for this line item")


class InvoiceTaxData(BaseModel):
    id: str
    taxAmount: float
    taxCategory: str
    taxJurisdiction: str
    taxRegistration: str


class InvoiceHeader(BaseModel):
    id: str
    region: str
    country: str
    vendor: str
    invoiceNumber: str
    vendorAddress: str
    poNumber: str
    taxId: str
    shipmentNumber: str
    receivedDate: str
    processedDate: str
    # Financial fields
    subtotal: Optional[float] = Field(None, description="Net amount before tax")
    tax: Optional[float] = Field(None, description="Tax amount")
    total: Optional[float] = Field(None, description="Gross amount (subtotal + tax)")
    currency: Optional[str] = Field(None, description="Currency code")
    # Additional fields
    issueDate: Optional[str] = Field(None, description="Invoice issue date")
    dueDate: Optional[str] = Field(None, description="Invoice due date")
    taxPointDate: Optional[str] = Field(None, description="Tax point date")
    buyerDetails: Optional[str] = Field(None, description="Buyer details")
    buyerTaxId: Optional[str] = Field(None, description="Buyer tax ID")
    buyerCompanyRegId: Optional[str] = Field(None, description="Buyer company registration ID")
    shipToDetails: Optional[str] = Field(None, description="Ship to address")
    shipToCountryCode: Optional[str] = Field(None, description="Ship to country code")
    paymentInformation: Optional[str] = Field(None, description="Payment information")
    paymentTerms: Optional[str] = Field(None, description="Payment terms")
    notes: Optional[str] = Field(None, description="Invoice notes")
    exchangeRate: Optional[float] = Field(None, description="Exchange rate")
    invoiceType: Optional[str] = Field(None, description="Invoice type")
    status: Optional[str] = Field(None, description="Invoice status")
    feedback: Optional[str] = Field(None, description="User feedback")
    extractionMethod: Optional[str] = Field(None, description="Extraction method")
    processingMethod: Optional[str] = Field(None, description="Processing method")
    brandName: Optional[str] = Field(None, description="Brand name")


class InvoiceDetailResponse(BaseModel):
    header: InvoiceHeader
    lineItems: List[InvoiceLineItem]
    taxData: List[InvoiceTaxData]
    pdfUrl: str