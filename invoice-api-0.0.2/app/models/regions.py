# app/models/regions.py
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class Country(BaseModel):
    countryCode: str = Field(..., description="ISO country code")
    countryName: str = Field(..., description="Full country name")


class CountryWithRegion(BaseModel):
    regionCode: str = Field(..., description="Region code the country belongs to")
    regionName: str = Field(..., description="Full region name")
    countryCode: str = Field(..., description="ISO country code")
    countryName: str = Field(..., description="Full country name")


class Region(BaseModel):
    regionCode: str = Field(..., description="Region code")
    regionName: str = Field(..., description="Full region name")
    countryCount: Optional[int] = Field(None, description="Number of countries in region")


class RegionWithCountries(BaseModel):
    regionCode: str = Field(..., description="Region code")
    regionName: str = Field(..., description="Full region name")
    countries: List[Country] = Field(..., description="List of countries in the region")
    totalCountries: Optional[int] = Field(None, description="Total number of countries")


class RegionsListResponse(BaseModel):
    regions: List[Region] = Field(..., description="List of all regions")
    totalRegions: int = Field(..., description="Total number of regions")


class AllRegionsWithCountriesResponse(BaseModel):
    regions: List[RegionWithCountries] = Field(..., description="List of regions with their countries")
    simpleMapping: Dict[str, List[str]] = Field(..., description="Simple region to country codes mapping")
    totalRegions: int = Field(..., description="Total number of regions")
    totalCountries: int = Field(..., description="Total number of countries across all regions")


class CountrySearchResponse(BaseModel):
    countries: List[CountryWithRegion] = Field(..., description="List of matching countries")
    totalResults: int = Field(..., description="Total number of matching countries")


class CountryDetailsResponse(BaseModel):
    regionCode: str = Field(..., description="Region code the country belongs to")
    regionName: str = Field(..., description="Full region name")
    countryCode: str = Field(..., description="ISO country code")
    countryName: str = Field(..., description="Full country name")