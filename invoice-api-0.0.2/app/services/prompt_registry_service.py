# app/services/prompt_registry_service.py
import pyodbc
import os
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from ..models.prompt_registry import (
    PromptRegistryItem, PromptRegistryListResponse, PromptRegistryStatsResponse,
    CreatePromptRegistryRequest, UpdatePromptRegistryRequest, OverwritePromptRegistryRequest
)
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class PromptRegistryService:
    """Service class for handling prompt registry database operations"""
    
    def __init__(self):
        self.connection_string = os.getenv("DBConnectionStringGwh")
        if not self.connection_string:
            raise ValueError("Database connection string not configured")
    
    @log_function_call
    async def get_connection(self) -> pyodbc.Connection:
        """Get database connection"""
        try:
            return pyodbc.connect(self.connection_string)
        except Exception as e:
            logger.error(f"{Colors.RED}Database connection failed: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    
    def format_prompt_registry_item(self, row) -> PromptRegistryItem:
        """Format database row into PromptRegistryItem"""
        return PromptRegistryItem(
            id=row[0],
            brandName=row[1] or "",
            processingMethod=row[2] or "",
            regionCode=row[3] or "",
            regionName=row[4] or "",
            countryCode=row[5] or "",
            countryName=row[6] or "",
            schemaJson=row[7],
            prompt=row[8],
            specialInstructions=row[9],
            feedback=row[10],
            isActive=bool(row[11]) if row[11] is not None else True,
            version=row[12] or 1,
            createdAt=row[13] if row[13] else datetime.now(),
            updatedAt=row[14] if row[14] else datetime.now(),
            createdBy=row[15],
            updatedBy=row[16]
        )
    
    @log_function_call
    async def get_region_info_by_country(self, country_code: str) -> Tuple[str, str]:
        """Get region code and name for a given country code"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT region_code, region_name
                FROM regions_countries 
                WHERE country_code = ? AND is_active = 1
            """
            
            cursor.execute(query, [country_code.upper()])
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail=f"Country code '{country_code}' not found")
            
            return result[0], result[1]
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_country_name_by_code(self, country_code: str) -> str:
        """Get country name for a given country code"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT country_name
                FROM regions_countries 
                WHERE country_code = ? AND is_active = 1
            """
            
            cursor.execute(query, [country_code.upper()])
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail=f"Country code '{country_code}' not found")
            
            return result[0]
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_prompts_by_brand_and_country(self, brand_name: str, country_code: str, include_inactive: bool = True) -> PromptRegistryListResponse:
        """Get all prompt registry items for a specific brand and country (includes inactive by default)"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause - by default include all (active and inactive)
            where_clause = "brand_name = ? AND country_code = ?"
            params = [brand_name, country_code.upper()]
            
            if not include_inactive:
                where_clause += " AND is_active = 1"
            
            # Query prompt registry items
            query = f"""
                SELECT 
                    id, brand_name, processing_method, region_code, region_name,
                    country_code, country_name, schema_json, prompt,
                    special_instructions, feedback, is_active, version,
                    created_at, updated_at, created_by, updated_by
                FROM prompt_registry 
                WHERE {where_clause}
                ORDER BY version DESC, created_at DESC
            """
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            # Format results
            items = []
            active_count = 0
            inactive_count = 0
            
            for row in rows:
                item = self.format_prompt_registry_item(row)
                items.append(item)
                
                if item.isActive:
                    active_count += 1
                else:
                    inactive_count += 1
            
            response = PromptRegistryListResponse(
                brandName=brand_name,
                countryCode=country_code.upper(),
                totalItems=len(items),
                activeItems=active_count,
                inactiveItems=inactive_count,
                items=items
            )
            
            status_msg = "all prompts" if include_inactive else "active prompts only"
            logger.info(f"{Colors.GREEN}Retrieved {len(items)} prompt registry items ({status_msg}) for brand '{brand_name}' and country '{country_code}'{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_prompt_by_id(self, prompt_id: int) -> Optional[PromptRegistryItem]:
        """Get a specific prompt registry item by ID"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    id, brand_name, processing_method, region_code, region_name,
                    country_code, country_name, schema_json, prompt,
                    special_instructions, feedback, is_active, version,
                    created_at, updated_at, created_by, updated_by
                FROM prompt_registry 
                WHERE id = ?
            """
            
            cursor.execute(query, [prompt_id])
            row = cursor.fetchone()
            
            if not row:
                return None
            
            item = self.format_prompt_registry_item(row)
            logger.info(f"{Colors.GREEN}Retrieved prompt registry item {prompt_id}{Colors.RESET}")
            return item
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_latest_active_prompt(self, brand_name: str, country_code: str, processing_method: Optional[str] = None) -> Optional[PromptRegistryItem]:
        """Get the latest active prompt for a brand, country and processing method"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build WHERE clause
            where_clause = "brand_name = ? AND country_code = ? AND is_active = 1"
            params = [brand_name, country_code.upper()]
            
            if processing_method:
                where_clause += " AND processing_method = ?"
                params.append(processing_method)
            
            query = f"""
                SELECT TOP 1
                    id, brand_name, processing_method, region_code, region_name,
                    country_code, country_name, schema_json, prompt,
                    special_instructions, feedback, is_active, version,
                    created_at, updated_at, created_by, updated_by
                FROM prompt_registry 
                WHERE {where_clause}
                ORDER BY version DESC, created_at DESC
            """
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            
            if not row:
                return None
            
            item = self.format_prompt_registry_item(row)
            logger.info(f"{Colors.GREEN}Retrieved latest active prompt for brand '{brand_name}' and country '{country_code}'{Colors.RESET}")
            return item
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def create_prompt_registry_item(self, request: CreatePromptRegistryRequest) -> PromptRegistryItem:
        """Create a new prompt registry item with smart version management"""
        # Get region information for the country
        region_code, region_name = await self.get_region_info_by_country(request.countryCode)
        country_name = await self.get_country_name_by_code(request.countryCode)
        
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if there's an existing active entry for this brand/country/processing_method
            existing_check_query = """
                SELECT id, version
                FROM prompt_registry 
                WHERE brand_name = ? AND country_code = ? AND processing_method = ? AND is_active = 1
            """
            cursor.execute(existing_check_query, [request.brandName, request.countryCode.upper(), request.processingMethod])
            existing_active = cursor.fetchone()
            
            # Get the next version number for this brand/country/processing_method combination
            version_query = """
                SELECT ISNULL(MAX(version), 0) + 1
                FROM prompt_registry 
                WHERE brand_name = ? AND country_code = ? AND processing_method = ?
            """
            cursor.execute(version_query, [request.brandName, request.countryCode.upper(), request.processingMethod])
            next_version = cursor.fetchone()[0]
            
            # If there's an existing active entry, deactivate it first
            if existing_active:
                existing_id = existing_active[0]
                existing_version = existing_active[1]
                
                deactivate_query = """
                    UPDATE prompt_registry 
                    SET is_active = 0, updated_at = GETDATE(), updated_by = ?
                    WHERE id = ?
                """
                cursor.execute(deactivate_query, [request.createdBy, existing_id])
                
                logger.info(f"{Colors.YELLOW}Deactivated existing version {existing_version} (ID: {existing_id}) for brand '{request.brandName}', country '{request.countryCode}', method '{request.processingMethod}'{Colors.RESET}")
            
            # Insert new prompt registry item (always active)
            insert_query = """
                INSERT INTO prompt_registry (
                    brand_name, processing_method, region_code, region_name,
                    country_code, country_name, schema_json, prompt,
                    special_instructions, feedback, is_active, version,
                    created_by, updated_by
                ) 
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """
            
            cursor.execute(insert_query, [
                request.brandName,
                request.processingMethod,
                region_code,
                region_name,
                request.countryCode.upper(),
                country_name,
                request.schemaJson,
                request.prompt,
                request.specialInstructions,
                request.feedback,
                # is_active = 1 (always active for new entries)
                next_version,
                request.createdBy,
                request.createdBy  # updatedBy = createdBy for new items
            ])
            
            new_id = cursor.fetchone()[0]
            conn.commit()
            
            # Retrieve and return the created item
            created_item = await self.get_prompt_by_id(new_id)
            if not created_item:
                raise HTTPException(status_code=500, detail="Failed to retrieve created item")
            
            action_msg = f"Created new version {next_version}" + (f" and deactivated version {existing_active[1]}" if existing_active else " (first version)")
            logger.info(f"{Colors.GREEN}{action_msg} for brand '{request.brandName}', country '{request.countryCode}', method '{request.processingMethod}' (ID: {new_id}){Colors.RESET}")
            
            return created_item
            
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error creating prompt registry item: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error creating prompt registry item: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def update_prompt_registry_item(self, prompt_id: int, request: UpdatePromptRegistryRequest) -> PromptRegistryItem:
        """Update an existing prompt registry item"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Build dynamic update query
            set_clauses = []
            params = []
            
            if request.processingMethod is not None:
                set_clauses.append("processing_method = ?")
                params.append(request.processingMethod)
            
            if request.schemaJson is not None:
                set_clauses.append("schema_json = ?")
                params.append(request.schemaJson)
            
            if request.prompt is not None:
                set_clauses.append("prompt = ?")
                params.append(request.prompt)
            
            if request.specialInstructions is not None:
                set_clauses.append("special_instructions = ?")
                params.append(request.specialInstructions)
            
            if request.feedback is not None:
                set_clauses.append("feedback = ?")
                params.append(request.feedback)
            
            if request.isActive is not None:
                set_clauses.append("is_active = ?")
                params.append(request.isActive)
            
            if request.updatedBy is not None:
                set_clauses.append("updated_by = ?")
                params.append(request.updatedBy)
            
            # Always update the timestamp
            set_clauses.append("updated_at = GETDATE()")
            
            if not set_clauses:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            # Add the ID parameter for WHERE clause
            params.append(prompt_id)
            
            update_query = f"""
                UPDATE prompt_registry 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            """
            
            cursor.execute(update_query, params)
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Prompt registry item {prompt_id} not found")
            
            conn.commit()
            
            # Retrieve and return the updated item
            updated_item = await self.get_prompt_by_id(prompt_id)
            if not updated_item:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated item")
            
            logger.info(f"{Colors.GREEN}Updated prompt registry item {prompt_id}{Colors.RESET}")
            return updated_item
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error updating prompt registry item: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error updating prompt registry item: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def overwrite_prompt_registry_item(self, request: OverwritePromptRegistryRequest) -> PromptRegistryItem:
        """Overwrite an existing prompt registry item, preserving feedback and updating only specific fields"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # First, get the existing item to preserve the feedback
            existing_item = await self.get_prompt_by_id(request.id)
            if not existing_item:
                raise HTTPException(status_code=404, detail=f"Prompt registry item {request.id} not found")
            
            # Preserve the existing feedback (don't overwrite it)
            preserved_feedback = existing_item.feedback
            
            # Update the item with new values, but preserve feedback
            update_query = """
                UPDATE prompt_registry 
                SET 
                    brand_name = ?,
                    processing_method = ?,
                    region_code = ?,
                    region_name = ?,
                    country_code = ?,
                    country_name = ?,
                    schema_json = ?,
                    prompt = ?,
                    special_instructions = ?,
                    feedback = ?,  -- Preserve existing feedback
                    is_active = ?,
                    version = ?,
                    updated_by = ?,
                    updated_at = GETDATE()
                WHERE id = ?
            """
            
            cursor.execute(update_query, [
                request.brandName,
                request.processingMethod,
                request.regionCode,
                request.regionName,
                request.countryCode.upper(),
                request.countryName,
                request.schemaJson,  # Will be updated
                request.prompt,      # Will be updated
                request.specialInstructions,  # Will be updated
                preserved_feedback,  # PRESERVED from existing item
                request.isActive,
                request.version,
                request.updatedBy,
                request.id
            ])
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Prompt registry item {request.id} not found")
            
            conn.commit()
            
            # Retrieve and return the updated item
            updated_item = await self.get_prompt_by_id(request.id)
            if not updated_item:
                raise HTTPException(status_code=500, detail="Failed to retrieve updated item")
            
            logger.info(f"{Colors.GREEN}Overwrote prompt registry item {request.id} for brand '{request.brandName}' and country '{request.countryCode}' (preserved feedback){Colors.RESET}")
            return updated_item
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error overwriting prompt registry item: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error overwriting prompt registry item: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def delete_prompt_registry_item(self, prompt_id: int) -> bool:
        """Delete a prompt registry item"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            delete_query = "DELETE FROM prompt_registry WHERE id = ?"
            cursor.execute(delete_query, [prompt_id])
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail=f"Prompt registry item {prompt_id} not found")
            
            conn.commit()
            logger.info(f"{Colors.GREEN}Deleted prompt registry item {prompt_id}{Colors.RESET}")
            return True
            
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error deleting prompt registry item: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error deleting prompt registry item: {str(e)}")
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_brands_by_country(self, country_code: str) -> List[str]:
        """Get list of all distinct brand names for a specific country"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT brand_name 
                FROM prompt_registry 
                WHERE country_code = ? AND brand_name IS NOT NULL
                ORDER BY brand_name
            """
            
            cursor.execute(query, [country_code.upper()])
            rows = cursor.fetchall()
            
            brands = [row[0] for row in rows if row[0]]
            logger.info(f"{Colors.GREEN}Retrieved {len(brands)} distinct brands for country {country_code}{Colors.RESET}")
            return brands
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_country_summary(self, country_code: str) -> List[Dict]:
        """Get summary of prompt configurations for a specific country"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Get summary by brand for the country
            query = """
                SELECT 
                    brand_name,
                    COUNT(*) as total_configs,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_configs,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_configs,
                    MAX(version) as latest_version,
                    MAX(updated_at) as last_updated
                FROM prompt_registry 
                WHERE country_code = ?
                GROUP BY brand_name
                ORDER BY brand_name
            """
            
            cursor.execute(query, [country_code.upper()])
            rows = cursor.fetchall()
            
            summary = []
            for row in rows:
                summary.append({
                    "brandName": row[0],
                    "totalConfigs": row[1],
                    "activeConfigs": row[2],
                    "inactiveConfigs": row[3],
                    "latestVersion": row[4],
                    "lastUpdated": row[5].isoformat() if row[5] else None
                })
            
            logger.info(f"{Colors.GREEN}Retrieved summary for country {country_code} with {len(summary)} brands{Colors.RESET}")
            return summary
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_countries_by_brand(self, brand_name: str) -> List[str]:
        """Get list of all distinct country codes for a specific brand"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT country_code 
                FROM prompt_registry 
                WHERE brand_name = ? AND country_code IS NOT NULL
                ORDER BY country_code
            """
            
            cursor.execute(query, [brand_name])
            rows = cursor.fetchall()
            
            countries = [row[0] for row in rows if row[0]]
            logger.info(f"{Colors.GREEN}Retrieved {len(countries)} distinct countries for brand {brand_name}{Colors.RESET}")
            return countries
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_brand_summary(self, brand_name: str) -> List[Dict]:
        """Get summary of prompt configurations for a specific brand"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Get summary by country for the brand
            query = """
                SELECT 
                    country_code,
                    country_name,
                    region_code,
                    region_name,
                    COUNT(*) as total_configs,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_configs,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_configs,
                    MAX(version) as latest_version,
                    MAX(updated_at) as last_updated
                FROM prompt_registry 
                WHERE brand_name = ?
                GROUP BY country_code, country_name, region_code, region_name
                ORDER BY country_code
            """
            
            cursor.execute(query, [brand_name])
            rows = cursor.fetchall()
            
            summary = []
            for row in rows:
                summary.append({
                    "countryCode": row[0],
                    "countryName": row[1],
                    "regionCode": row[2],
                    "regionName": row[3],
                    "totalConfigs": row[4],
                    "activeConfigs": row[5],
                    "inactiveConfigs": row[6],
                    "latestVersion": row[7],
                    "lastUpdated": row[8].isoformat() if row[8] else None
                })
            
            logger.info(f"{Colors.GREEN}Retrieved summary for brand {brand_name} with {len(summary)} countries{Colors.RESET}")
            return summary
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_countries_to_brands_mapping(self) -> Dict[str, List[str]]:
        """Get a mapping of all countries to their brands from prompt registry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT 
                    country_code,
                    brand_name
                FROM prompt_registry 
                WHERE country_code IS NOT NULL AND brand_name IS NOT NULL
                ORDER BY country_code, brand_name
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            # Build the mapping
            country_to_brands = {}
            for row in rows:
                country_code = row[0]
                brand_name = row[1]
                
                if country_code not in country_to_brands:
                    country_to_brands[country_code] = []
                
                if brand_name not in country_to_brands[country_code]:
                    country_to_brands[country_code].append(brand_name)
            
            # Sort the brand lists
            for country in country_to_brands:
                country_to_brands[country].sort()
            
            logger.info(f"{Colors.GREEN}Retrieved countries to brands mapping with {len(country_to_brands)} countries{Colors.RESET}")
            return country_to_brands
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_all_brands(self) -> List[str]:
        """Get list of all distinct brand names"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT brand_name 
                FROM prompt_registry 
                WHERE brand_name IS NOT NULL
                ORDER BY brand_name
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            brands = [row[0] for row in rows if row[0]]
            logger.info(f"{Colors.GREEN}Retrieved {len(brands)} distinct brands{Colors.RESET}")
            return brands
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_all_countries(self) -> List[str]:
        """Get list of all distinct country codes from prompt registry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT country_code 
                FROM prompt_registry 
                WHERE country_code IS NOT NULL
                ORDER BY country_code
            """
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            countries = [row[0] for row in rows if row[0]]
            logger.info(f"{Colors.GREEN}Retrieved {len(countries)} distinct countries{Colors.RESET}")
            return countries
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_registry_stats(self) -> PromptRegistryStatsResponse:
        """Get overall statistics for the prompt registry"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Get overall statistics
            stats_query = """
                SELECT 
                    COUNT(DISTINCT brand_name) as total_brands,
                    COUNT(DISTINCT country_code) as total_countries,
                    COUNT(*) as total_configurations,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_configurations,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_configurations
                FROM prompt_registry
            """
            
            cursor.execute(stats_query)
            stats_row = cursor.fetchone()
            
            # Get list of brands and countries
            brands = await self.get_all_brands()
            countries = await self.get_all_countries()
            
            response = PromptRegistryStatsResponse(
                totalBrands=stats_row[0] or 0,
                totalCountries=stats_row[1] or 0,
                totalConfigurations=stats_row[2] or 0,
                activeConfigurations=stats_row[3] or 0,
                inactiveConfigurations=stats_row[4] or 0,
                brands=brands,
                countries=countries
            )
            
            logger.info(f"{Colors.GREEN}Retrieved prompt registry statistics{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    def safe_parse_json(self, json_string: Optional[str]) -> Optional[Dict[str, Any]]:
        """Safely parse JSON string, return None if parsing fails"""
        if not json_string:
            return None
        
        try:
            return json.loads(json_string)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"{Colors.YELLOW}Failed to parse JSON schema: {str(e)}{Colors.RESET}")
            return None