from fastapi import APIRouter, HTTPException, Request, Path, Body
from typing import List
import os
from pathlib import Path as FilePath
from pydantic import BaseModel, Field
from ..utils.logging_utils import log_function_call
from ..middleware.logging import logger, Colors

router = APIRouter(
    prefix="/api/v3/invoice-management",
    tags=["prompts"],
    responses={404: {"description": "Not found"}},
)

# Response models
class PromptListResponse(BaseModel):
    prompts: List[str] = Field(..., description="List of available prompt files")

class PromptResponse(BaseModel):
    content: str = Field(..., description="The prompt content")

class CreatePromptRequest(BaseModel):
    content: str = Field(..., description="The prompt content to save")

class CreatePromptResponse(BaseModel):
    message: str = Field(..., description="Success message")
    filename: str = Field(..., description="Created filename")

class PromptVersionsResponse(BaseModel):
    prompt_name: str = Field(..., description="Name of the prompt")
    versions: List[str] = Field(..., description="List of available versions")

class PromptVersionResponse(BaseModel):
    prompt_name: str = Field(..., description="Name of the prompt")
    version: str = Field(..., description="Version of the prompt")
    content: str = Field(..., description="The prompt content")

@router.get("/prompts", response_model=PromptListResponse)
@log_function_call
async def list_prompts(request: Request):
    """
    Get list of available prompt files from the data directory
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Listing available prompts | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store"
        
        if not prompt_dir.exists():
            logger.warning(f"{Colors.YELLOW}Prompt store directory does not exist: {prompt_dir} | Request ID: {request_id}{Colors.RESET}")
            return PromptListResponse(prompts=[])
        
        # Get all .txt files in the prompt_store directory
        prompt_files = []
        for file_path in prompt_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() == '.txt':
                prompt_files.append(file_path.stem)  # Use stem to remove .txt extension
        
        logger.info(f"{Colors.GREEN}Found {len(prompt_files)} prompt files | Request ID: {request_id}{Colors.RESET}")
        return PromptListResponse(prompts=sorted(prompt_files))
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error listing prompts | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error listing prompts: {str(e)}")

@router.get("/prompts/{filename}", response_model=PromptResponse)
@log_function_call
async def get_prompt(
    request: Request,
    filename: str = Path(..., description="Prompt filename without extension", example="system_prompt")
):
    """
    Get content of a specific prompt file
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Getting prompt: {filename} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store"
        file_path = prompt_dir / f"{filename}.txt"  # Add .txt extension
        
        if not file_path.exists():
            logger.warning(f"{Colors.YELLOW}Prompt file not found: {filename} | Request ID: {request_id}{Colors.RESET}")
            raise HTTPException(status_code=404, detail=f"Prompt file {filename} not found")
        
        # Read the file content
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        logger.info(f"{Colors.GREEN}Prompt retrieved successfully: {filename} | Request ID: {request_id}{Colors.RESET}")
        return PromptResponse(content=content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error reading prompt: {filename} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error reading prompt: {str(e)}")

@router.post("/prompts/{filename}", response_model=CreatePromptResponse)
@log_function_call
async def create_prompt(
    request: Request,
    filename: str = Path(..., description="Prompt filename without extension", example="my_prompt"),
    prompt_data: CreatePromptRequest = Body(..., description="Prompt content")
):
    """
    Create a new prompt file with the given content
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Creating prompt: {filename} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store"
        
        # Create directory if it doesn't exist
        prompt_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = prompt_dir / f"{filename}.txt"
        
        # Write the content to the file
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(prompt_data.content)
        
        logger.info(f"{Colors.GREEN}Prompt created successfully: {filename}.txt | Request ID: {request_id}{Colors.RESET}")
        return CreatePromptResponse(
            message=f"Prompt '{filename}' created successfully",
            filename=f"{filename}.txt"
        )
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error creating prompt: {filename} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error creating prompt: {str(e)}")

@router.get("/prompt-versions", response_model=List[PromptVersionsResponse])
@log_function_call
async def get_prompt_versions(request: Request):
    """
    Get list of prompt names and their available versions
    
    Returns a list of prompt names with their available versions from the versioned folder structure.
    Each prompt can have multiple versions stored in separate folders.
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Getting prompt versions | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store"
        
        if not prompt_dir.exists():
            logger.warning(f"{Colors.YELLOW}Prompt store directory does not exist: {prompt_dir} | Request ID: {request_id}{Colors.RESET}")
            return []
        
        prompt_versions = []
        
        # Look for subdirectories (prompt names)
        for prompt_folder in prompt_dir.iterdir():
            if prompt_folder.is_dir():
                prompt_name = prompt_folder.name
                versions = []
                
                # Look for .txt files in each prompt folder (versions)
                for version_file in prompt_folder.iterdir():
                    if version_file.is_file() and version_file.suffix.lower() == '.txt':
                        versions.append(version_file.stem)  # Remove .txt extension
                
                if versions:  # Only include prompts that have versions
                    prompt_versions.append(PromptVersionsResponse(
                        prompt_name=prompt_name,
                        versions=sorted(versions)
                    ))
        
        logger.info(f"{Colors.GREEN}Found {len(prompt_versions)} prompts with versions | Request ID: {request_id}{Colors.RESET}")
        return prompt_versions
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error getting prompt versions | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error getting prompt versions: {str(e)}")

@router.get("/prompt-versions/{prompt_name}/{version}", response_model=PromptVersionResponse)
@log_function_call
async def get_prompt_version(
    request: Request,
    prompt_name: str = Path(..., description="Name of the prompt", example="system_prompt"),
    version: str = Path(..., description="Version of the prompt", example="v1")
):
    """
    Get content of a specific prompt version
    
    Retrieves the content of a specific version of a prompt from the versioned folder structure.
    The prompt is stored as: data/prompt_store/{prompt_name}/{version}.txt
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Getting prompt version: {prompt_name}/{version} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store"
        file_path = prompt_dir / prompt_name / f"{version}.txt"
        
        if not file_path.exists():
            logger.warning(f"{Colors.YELLOW}Prompt version not found: {prompt_name}/{version} | Request ID: {request_id}{Colors.RESET}")
            raise HTTPException(status_code=404, detail=f"Prompt version {prompt_name}/{version} not found")
        
        # Read the file content
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        
        logger.info(f"{Colors.GREEN}Prompt version retrieved successfully: {prompt_name}/{version} | Request ID: {request_id}{Colors.RESET}")
        return PromptVersionResponse(
            prompt_name=prompt_name,
            version=version,
            content=content
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"{Colors.RED}Error reading prompt version: {prompt_name}/{version} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error reading prompt version: {str(e)}")

@router.post("/prompt-versions/{prompt_name}/{version}", response_model=CreatePromptResponse)
@log_function_call
async def create_prompt_version(
    request: Request,
    prompt_name: str = Path(..., description="Name of the prompt", example="system_prompt"),
    version: str = Path(..., description="Version of the prompt", example="v1"),
    prompt_data: CreatePromptRequest = Body(..., description="Prompt content")
):
    """
    Create a new version of a prompt
    
    Creates a new version of a prompt in the versioned folder structure.
    The prompt will be stored as: data/prompt_store/{prompt_name}/{version}.txt
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"{Colors.BLUE}Creating prompt version: {prompt_name}/{version} | Request ID: {request_id}{Colors.RESET}")
    
    try:
        prompt_dir = FilePath(__file__).parent.parent / "data" / "prompt_store" / prompt_name
        
        # Create directory structure if it doesn't exist
        prompt_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = prompt_dir / f"{version}.txt"
        
        # Write the content to the file
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(prompt_data.content)
        
        logger.info(f"{Colors.GREEN}Prompt version created successfully: {prompt_name}/{version}.txt | Request ID: {request_id}{Colors.RESET}")
        return CreatePromptResponse(
            message=f"Prompt version '{prompt_name}/{version}' created successfully",
            filename=f"{prompt_name}/{version}.txt"
        )
        
    except Exception as e:
        logger.error(f"{Colors.RED}Error creating prompt version: {prompt_name}/{version} | Request ID: {request_id} | Error: {str(e)}{Colors.RESET}")
        raise HTTPException(status_code=500, detail=f"Error creating prompt version: {str(e)}")
    

    