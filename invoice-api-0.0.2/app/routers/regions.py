# app/routers/regions.py - Regions and Countries API endpoints
from fastapi import APIRouter, HTTPException, Request, Path, Query, Depends
from ..models.regions import (
    RegionsListResponse, RegionWithCountries, AllRegionsWithCountriesResponse,
    CountrySearchResponse, CountryDetailsResponse, Region
)
from ..services.regions_service import RegionsService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from typing import Optional

router = APIRouter(
    prefix="/api/v3/regions-management",
    tags=["regions"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get regions service
def get_regions_service():
    return RegionsService()

@router.get("/regions", response_model=RegionsListResponse)
@log_function_call
async def get_all_regions(
    request: Request,
    regions_service: RegionsService = Depends(get_regions_service)
):
    """
    Get all available regions with basic information
    
    Returns a list of all regions with their codes, names, and country counts.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all regions request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        regions_data = await regions_service.get_all_regions()
        
        # Convert to response format
        regions = [Region(**region) for region in regions_data]
        
        response = RegionsListResponse(
            regions=regions,
            totalRegions=len(regions)
        )
        
        log_event("regions_retrieved", f"Retrieved {len(regions)} regions", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_regions": len(regions)
        })
        
        logger.info(f"{Colors.GREEN}Regions retrieved successfully | Request ID: {request_id} | Count: {len(regions)}{Colors.RESET}")
        
        return response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving regions | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving regions: {str(e)}")

@router.get("/regions/{region_code}/countries", response_model=RegionWithCountries)
@log_function_call
async def get_countries_by_region(
    request: Request,
    region_code: str = Path(..., description="Region code (NA, EMEA, APAC, LATAM)", example="NA"),
    regions_service: RegionsService = Depends(get_regions_service)
):
    """
    Get all countries for a specific region
    
    Returns detailed information about a region and all its countries.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get countries by region request | Region: {region_code} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        region_data = await regions_service.get_countries_by_region(region_code)
        
        response = RegionWithCountries(**region_data)
        
        log_event("region_countries_retrieved", f"Retrieved countries for region {region_code}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "region_code": region_code,
            "total_countries": len(region_data["countries"])
        })
        
        logger.info(f"{Colors.GREEN}Countries retrieved successfully | Region: {region_code} | Request ID: {request_id} | Count: {len(region_data['countries'])}{Colors.RESET}")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving countries for region {region_code} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving countries for region: {str(e)}")

@router.get("/regions-countries", response_model=AllRegionsWithCountriesResponse)
@log_function_call
async def get_all_regions_with_countries(
    request: Request,
    regions_service: RegionsService = Depends(get_regions_service)
):
    """
    Get all regions with their countries in a complete mapping
    
    Returns all regions with their complete country lists, plus a simple mapping format.
    This is useful for populating dropdowns or building region-country selection interfaces.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all regions with countries request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        data = await regions_service.get_all_regions_with_countries()
        
        # Debug: Log the actual structure being returned
        logger.info(f"{Colors.CYAN}Service returned data keys: {list(data.keys())}{Colors.RESET}")
        if 'regions' in data and len(data['regions']) > 0:
            logger.info(f"{Colors.CYAN}First region structure: {list(data['regions'][0].keys())}{Colors.RESET}")
            logger.info(f"{Colors.CYAN}First region data: {data['regions'][0]}{Colors.RESET}")
        
        # Manually add totalCountries to each region if missing
        for region in data['regions']:
            if 'totalCountries' not in region:
                region['totalCountries'] = len(region['countries'])
                logger.info(f"{Colors.YELLOW}Added totalCountries to region {region['regionCode']}: {region['totalCountries']}{Colors.RESET}")
        
        response = AllRegionsWithCountriesResponse(**data)
        
        log_event("all_regions_countries_retrieved", "Retrieved all regions with countries", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_regions": data["totalRegions"],
            "total_countries": data["totalCountries"]
        })
        
        logger.info(f"{Colors.GREEN}All regions with countries retrieved successfully | Request ID: {request_id} | Regions: {data['totalRegions']} | Countries: {data['totalCountries']}{Colors.RESET}")
        
        return response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving all regions with countries | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving regions with countries: {str(e)}")

@router.get("/countries/search", response_model=CountrySearchResponse)
@log_function_call
async def search_countries(
    request: Request,
    q: str = Query(..., description="Search term for country name or code", example="United"),
    regions_service: RegionsService = Depends(get_regions_service)
):
    """
    Search countries by name or code
    
    Search across all countries and regions for matches in country names, country codes, or region names.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing country search request | Query: '{q}' | Request ID: {request_id}{Colors.RESET}")
    
    try:
        if len(q.strip()) < 2:
            raise HTTPException(status_code=400, detail="Search term must be at least 2 characters long")
        
        countries_data = await regions_service.search_countries(q)
        
        response = CountrySearchResponse(
            countries=countries_data,
            totalResults=len(countries_data)
        )
        
        log_event("countries_searched", f"Searched countries with term '{q}'", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "search_term": q,
            "results_count": len(countries_data)
        })
        
        logger.info(f"{Colors.GREEN}Country search completed | Query: '{q}' | Request ID: {request_id} | Results: {len(countries_data)}{Colors.RESET}")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 400)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error searching countries | Query: '{q}' | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error searching countries: {str(e)}")

@router.get("/countries/{country_code}", response_model=CountryDetailsResponse)
@log_function_call
async def get_country_details(
    request: Request,
    country_code: str = Path(..., description="ISO country code", example="US"),
    regions_service: RegionsService = Depends(get_regions_service)
):
    """
    Get details for a specific country
    
    Returns detailed information about a country including which region it belongs to.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get country details request | Country: {country_code} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        country_data = await regions_service.get_country_details(country_code)
        
        response = CountryDetailsResponse(**country_data)
        
        log_event("country_details_retrieved", f"Retrieved details for country {country_code}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "region_code": country_data["regionCode"]
        })
        
        logger.info(f"{Colors.GREEN}Country details retrieved successfully | Country: {country_code} | Request ID: {request_id}{Colors.RESET}")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving country details | Country: {country_code} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving country details: {str(e)}")