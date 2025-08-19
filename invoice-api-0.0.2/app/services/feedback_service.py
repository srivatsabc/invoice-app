# app/services/feedback_service.py
import pyodbc
import os
from typing import Optional
from datetime import datetime
from ..models.feedback import BrandFeedback, BrandFeedbackRequest, BrandFeedbackResponse
from ..utils.logging_utils import log_function_call, log_event
from ..middleware.logging import logger, Colors
from fastapi import HTTPException


class FeedbackService:
    """Service class for handling brand feedback database operations"""
    
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
    
    def format_brand_feedback(self, row) -> BrandFeedback:
        """Format database row into BrandFeedback"""
        return BrandFeedback(
            id=row[0],
            regionCode=row[1] or "",
            countryCode=row[2] or "",
            brandName=row[3] or "",
            feedback=row[4],
            rating=row[5],
            category=row[6],
            notes=row[7],
            createdAt=row[8] if row[8] else datetime.now(),
            updatedAt=row[9] if row[9] else datetime.now(),
            createdBy=row[10],
            updatedBy=row[11]
        )
    
    @log_function_call
    async def get_brand_feedback(self, region_code: str, country_code: str, brand_name: str) -> BrandFeedbackResponse:
        """Get feedback for a specific region/country/brand combination"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Query for existing feedback
            query = """
                SELECT 
                    id, region_code, country_code, brand_name, feedback, 
                    rating, category, notes, created_at, updated_at, 
                    created_by, updated_by
                FROM brand_feedback 
                WHERE region_code = ? AND country_code = ? AND brand_name = ?
            """
            
            cursor.execute(query, [region_code.upper(), country_code.upper(), brand_name])
            row = cursor.fetchone()
            
            if row:
                # Format existing feedback
                brand_feedback = self.format_brand_feedback(row)
                
                response = BrandFeedbackResponse(
                    regionCode=brand_feedback.regionCode,
                    countryCode=brand_feedback.countryCode,
                    brandName=brand_feedback.brandName,
                    feedback=brand_feedback.feedback,
                    rating=brand_feedback.rating,
                    category=brand_feedback.category,
                    notes=brand_feedback.notes,
                    hasActiveFeedback=True,
                    lastUpdated=brand_feedback.updatedAt.isoformat() if brand_feedback.updatedAt else None,
                    updatedBy=brand_feedback.updatedBy
                )
                
                logger.info(f"{Colors.GREEN}Retrieved feedback for {region_code}/{country_code}/{brand_name}{Colors.RESET}")
            else:
                # No feedback exists, return empty response
                response = BrandFeedbackResponse(
                    regionCode=region_code.upper(),
                    countryCode=country_code.upper(),
                    brandName=brand_name,
                    feedback=None,
                    rating=None,
                    category=None,
                    notes=None,
                    hasActiveFeedback=False,
                    lastUpdated=None,
                    updatedBy=None
                )
                
                logger.info(f"{Colors.YELLOW}No feedback found for {region_code}/{country_code}/{brand_name}{Colors.RESET}")
            
            return response
            
        finally:
            cursor.close()
            conn.close()
    
    @log_function_call
    async def create_or_update_brand_feedback(self, region_code: str, country_code: str, brand_name: str, 
                                            feedback_request: BrandFeedbackRequest) -> BrandFeedbackResponse:
        """Create new feedback or update existing feedback for a region/country/brand combination"""
        conn = await self.get_connection()
        try:
            cursor = conn.cursor()
            
            # Check if feedback already exists
            existing_query = """
                SELECT id FROM brand_feedback 
                WHERE region_code = ? AND country_code = ? AND brand_name = ?
            """
            cursor.execute(existing_query, [region_code.upper(), country_code.upper(), brand_name.lower()])
            existing_row = cursor.fetchone()
            
            if existing_row:
                # Update existing feedback
                existing_id = existing_row[0]
                
                update_query = """
                    UPDATE brand_feedback 
                    SET 
                        feedback = ?,
                        rating = ?,
                        category = ?,
                        notes = ?,
                        updated_at = GETDATE(),
                        updated_by = ?
                    WHERE id = ?
                """
                
                cursor.execute(update_query, [
                    feedback_request.feedback,
                    feedback_request.rating,
                    feedback_request.category,
                    feedback_request.notes,
                    feedback_request.updatedBy,  # FIXED: Changed from submittedBy
                    existing_id
                ])
                
                logger.info(f"{Colors.GREEN}Updated existing feedback (ID: {existing_id}) for {region_code}/{country_code}/{brand_name.lower()} by {feedback_request.updatedBy}{Colors.RESET}")
                
            else:
                # Create new feedback
                insert_query = """
                    INSERT INTO brand_feedback (
                        region_code, country_code, brand_name, feedback,
                        rating, category, notes, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                
                cursor.execute(insert_query, [
                    region_code.upper(),
                    country_code.upper(),
                    brand_name.lower(),
                    feedback_request.feedback,
                    feedback_request.rating,
                    feedback_request.category,
                    feedback_request.notes,
                    feedback_request.updatedBy,  # FIXED: Changed from submittedBy
                    feedback_request.updatedBy   # FIXED: Changed from submittedBy
                ])
                
                logger.info(f"{Colors.GREEN}Created new feedback for {region_code}/{country_code}/{brand_name} by {feedback_request.updatedBy}{Colors.RESET}")
            
            conn.commit()
            
            # Return the updated feedback
            updated_feedback = await self.get_brand_feedback(region_code, country_code, brand_name)
            return updated_feedback
            
        except Exception as e:
            conn.rollback()
            logger.error(f"{Colors.RED}Error creating/updating brand feedback: {str(e)}{Colors.RESET}")
            raise HTTPException(status_code=500, detail=f"Error processing brand feedback: {str(e)}")
        finally:
            cursor.close()
            conn.close()