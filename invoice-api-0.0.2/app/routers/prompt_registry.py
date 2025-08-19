# app/routers/prompt_registry.py - Updated Prompt Registry API endpoints
from fastapi import APIRouter, HTTPException, Request, Path, Query, Depends, Body
from ..models.prompt_registry import (
    PromptRegistryListResponse, PromptRegistryStatsResponse, 
    PromptRegistryDetailResponse, PromptRegistryItem,
    CreatePromptRegistryRequest, UpdatePromptRegistryRequest, OverwritePromptRegistryRequest
)
from ..services.prompt_registry_service import PromptRegistryService
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from typing import Optional, List, Dict

router = APIRouter(
    prefix="/api/v3/prompt-registry",
    tags=["prompt-registry"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get prompt registry service
def get_prompt_registry_service():
    return PromptRegistryService()

@router.get("/countries/{country_code}/brands/{brand_name}", response_model=PromptRegistryListResponse)
@log_function_call
async def get_prompts_by_country_and_brand(
    request: Request,
    country_code: str = Path(..., description="Country code to filter prompts", example="US"),
    brand_name: str = Path(..., description="Brand name to filter prompts", example="jungheinrich"),
    active_only: bool = Query(False, description="Return only active configurations (default: False - returns all)"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get all prompt registry configurations for a specific country and brand
    
    Returns ALL prompt configurations (active and inactive) for the specified country and brand by default,
    ordered by version (descending) and creation date (descending).
    Use active_only=true to filter for active configurations only.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get prompts by country and brand request | Country: {country_code} | Brand: {brand_name} | Active Only: {active_only} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Note: using include_inactive=True by default (opposite of active_only)
        include_inactive = not active_only
        response = await prompt_service.get_prompts_by_brand_and_country(brand_name, country_code, include_inactive)
        
        log_event("prompts_by_country_brand_retrieved", f"Retrieved prompts for country {country_code} and brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "brand_name": brand_name,
            "total_items": response.totalItems,
            "active_items": response.activeItems,
            "active_only": active_only
        })
        
        logger.info(f"{Colors.GREEN}Prompts retrieved successfully | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | Count: {response.totalItems} (Active: {response.activeItems}, Inactive: {response.inactiveItems}){Colors.RESET}")
        
        return response
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving prompts for country {country_code} and brand {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving prompts for country and brand: {str(e)}")

@router.get("/countries/{country_code}/brands/{brand_name}/latest", response_model=PromptRegistryItem)
@log_function_call
async def get_latest_prompt_by_country_and_brand(
    request: Request,
    country_code: str = Path(..., description="Country code", example="US"),
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    processing_method: Optional[str] = Query(None, description="Processing method filter: text, image, or both"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get the latest active prompt configuration for a specific country and brand
    
    Returns the most recent active configuration for the country and brand, optionally filtered by processing method.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get latest prompt request | Country: {country_code} | Brand: {brand_name} | Method: {processing_method} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        item = await prompt_service.get_latest_active_prompt(brand_name, country_code, processing_method)
        
        if not item:
            raise HTTPException(
                status_code=404, 
                detail=f"No active prompt found for country '{country_code}' and brand '{brand_name}'" + 
                       (f" with processing method '{processing_method}'" if processing_method else "")
            )
        
        log_event("latest_prompt_retrieved", f"Retrieved latest prompt for country {country_code} and brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "brand_name": brand_name,
            "processing_method": processing_method,
            "prompt_id": item.id,
            "version": item.version
        })
        
        logger.info(f"{Colors.GREEN}Latest prompt retrieved successfully | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | ID: {item.id}{Colors.RESET}")
        
        return item
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving latest prompt for country {country_code} and brand {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving latest prompt: {str(e)}")

@router.post("/countries/{country_code}/brands/{brand_name}", response_model=PromptRegistryItem)
@log_function_call
async def create_prompt_registry_item(
    request: Request,
    country_code: str = Path(..., description="Country code", example="US"),
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    prompt_request: CreatePromptRegistryRequest = Body(...),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Create a new prompt registry configuration for a country and brand
    
    Creates a new prompt configuration with automatic version incrementing and region lookup.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing create prompt request | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Override the brand name and country code from the path parameters
        prompt_request.brandName = brand_name
        prompt_request.countryCode = country_code
        
        created_item = await prompt_service.create_prompt_registry_item(prompt_request)
        
        log_event("prompt_registry_created", f"Created new prompt for country {country_code} and brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "brand_name": brand_name,
            "prompt_id": created_item.id,
            "version": created_item.version,
            "processing_method": created_item.processingMethod
        })
        
        logger.info(f"{Colors.GREEN}Prompt registry item created successfully | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | ID: {created_item.id}{Colors.RESET}")
        
        return created_item
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error creating prompt for country {country_code} and brand {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating prompt: {str(e)}")

@router.post("/countries/{country_code}/brands/{brand_name}/overwrite", response_model=PromptRegistryItem)
@log_function_call
async def overwrite_prompt_registry_item(
    request: Request,
    country_code: str = Path(..., description="Country code", example="CZ"),
    brand_name: str = Path(..., description="Brand name", example="default"),
    overwrite_request: OverwritePromptRegistryRequest = Body(...),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Overwrite an existing prompt registry configuration for a country and brand
    
    This endpoint overwrites an existing prompt configuration by ID, updating only the 
    schemaJson, prompt, and specialInstructions fields while preserving the existing feedback.
    
    The country_code and brand_name in the path must match the request payload.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing overwrite prompt request | Country: {country_code} | Brand: {brand_name} | ID: {overwrite_request.id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Validate that path parameters match the payload
        if overwrite_request.countryCode.upper() != country_code.upper():
            raise HTTPException(status_code=400, detail=f"Country code mismatch: path has '{country_code}', payload has '{overwrite_request.countryCode}'")
        
        if overwrite_request.brandName != brand_name:
            raise HTTPException(status_code=400, detail=f"Brand name mismatch: path has '{brand_name}', payload has '{overwrite_request.brandName}'")
        
        # Override the brand name and country code from path parameters to ensure consistency
        overwrite_request.brandName = brand_name
        overwrite_request.countryCode = country_code
        
        updated_item = await prompt_service.overwrite_prompt_registry_item(overwrite_request)
        
        log_event("prompt_registry_overwritten", f"Overwrote prompt for country {country_code} and brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "brand_name": brand_name,
            "prompt_id": updated_item.id,
            "version": updated_item.version,
            "processing_method": updated_item.processingMethod,
            "updated_by": overwrite_request.updatedBy,
            "fields_updated": ["schemaJson", "prompt", "specialInstructions"],
            "fields_preserved": ["feedback"]
        })
        
        logger.info(f"{Colors.GREEN}Prompt registry item overwritten successfully | Country: {country_code} | Brand: {brand_name} | Request ID: {request_id} | ID: {updated_item.id} (feedback preserved){Colors.RESET}")
        
        return updated_item
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error overwriting prompt for country {country_code} and brand {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error overwriting prompt: {str(e)}")

@router.get("/countries/{country_code}/brands", response_model=List[str])
@log_function_call
async def get_brands_by_country(
    request: Request,
    country_code: str = Path(..., description="Country code", example="US"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get list of all brands that have configurations in a specific country
    
    Returns a list of brand names that have prompt configurations for the specified country.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get brands by country request | Country: {country_code} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        brands = await prompt_service.get_brands_by_country(country_code)
        
        log_event("brands_by_country_retrieved", f"Retrieved brands for country {country_code}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code,
            "total_brands": len(brands)
        })
        
        logger.info(f"{Colors.GREEN}Brands by country retrieved successfully | Country: {country_code} | Request ID: {request_id} | Count: {len(brands)}{Colors.RESET}")
        
        return brands
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving brands for country {country_code} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving brands for country: {str(e)}")

@router.get("/countries/{country_code}", response_model=List[Dict])
@log_function_call
async def get_country_summary(
    request: Request,
    country_code: str = Path(..., description="Country code", example="US"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get summary of all prompt configurations for a specific country
    
    Returns a summary including brands, total configurations, and statistics for the country.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get country summary request | Country: {country_code} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        summary = await prompt_service.get_country_summary(country_code)
        
        log_event("country_summary_retrieved", f"Retrieved summary for country {country_code}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "country_code": country_code
        })
        
        logger.info(f"{Colors.GREEN}Country summary retrieved successfully | Country: {country_code} | Request ID: {request_id}{Colors.RESET}")
        
        return summary
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving country summary for {country_code} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving country summary: {str(e)}")

@router.get("/brands/{brand_name}/countries", response_model=List[str])
@log_function_call
async def get_countries_by_brand(
    request: Request,
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get list of all countries that have configurations for a specific brand
    
    Returns a list of country codes that have prompt configurations for the specified brand.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get countries by brand request | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        countries = await prompt_service.get_countries_by_brand(brand_name)
        
        log_event("countries_by_brand_retrieved", f"Retrieved countries for brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "brand_name": brand_name,
            "total_countries": len(countries)
        })
        
        logger.info(f"{Colors.GREEN}Countries by brand retrieved successfully | Brand: {brand_name} | Request ID: {request_id} | Count: {len(countries)}{Colors.RESET}")
        
        return countries
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving countries for brand {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving countries for brand: {str(e)}")

@router.get("/brands/{brand_name}", response_model=List[Dict])
@log_function_call
async def get_brand_summary(
    request: Request,
    brand_name: str = Path(..., description="Brand name", example="jungheinrich"),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get summary of all prompt configurations for a specific brand
    
    Returns a summary including countries, total configurations, and statistics for the brand.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get brand summary request | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        summary = await prompt_service.get_brand_summary(brand_name)
        
        log_event("brand_summary_retrieved", f"Retrieved summary for brand {brand_name}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "brand_name": brand_name
        })
        
        logger.info(f"{Colors.GREEN}Brand summary retrieved successfully | Brand: {brand_name} | Request ID: {request_id}{Colors.RESET}")
        
        return summary
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving brand summary for {brand_name} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving brand summary: {str(e)}")

@router.get("/items/{prompt_id}", response_model=PromptRegistryDetailResponse)
@log_function_call
async def get_prompt_by_id(
    request: Request,
    prompt_id: int = Path(..., description="Prompt registry item ID", example=1),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get a specific prompt registry item by ID
    
    Returns detailed information about a prompt configuration including parsed JSON schema.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get prompt by ID request | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        item = await prompt_service.get_prompt_by_id(prompt_id)
        
        if not item:
            raise HTTPException(status_code=404, detail=f"Prompt registry item {prompt_id} not found")
        
        # Parse JSON schema if available
        parsed_schema = prompt_service.safe_parse_json(item.schemaJson)
        
        response = PromptRegistryDetailResponse(
            item=item,
            parsedSchema=parsed_schema
        )
        
        log_event("prompt_by_id_retrieved", f"Retrieved prompt registry item {prompt_id}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "prompt_id": prompt_id,
            "brand_name": item.brandName,
            "country_code": item.countryCode,
            "version": item.version,
            "is_active": item.isActive
        })
        
        logger.info(f"{Colors.GREEN}Prompt item retrieved successfully | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
        
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving prompt item {prompt_id} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving prompt item: {str(e)}")

@router.put("/items/{prompt_id}", response_model=PromptRegistryItem)
@log_function_call
async def update_prompt_registry_item(
    request: Request,
    prompt_id: int = Path(..., description="Prompt registry item ID", example=1),
    update_request: UpdatePromptRegistryRequest = Body(...),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Update an existing prompt registry item
    
    Updates the specified fields of a prompt configuration. Only provided fields will be updated.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing update prompt request | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        updated_item = await prompt_service.update_prompt_registry_item(prompt_id, update_request)
        
        log_event("prompt_registry_updated", f"Updated prompt registry item {prompt_id}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "prompt_id": prompt_id,
            "brand_name": updated_item.brandName,
            "country_code": updated_item.countryCode,
            "version": updated_item.version,
            "updated_by": update_request.updatedBy
        })
        
        logger.info(f"{Colors.GREEN}Prompt registry item updated successfully | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
        
        return updated_item
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error updating prompt item {prompt_id} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating prompt item: {str(e)}")

@router.delete("/items/{prompt_id}")
@log_function_call
async def delete_prompt_registry_item(
    request: Request,
    prompt_id: int = Path(..., description="Prompt registry item ID", example=1),
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Delete a prompt registry item
    
    Permanently removes a prompt configuration from the registry.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing delete prompt request | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        # Get the item first for logging purposes
        item = await prompt_service.get_prompt_by_id(prompt_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Prompt registry item {prompt_id} not found")
        
        await prompt_service.delete_prompt_registry_item(prompt_id)
        
        log_event("prompt_registry_deleted", f"Deleted prompt registry item {prompt_id}", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "prompt_id": prompt_id,
            "brand_name": item.brandName,
            "country_code": item.countryCode,
            "version": item.version
        })
        
        logger.info(f"{Colors.GREEN}Prompt registry item deleted successfully | ID: {prompt_id} | Request ID: {request_id}{Colors.RESET}")
        
        return {"message": f"Prompt registry item {prompt_id} deleted successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error deleting prompt item {prompt_id} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting prompt item: {str(e)}")

@router.get("/brands", response_model=List[str])
@log_function_call
async def get_all_brands(
    request: Request,
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get list of all distinct brand names in the prompt registry
    
    Returns a list of all brand names that have prompt configurations.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all brands request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        brands = await prompt_service.get_all_brands()
        
        log_event("all_brands_retrieved", "Retrieved all brands", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_brands": len(brands)
        })
        
        logger.info(f"{Colors.GREEN}All brands retrieved successfully | Request ID: {request_id} | Count: {len(brands)}{Colors.RESET}")
        
        return brands
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving all brands | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving brands: {str(e)}")

@router.get("/countries", response_model=List[str])
@log_function_call
async def get_all_countries(
    request: Request,
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get list of all distinct country codes in the prompt registry
    
    Returns a list of all country codes that have prompt configurations.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get all countries request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        countries = await prompt_service.get_all_countries()
        
        log_event("all_countries_retrieved", "Retrieved all countries", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_countries": len(countries)
        })
        
        logger.info(f"{Colors.GREEN}All countries retrieved successfully | Request ID: {request_id} | Count: {len(countries)}{Colors.RESET}")
        
        return countries
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving all countries | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving countries: {str(e)}")

@router.get("/countries-to-brands", response_model=Dict[str, List[str]])
@log_function_call
async def get_countries_to_brands_mapping(
    request: Request,
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get a mapping of all countries to their available brands
    
    Returns a dictionary where keys are country codes and values are lists of brand names
    that have prompt configurations in that country.
    
    Example response:
    {
        "US": ["jungheinrich", "toyota", "caterpillar"],
        "DE": ["jungheinrich", "bmw"],
        "JP": ["toyota", "honda"]
    }
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get countries to brands mapping request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        mapping = await prompt_service.get_countries_to_brands_mapping()
        
        # Calculate totals for logging
        total_countries = len(mapping)
        total_brands = len(set(brand for brands in mapping.values() for brand in brands))
        
        log_event("countries_to_brands_mapping_retrieved", "Retrieved countries to brands mapping", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_countries": total_countries,
            "total_unique_brands": total_brands
        })
        
        logger.info(f"{Colors.GREEN}Countries to brands mapping retrieved successfully | Request ID: {request_id} | Countries: {total_countries} | Unique Brands: {total_brands}{Colors.RESET}")
        
        return mapping
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving countries to brands mapping | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving countries to brands mapping: {str(e)}")

@router.get("/stats", response_model=PromptRegistryStatsResponse)
@log_function_call
async def get_registry_stats(
    request: Request,
    prompt_service: PromptRegistryService = Depends(get_prompt_registry_service)
):
    """
    Get overall statistics for the prompt registry
    
    Returns comprehensive statistics about the prompt registry including brand counts,
    country counts, configuration counts, and status breakdowns.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Processing get registry stats request | Request ID: {request_id}{Colors.RESET}")
    
    try:
        stats = await prompt_service.get_registry_stats()
        
        log_event("registry_stats_retrieved", "Retrieved registry statistics", {
            "request_id": request_id,
            "client_ip": request.client.host if request.client else "unknown",
            "total_brands": stats.totalBrands,
            "total_countries": stats.totalCountries,
            "total_configurations": stats.totalConfigurations,
            "active_configurations": stats.activeConfigurations
        })
        
        logger.info(f"{Colors.GREEN}Registry stats retrieved successfully | Request ID: {request_id}{Colors.RESET}")
        
        return stats
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error retrieving registry stats | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving registry stats: {str(e)}")