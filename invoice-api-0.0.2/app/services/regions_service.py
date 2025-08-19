# app/services/regions_service.py
import pyodbc
import os
from typing import Dict, List, Optional
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class RegionsService:
    """Service class for handling regions and countries operations"""
    
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
    
    @log_function_call
    async def get_all_regions(self) -> List[Dict]:
        """Get all regions with their details"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT DISTINCT 
                    region_code,
                    region_name,
                    COUNT(country_code) as country_count
                FROM regions_countries 
                WHERE is_active = 1
                GROUP BY region_code, region_name
                ORDER BY region_code
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            regions = []
            for row in results:
                regions.append({
                    "regionCode": row[0],
                    "regionName": row[1],
                    "countryCount": row[2]
                })
            
            logger.info(f"{Colors.GREEN}Retrieved {len(regions)} regions{Colors.RESET}")
            return regions
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_countries_by_region(self, region_code: str) -> Dict:
        """Get all countries for a specific region"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # First check if region exists
            region_check_query = """
                SELECT DISTINCT region_code, region_name
                FROM regions_countries 
                WHERE region_code = ? AND is_active = 1
            """
            
            cursor.execute(region_check_query, [region_code.upper()])
            region_result = cursor.fetchone()
            
            if not region_result:
                raise HTTPException(status_code=404, detail=f"Region '{region_code}' not found")
            
            # Get countries for the region
            countries_query = """
                SELECT 
                    country_code,
                    country_name
                FROM regions_countries 
                WHERE region_code = ? AND is_active = 1
                ORDER BY country_name
            """
            
            cursor.execute(countries_query, [region_code.upper()])
            country_results = cursor.fetchall()
            
            countries = []
            for row in country_results:
                countries.append({
                    "countryCode": row[0],
                    "countryName": row[1]
                })
            
            response = {
                "regionCode": region_result[0],
                "regionName": region_result[1],
                "countries": countries,
                "totalCountries": len(countries)
            }
            
            logger.info(f"{Colors.GREEN}Retrieved {len(countries)} countries for region {region_code}{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_all_regions_with_countries(self) -> Dict:
        """Get all regions with their countries in a structured format"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    region_code,
                    region_name,
                    country_code,
                    country_name
                FROM regions_countries 
                WHERE is_active = 1
                ORDER BY region_code, country_name
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            # Structure the data
            regions_data = {}
            regions_list = []
            
            for row in results:
                region_code = row[0]
                region_name = row[1]
                country_code = row[2]
                country_name = row[3]
                
                # Add to regions list if not already there
                if region_code not in regions_data:
                    regions_data[region_code] = {
                        "regionCode": region_code,
                        "regionName": region_name,
                        "countries": []
                    }
                    regions_list.append(region_code)
                
                # Add country to region
                regions_data[region_code]["countries"].append({
                    "countryCode": country_code,
                    "countryName": country_name
                })
            
            # Convert to list format
            regions = [regions_data[region_code] for region_code in regions_list]
            
            # Also create a simple mapping format
            simple_mapping = {}
            for region in regions:
                simple_mapping[region["regionCode"]] = [
                    country["countryCode"] for country in region["countries"]
                ]
            
            response = {
                "regions": regions,
                "simpleMapping": simple_mapping,
                "totalRegions": len(regions),
                "totalCountries": sum(len(region["countries"]) for region in regions)
            }
            
            logger.info(f"{Colors.GREEN}Retrieved all regions with countries - {len(regions)} regions, {response['totalCountries']} countries{Colors.RESET}")
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def search_countries(self, search_term: str) -> List[Dict]:
        """Search countries by name or code"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    region_code,
                    region_name,
                    country_code,
                    country_name
                FROM regions_countries 
                WHERE is_active = 1
                AND (
                    country_name LIKE ? 
                    OR country_code LIKE ?
                    OR region_name LIKE ?
                )
                ORDER BY country_name
            """
            
            search_pattern = f"%{search_term}%"
            cursor.execute(query, [search_pattern, search_pattern, search_pattern])
            results = cursor.fetchall()
            
            countries = []
            for row in results:
                countries.append({
                    "regionCode": row[0],
                    "regionName": row[1],
                    "countryCode": row[2],
                    "countryName": row[3]
                })
            
            logger.info(f"{Colors.GREEN}Found {len(countries)} countries matching '{search_term}'{Colors.RESET}")
            return countries
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def get_country_details(self, country_code: str) -> Dict:
        """Get details for a specific country"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    region_code,
                    region_name,
                    country_code,
                    country_name
                FROM regions_countries 
                WHERE country_code = ? AND is_active = 1
            """
            
            cursor.execute(query, [country_code.upper()])
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail=f"Country '{country_code}' not found")
            
            country_details = {
                "regionCode": result[0],
                "regionName": result[1],
                "countryCode": result[2],
                "countryName": result[3]
            }
            
            logger.info(f"{Colors.GREEN}Retrieved details for country {country_code}{Colors.RESET}")
            return country_details
            
        finally:
            cursor.close()
            conn.close()