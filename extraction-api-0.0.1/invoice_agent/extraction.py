
import os
import json
import logging
import sys
import traceback
import base64
from datetime import datetime
import uuid
from typing import Dict, List, Any, Optional, Literal, TypedDict, Union
import PyPDF2
import io
import re

from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.errors import GraphInterrupt

# Import langchain components
from langchain_openai import AzureChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

from jsonschema_pydantic import jsonschema_to_pydantic

# Import agent logger
from invoice_agent.agent_logger import agent_logger

# Initialize db
from invoice_agent.db import SimpleInvoiceInserter, transform_invoice_json
inserter = SimpleInvoiceInserter(os.getenv("DBConnectionStringGwh"))

def log_blue(msg):
    agent_logger.log_blue(msg)

def log_green(msg):
    agent_logger.log_green(msg)

def log_yellow(msg):
    agent_logger.log_yellow(msg)

def log_red(msg):
    agent_logger.log_red(msg)

def log_cyan(msg):
    agent_logger.log_cyan(msg)

# File storage settings
INVOICE_STORE = "invoice_store"  # Adjust this path as needed

# Initialize LLM
llm = AzureChatOpenAI(
    temperature=0,
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version="2024-12-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    model="gpt-4o-2"
)

vision_llm = AzureChatOpenAI(
    temperature=0,
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version="2024-12-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    model="gpt-4o-2"
)

# vision_llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

class AgentState(TypedDict, total=False):
    # Input
    id: str
    input: str
    
    # Parsed data
    invoice_path: str
    supplier_name: str
    brand_name: str
    invoice_data: Dict[str, Any]
    invoice_collections: Dict[str, Any]
    all_invoices: List[Dict[str, Any]]
    invoice_schema: str
    
    # Address information
    supplier_address: str
    buyer_address: str
    ship_to_address: str
    supplier_country_code: str
    buyer_country_code: str
    ship_to_country_code: str
    region: str
    
    # Processing state
    status: str
    error: Optional[str]
    output: Optional[Dict[str, Any]]
    processing_method: str  # "text" or "image"
    processing_level: str
    processing_max_pages: int
    extraction_method: str  # Track which method was used for extraction
    pages: str  # "all", "first", or specific pages like "1,3,5-7"
    
    # Thread tracking
    thread_id: str


def parse_message(state: AgentState) -> Command[Literal["identify_supplier", "handle_error"]]:
    """Parse the incoming message and determine processing method."""
    log_blue(f"Parsing message")
    
    try:
        # Parse the message to get the invoice path
        message_data = json.loads(state["input"])
        
        # Extract the invoice path from the message
        invoice_path = message_data.get("invoice_path")
        if not invoice_path:
            error_msg = "Missing invoice_path in message"
            log_red(error_msg)
            return Command(
                update={
                    "status": "error", 
                    "error": error_msg,
                },
                goto="handle_error"
            )
        
        # Check if the processing method is specified
        processing_method = message_data.get("processing_method", "text")  # Default to text processing
        
        # Get pages to process
        pages = message_data.get("pages", "all")  # Default to all pages
        
        # NEW: Check if maximum pages per batch is specified
        processing_max_pages = message_data.get("processing_max_pages", 0)  # Default to 0 (no limit)
        if not isinstance(processing_max_pages, int) or processing_max_pages < 0:
            log_yellow(f"Invalid processing_max_pages '{processing_max_pages}', defaulting to 0 (no limit)")
            processing_max_pages = 0
        else:
            log_blue(f"Maximum pages per batch: {processing_max_pages}")
        
        # Check if processing level is specified (page or invoice)
        processing_level = message_data.get("processing_level", "page")  # Default to page-by-page processing
        if processing_level not in ["page", "invoice"]:
            log_yellow(f"Invalid processing_level '{processing_level}', defaulting to 'page'")
            processing_level = "page"
        
        log_blue(f"Successfully parsed JSON message: {json.dumps(message_data, indent=2)}")
        log_blue(f"Using processing method: {processing_method}")
        log_blue(f"Pages to process: {pages}")
        log_blue(f"Processing level: {processing_level}")
        
        # Return command with state update and next node
        return Command(
            update={
                "invoice_path": invoice_path, 
                "processing_method": processing_method,
                "pages": pages,
                "processing_level": processing_level,
                "processing_max_pages": processing_max_pages,  # NEW: Add processing_max_pages to state
                "status": "parsed"
            },
            goto="identify_supplier"
        )
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse JSON message: {str(e)}"
        log_red(error_msg)
        
        # Return command with error state update
        return Command(
            update={
                "status": "error", 
                "error": error_msg
            },
            goto="handle_error"
        )


def identify_supplier(state: AgentState) -> Command[Literal["extract_country_codes", "handle_error"]]:
    """Extract the supplier name and addresses from the invoice."""
    if state.get("status") == "error":
        return Command(goto="handle_error")
    
    try:
        # Get the invoice path from the message
        invoice_path = state.get("invoice_path")
        if not invoice_path:
            error_msg = "Missing invoice_path in state"
            log_red(error_msg)
            return Command(
                update={
                    "status": "error", 
                    "error": error_msg
                },
                goto="handle_error"
            )
        
        log_cyan(f"Extracting supplier from invoice: {invoice_path}")
        
        # Create a Pydantic model for supplier and address extraction
        supplier_schema = {
            "title": "SupplierInfo",
            "type": "object",
            "properties": {
                "supplier_name": {
                    "title": "SupplierName",
                    "description": "Name of the supplier or vendor on the invoice",
                    "type": "string"
                },
                "brand_name": {
                    "title": "BrandName",
                    "description": "From the invoice, extract the company's commonly used brand name or public-facing name, prioritizing names in the logo or header; just return the first name if this is a two worded brand name; if only the legal name is present, return it. E.g., 'Apple Inc.' → 'Apple', 'Tata Consultancy Services Limited' → 'TCS', 'PROQUAL MANAGEMENT INSTITUTE – B.T. GREBER SPÓŁKA JAWNA' → 'Proqual'. Return in title case only.",
                    "type": "string"
                },
                "supplier_address": {
                    "title": "SupplierAddress",
                    "description": "Complete address of the supplier or vendor, including street, city, state/province, postal code and country",
                    "type": "string"
                },
                "buyer_address": {
                    "title": "BuyerAddress",
                    "description": "Complete address of the buyer, including street, city, state/province, postal code and country",
                    "type": "string"
                },
                "ship_to_address": {
                    "title": "ShipToAddress",
                    "description": "Complete ship-to address if different from buyer address, including street, city, state/province, postal code and country",
                    "type": "string"
                }
            },
            "required": [
                "supplier_name",
                "brand_name",
                "supplier_address"
            ]
        }
        
        SupplierModel = jsonschema_to_pydantic(supplier_schema)
        log_green("Successfully created Pydantic model for supplier extraction")
        
        # Determine processing method based on file extension and requested method
        file_ext = os.path.splitext(invoice_path)[1].lower()
        processing_method = state.get("processing_method")
        
        # Check if it's an image file or if image processing is explicitly requested
        is_image = file_ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif']
        is_pdf = file_ext in ['.pdf']
        use_vision = is_image or (is_pdf and processing_method == "image")
        
        if use_vision:
            log_cyan(f"Using vision capabilities to identify supplier and addresses")
            
            # Load the image or convert PDF to image
            full_path = os.path.join(INVOICE_STORE, invoice_path)
            log_blue(f"Reading file from: {full_path}")
            
            with open(full_path, "rb") as file:
                file_bytes = file.read()
                
                # Convert PDF to image if necessary
                if is_pdf:
                    try:
                        from pdf2image import convert_from_bytes
                        log_blue("Converting first page of PDF to image for vision processing")
                        images = convert_from_bytes(file_bytes, first_page=1, last_page=1)
                        if images:
                            # Convert PIL image to bytes
                            img_byte_arr = io.BytesIO()
                            images[0].save(img_byte_arr, format='PNG')
                            file_bytes = img_byte_arr.getvalue()
                        else:
                            raise Exception("Failed to convert PDF to image")
                    except ImportError:
                        log_yellow("pdf2image package not available. Falling back to text extraction for PDF.")
                        use_vision = False
                
                if use_vision:
                    # Encode to base64 for vision model
                    base64_image = base64.b64encode(file_bytes).decode("utf-8")
                    
                    # Create system prompt
                    system_prompt = f"""You are an expert invoice data extraction AI. 
                    Analyze the invoice image and extract the following information according to the specifications:

                    1. Supplier Name: The full legal name of the supplier or vendor as it appears on the invoice.
                    2. Brand Name: The company's commonly used brand name or public-facing name, prioritizing names in the logo or header.
                       - For example: 'Apple Inc.' → 'Apple', 'Tata Consultancy Services Limited' → 'TCS'
                       - For 'PROQUAL MANAGEMENT INSTITUTE – B.T. GREBER SPÓŁKA JAWNA' → 'Proqual'
                       - Just return the first name if this is a two-worded brand name
                       - If only the legal name is present, return it
                       - Return the brand name in title case only
                    3. Supplier Address: The complete address of the supplier, including street, city, state/province, postal code and country
                    4. Buyer Address: The complete address of the buyer, including street, city, state/province, postal code and country
                    5. Ship-to Address: The complete ship-to address if different from buyer address

                    Format your response as a valid JSON object with the following keys:
                    {{"supplier_name": "FULL LEGAL NAME", "brand_name": "Brand", "supplier_address": "COMPLETE ADDRESS", "buyer_address": "COMPLETE ADDRESS", "ship_to_address": "COMPLETE ADDRESS"}}
                    
                    If any address is not found, include an empty string for that field."""
                    
                    # Create message with image
                    messages = [
                        SystemMessage(content=system_prompt),
                        HumanMessage(
                            content=[
                                {"type": "text", "text": "Extract the supplier name, brand name, and addresses from this invoice."},
                                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                            ]
                        )
                    ]
                    
                    # Get response
                    log_blue("Sending image to GPT-4o Vision")
                    vision_response = vision_llm.invoke(messages)
                    log_blue("Received response from GPT-4o Vision")
                    
                    # Process the response
                    vision_text = vision_response.content
                    
                    # Extract JSON from the response
                    import re
                    json_match = re.search(r'{.*}', vision_text, re.DOTALL)
                    
                    if json_match:
                        try:
                            supplier_info_dict = json.loads(json_match.group(0))
                            supplier_name = supplier_info_dict.get("supplier_name", "")
                            brand_name = supplier_info_dict.get("brand_name", "")
                            supplier_address = supplier_info_dict.get("supplier_address", "")
                            buyer_address = supplier_info_dict.get("buyer_address", "")
                            ship_to_address = supplier_info_dict.get("ship_to_address", "")
                            
                            log_green(f"\nSuccessfully extracted supplier name: {supplier_name}")
                            log_green(f"\nBrand name: {brand_name}")
                            log_green(f"\nSupplier address: {supplier_address}")
                            log_green(f"\nBuyer address: {buyer_address}")
                            log_green(f"\nShip-to address: {ship_to_address}")
                            
                            # Return command with updated state
                            next_node = "extract_country_codes"
                            return Command(
                                update={
                                    "supplier_name": supplier_name,
                                    "brand_name": brand_name,
                                    "supplier_address": supplier_address,
                                    "buyer_address": buyer_address,
                                    "ship_to_address": ship_to_address,
                                    "status": "supplier_extracted",
                                    "extraction_method": "vision"
                                },
                                goto=next_node
                            )
                        except json.JSONDecodeError:
                            log_yellow("Failed to parse JSON from vision response, falling back to text extraction")
                            use_vision = False
                    else:
                        log_yellow("No JSON found in vision response, falling back to text extraction")
                        use_vision = False
        
        # If vision processing failed or wasn't used, fall back to text extraction for PDFs
        if not use_vision and is_pdf:
            # Extract text from PDF
            full_path = os.path.join(INVOICE_STORE, invoice_path)
            log_blue(f"Reading PDF from: {full_path}")
            
            with open(full_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                pdf_text = ""
                
                # Extract text from all pages
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    pdf_text += page.extract_text()
                
                log_blue(f"Successfully extracted {len(pdf_text)} characters from PDF")
            
            # Use LLM with structured output to extract supplier name
            log_cyan(f"Using LLM to extract supplier name and addresses")
            
            structured_llm = llm.with_structured_output(SupplierModel)
            
            extraction_prompt = """
            You are a data extraction specialist. Extract the supplier information and addresses from this invoice document.
            
            Document Text:
            {pdf_text}
            
            Extract the following information and return them in the required format:
            1. Supplier Name: The full legal name of the supplier
            2. Brand Name: The brand name of the supplier (common or shortened name used for branding)
            3. Supplier Address: Complete address of the supplier 
            4. Buyer Address: Complete address of the buyer/customer
            5. Ship-to Address: Complete ship-to address if present and different from buyer address
            """
            
            supplier_info = structured_llm.invoke(
                extraction_prompt.format(pdf_text=pdf_text)
            )
            
            # Convert Pydantic model to dictionary for the state
            supplier_name = supplier_info.supplier_name
            brand_name = supplier_info.brand_name
            supplier_address = supplier_info.supplier_address
            buyer_address = getattr(supplier_info, 'buyer_address', '')
            ship_to_address = getattr(supplier_info, 'ship_to_address', '')
            
            log_green(f"\nSuccessfully extracted supplier name: {supplier_name}")
            log_green(f"\nBrand name: {brand_name}")
            log_green(f"\nSupplier address: {supplier_address}")
            log_green(f"\nBuyer address: {buyer_address}")
            log_green(f"\nShip-to address: {ship_to_address}")
            
            # Return command with updated state
            next_node = "extract_country_codes"
            return Command(
                update={
                    "supplier_name": supplier_name,
                    "brand_name": brand_name,
                    "supplier_address": supplier_address,
                    "buyer_address": buyer_address,
                    "ship_to_address": ship_to_address,
                    "status": "supplier_extracted",
                    "extraction_method": "text"
                },
                goto=next_node
            )
        elif not use_vision and not is_pdf:
            error_msg = f"Unsupported file format for text extraction: {invoice_path}"
            log_red(error_msg)
            return Command(
                update={
                    "status": "error", 
                    "error": error_msg
                },
                goto="handle_error"
            )
            
    except Exception as e:
        error_msg = f"Error extracting supplier information: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={
                "status": "error", 
                "error": error_msg
            },
            goto="handle_error"
        )


from pydantic import BaseModel, Field
from typing import Optional

class CountryCodeAndRegion(BaseModel):
    """Model for extracting country codes and determining regions"""
    supplier_country_code: Optional[str] = Field(
        description="ISO 3166-1 alpha-2 country code for supplier address (e.g., US, GB, DE, IN)"
    )
    buyer_country_code: Optional[str] = Field(
        description="ISO 3166-1 alpha-2 country code for buyer address (e.g., US, GB, DE, IN)"
    )
    ship_to_country_code: Optional[str] = Field(
        description="ISO 3166-1 alpha-2 country code for ship-to address (e.g., US, GB, DE, IN)"
    )
    region: str = Field(
        description="Geographic region based on supplier country: 'NA' for North America (US, CA, MX), 'EMEA' for Europe/Middle East/Africa, 'APAC' for Asia-Pacific, 'LATAM' for Latin America"
    )


def extract_country_codes(state: AgentState) -> Command[Literal["extract_invoice_data", "extract_invoice_data_image", "handle_error"]]:
    """Extract country codes and determine region from addresses."""
    if state.get("status") == "error":
        return Command(goto="handle_error")
    
    try:
        supplier_address = state.get("supplier_address", "")
        buyer_address = state.get("buyer_address", "")
        ship_to_address = state.get("ship_to_address", "")
        extraction_method = state.get("extraction_method", "")
        
        log_cyan("Extracting country codes and determining region from addresses")
        
        # Create structured LLM for country code and region extraction
        structured_llm = llm.with_structured_output(CountryCodeAndRegion)
        
        # Template for country code and region extraction
        template = """You are an expert in geography and global addressing standards. 
        Analyze the following addresses and extract ISO 3166-1 alpha-2 country codes (two letters) 
        and determine the geographic region based on the supplier country.

        Supplier Address: {supplier_address}
        Buyer Address: {buyer_address}
        Ship-to Address: {ship_to_address}

        For country codes, return ONLY the two-letter country code in uppercase (e.g., US, GB, DE, IN). 
        If a country cannot be determined with certainty, return XX for that address.

        For region determination, use the supplier country and apply these rules:
        - NA (North America): US, CA, MX, and other North American countries
        - EMEA (Europe, Middle East, Africa): All European countries (GB, DE, FR, IT, ES, NL, etc.), 
          Middle Eastern countries (AE, SA, etc.), and African countries
        - APAC (Asia-Pacific): Asian countries (CN, JP, IN, SG, KR, TH, etc.), 
          Pacific countries (AU, NZ, etc.)
        - LATAM (Latin America): South and Central American countries (BR, AR, CL, CO, PE, etc.), 
          except Mexico which is in NA
        
        Examples:
        - US supplier = NA region
        - GB supplier = EMEA region  
        - DE supplier = EMEA region
        - CN supplier = APAC region
        - IN supplier = APAC region
        - BR supplier = LATAM region
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | structured_llm
        
        log_blue("Processing all addresses and determining region in single LLM call")
        
        try:
            result = chain.invoke({
                "supplier_address": supplier_address or "Not provided",
                "buyer_address": buyer_address or "Not provided", 
                "ship_to_address": ship_to_address or "Not provided"
            })
            
            # Extract results
            supplier_country_code = result.supplier_country_code if result.supplier_country_code != "XX" else None
            buyer_country_code = result.buyer_country_code if result.buyer_country_code != "XX" else None
            ship_to_country_code = result.ship_to_country_code if result.ship_to_country_code != "XX" else None
            region = result.region
            
            log_green(f"Extracted supplier country code: {supplier_country_code}")
            log_green(f"Extracted buyer country code: {buyer_country_code}")
            log_green(f"Extracted ship-to country code: {ship_to_country_code}")
            log_green(f"Determined region: {region}")

            try:               
                # Get transaction ID from state
                header_id = state.get("id") or state.get("thread_id")
                
                success = inserter.insert_initial_header(
                    header_id=header_id,
                    supplier_name=state.get("supplier_name", ""),
                    brand_name=state.get("brand_name", ""),
                    supplier_details=supplier_address or "",
                    buyer_details=buyer_address or "",
                    ship_to_details=ship_to_address or "",
                    supplier_country_code=supplier_country_code,
                    buyer_country_code=buyer_country_code,
                    ship_to_country_code=ship_to_country_code,
                    region=region,
                    extraction_method=extraction_method,
                    processing_method=state.get("processing_method", ""),
                    status="Received"
                )
                
                if success:
                    log_green(f"Inserted initial header with status 'received' for ID: {header_id}")
                else:
                    log_yellow(f"Failed to insert initial header for ID: {header_id}")
                    
            except Exception as db_error:
                log_yellow(f"Error inserting initial header: {str(db_error)}")
                # Don't fail the whole process for DB errors
            
        except Exception as e:
            log_yellow(f"Error in structured extraction: {str(e)}")
            # Fallback to manual region determination if LLM fails
            supplier_country_code = None
            buyer_country_code = None
            ship_to_country_code = None
            region = "UNKNOWN"
            
            # Try to extract at least supplier country for region determination
            if supplier_address:
                try:
                    simple_prompt = f"Extract only the ISO 3166-1 alpha-2 country code from this address: {supplier_address}. Return only the two-letter code in uppercase."
                    simple_chain = ChatPromptTemplate.from_template("{address}") | llm | StrOutputParser()
                    supplier_country_code = simple_chain.invoke({"address": simple_prompt}).strip()
                    
                    # Manual region mapping as fallback
                    if supplier_country_code:
                        region = determine_region_fallback(supplier_country_code)
                        log_blue(f"Fallback region determination: {region}")
                        
                except Exception as fallback_error:
                    log_yellow(f"Fallback extraction also failed: {str(fallback_error)}")
        
        # Update state with country codes and region
        update_dict = {
            "supplier_country_code": supplier_country_code,
            "buyer_country_code": buyer_country_code,
            "ship_to_country_code": ship_to_country_code,
            "region": region,
            "status": "country_codes_extracted"
        }
        
        # Determine next node based on extraction method
        next_node = "extract_invoice_data_image" if extraction_method == "vision" else "extract_invoice_data"
        
        return Command(
            update=update_dict,
            goto=next_node
        )
        
    except Exception as e:
        error_msg = f"Error extracting country codes and region: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={
                "status": "error", 
                "error": error_msg
            },
            goto="handle_error"
        )

def determine_region_fallback(country_code: str) -> str:
    """Fallback function to determine region from country code"""
    if not country_code:
        return "UNKNOWN"
    
    country_code = country_code.upper()
    
    # North America
    na_countries = {"US", "CA", "MX"}
    
    # EMEA (Europe, Middle East, Africa)
    emea_countries = {
        # Europe
        "GB", "DE", "FR", "IT", "ES", "NL", "BE", "CH", "AT", "SE", "NO", "DK", 
        "FI", "IE", "PT", "GR", "PL", "CZ", "HU", "SK", "SI", "HR", "BG", "RO", 
        "EE", "LV", "LT", "CY", "MT", "LU", "IS", "LI", "MC", "SM", "VA", "AD",
        "AL", "BA", "MK", "ME", "RS", "XK", "MD", "UA", "BY", "RU",
        # Middle East
        "AE", "SA", "QA", "KW", "BH", "OM", "JO", "LB", "SY", "IQ", "IR", "IL", "PS", "TR", "CY",
        # Africa
        "ZA", "EG", "NG", "KE", "MA", "TN", "DZ", "LY", "SD", "ET", "UG", "TZ", "GH", "MZ", "MG",
        "CM", "CI", "NE", "BF", "ML", "MW", "ZM", "ZW", "BW", "NA", "SZ", "LS", "GA", "GQ", "ST",
        "CV", "GM", "GW", "SL", "LR", "GN", "SN", "MR", "TD", "CF", "CG", "CD", "AO", "DJ", "SO", "ER"
    }
    
    # APAC (Asia-Pacific)
    apac_countries = {
        # Asia
        "CN", "JP", "IN", "KR", "TH", "SG", "MY", "ID", "PH", "VN", "TW", "HK", "MO", 
        "KH", "LA", "MM", "BN", "TL", "MN", "KP", "AF", "PK", "BD", "LK", "MV", "NP", "BT",
        "KZ", "KG", "TJ", "TM", "UZ", "AM", "AZ", "GE",
        # Pacific
        "AU", "NZ", "PG", "FJ", "SB", "VU", "NC", "PF", "WS", "TO", "KI", "TV", "NR", "PW", 
        "FM", "MH", "CK", "NU", "TK", "AS", "GU", "MP", "VI", "PR"
    }
    
    # LATAM (Latin America) - excluding Mexico which is in NA
    latam_countries = {
        "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "UY", "PY", "GY", "SR", "GF",
        "GT", "BZ", "SV", "HN", "NI", "CR", "PA", "CU", "JM", "HT", "DO", "TT", "BB",
        "GD", "VC", "LC", "DM", "AG", "KN", "BS", "BM"
    }
    
    if country_code in na_countries:
        return "NA"
    elif country_code in emea_countries:
        return "EMEA" 
    elif country_code in apac_countries:
        return "APAC"
    elif country_code in latam_countries:
        return "LATAM"
    else:
        return "UNKNOWN"


def clean_numeric_values(data_dict):
    """
    Clean numerical values in the data dictionary while properly handling regional number formats:
    1. Extract and store currency symbols/codes
    2. Correctly interpret European number format (space as thousands, comma as decimal)
    3. Handle US/UK format (comma as thousands, period as decimal)
    
    Args:
        data_dict: Dictionary containing extracted invoice data
        
    Returns:
        Dictionary with cleaned numerical values and preserved currency
    """
    import re
    
    # Function to detect format and extract currency
    def parse_monetary_value(value):
        if not isinstance(value, str):
            return value, None
            
        # Return early if not a numeric string
        if not re.search(r'[\d.,\s]', value):
            return value, None
        
        # Remove any extra whitespace
        value = value.strip()
        
        # Extract currency symbol or code
        currency = None
        currency_pattern = r'([$€£¥]|[A-Z]{3})'
        currency_match = re.search(currency_pattern, value)
        if currency_match:
            currency = currency_match.group(0)
        
        # Remove currency symbols and codes
        cleaned = re.sub(currency_pattern, '', value).strip()
        
        # Case 1: Has both comma and period - assume US/UK format (5,123.45)
        if ',' in cleaned and '.' in cleaned:
            # US/UK format: remove comma, keep period
            cleaned = cleaned.replace(',', '')
            try:
                return float(cleaned), currency
            except ValueError:
                return value, currency
                
        # Case 2: Has space and comma but no period - assume European format (5 123,45)
        elif ' ' in cleaned and ',' in cleaned and '.' not in cleaned:
            # European format: remove space, replace comma with period
            cleaned = cleaned.replace(' ', '').replace(',', '.')
            try:
                return float(cleaned), currency
            except ValueError:
                return value, currency
                
        # Case 3: Has comma but no period or space - likely European decimal (123,45)
        elif ',' in cleaned and '.' not in cleaned and ' ' not in cleaned:
            # Likely European decimal format
            cleaned = cleaned.replace(',', '.')
            try:
                return float(cleaned), currency
            except ValueError:
                return value, currency
                
        # Case 4: Has period but no comma - standard decimal (123.45)
        elif '.' in cleaned and ',' not in cleaned:
            # Standard decimal format, no change needed
            try:
                return float(cleaned), currency
            except ValueError:
                return value, currency
                
        # Case 5: Has space but no comma or period - likely European thousands (5 123)
        elif ' ' in cleaned and ',' not in cleaned and '.' not in cleaned:
            # European thousands format, remove spaces
            cleaned = cleaned.replace(' ', '')
            try:
                return int(cleaned), currency
            except ValueError:
                return value, currency
        
        # Case 6: No special characters - just a number
        else:
            try:
                # Check if it's an integer or needs to be a float
                if '.' in cleaned:
                    return float(cleaned), currency
                else:
                    return int(cleaned), currency
            except ValueError:
                return value, currency
    
    # Create a copy to avoid modifying the original
    result = data_dict.copy()
    
    # Process numeric fields known to need cleaning
    for field in ['subtotal', 'tax', 'total']:
        if field in result and isinstance(result[field], str):
            result[field], currency = parse_monetary_value(result[field])
            # If currency is detected and not already in the result, add it
            if currency and ('currency' not in result or not result['currency']):
                result['currency'] = currency
    
    # Process line items if present
    if 'line_items' in result and isinstance(result['line_items'], list):
        for i, item in enumerate(result['line_items']):
            if isinstance(item, dict):
                for field in ['quantity', 'unit_price', 'amount']:
                    if field in item and isinstance(item[field], str):
                        result['line_items'][i][field], item_currency = parse_monetary_value(item[field])
                        # If currency is detected from line items and not already set, add it
                        if item_currency and ('currency' not in result or not result['currency']):
                            result['currency'] = item_currency
    
    return result


def process_page_batch(pdf_reader, invoice_number, page_nums, invoice_collections, supplier_instructions, brand_name, structured_llm, is_batch=False, batch_num=1, total_batches=1):
    """Process a batch of pages for a single invoice."""
    
    log_blue(f"Processing batch {batch_num}/{total_batches} with {len(page_nums)} pages for invoice {invoice_number}")
    
    # Combine text from this batch of pages
    combined_text = ""
    for page_num_str in page_nums:
        page_num = int(page_num_str)
        page_idx = page_num - 1  # Convert to 0-based index
        
        if page_idx < len(pdf_reader.pages):
            page = pdf_reader.pages[page_idx]
            page_text = page.extract_text()
            
            # Add page separator and number
            combined_text += f"\n\n--- PAGE {page_num} ---\n\n{page_text}"
            
            # Store each page's text in page_data for reference
            if page_num_str not in invoice_collections[invoice_number]["page_data"]:
                invoice_collections[invoice_number]["page_data"][page_num_str] = {
                    "text": page_text,
                    "is_last_page": page_num_str == page_nums[-1] and batch_num == total_batches,
                    "is_multi_page": True,  # If we're batching, it's definitely multi-page
                    "batch_num": batch_num,
                    "batch_total": total_batches
                }
    
    log_blue(f"Combined text from {len(page_nums)} pages for invoice {invoice_number} (batch {batch_num})")
    
    # Create extraction prompt for this batch of pages
    batch_info = f"BATCH {batch_num} OF {total_batches}" if is_batch else ""
    
    base_extraction_prompt = f"""
    You are a data extraction specialist for {brand_name} invoices. 

    Your task is to extract ALL information from invoice number {invoice_number}.
    The text below contains PAGES {page_nums} of this invoice combined. {batch_info}
    Each page is marked with "--- PAGE X ---" to help you understand page boundaries.

    IMPORTANT INSTRUCTIONS:
    1. FOCUS ONLY on invoice number {invoice_number}
    2. Extract ALL line items visible in THESE PAGES - this is critical
    3. Pay special attention to identify surcharges, fees, or additional charges even if they don't have the same format as main line items
    4. Include EVERY SINGLE line item, surcharge, or additional fee visible in these pages
    5. Do not include line items from other invoices
    6. Extract all header information (dates, customer info, totals, etc.)
    7. Be thorough and precise in your extraction
    8. If you see a quantity surcharge, service fee, or any other additional charge, include it as a separate line item even if it doesn't have a line number
    9. Check whether the line item includes both a unit price and a total amount. Some line items may not have a charge — these are often minor additives or components that accompany a primary item. In such cases, ensure they are still recognized, but do not assign a unit price or amount unless explicitly stated.
    10. Look specifically for fields like: "Items Total", "Total Amount Due", "Output Tax", "Total Amount" which represent the FINAL invoice totals
    11. If this is the last batch, the financial totals are likely to be in these pages
    12. If you see any numeric totals that appear to be for the entire invoice, prioritize extracting them
    13. Look for fields with labels like "subtotal", "tax", "total", "items total", or "total amount due"
    14. Assign each line item to the page where it appears by including a "_source_page" field in each line item with the page number
    15. For each distinct part number and quantity combination, create a separate line item entry
    """
    
    # Add batch-specific instructions
    if is_batch and total_batches > 1:
        if batch_num == 1:
            base_extraction_prompt += """
            16. This is the FIRST BATCH of pages. Focus on extracting good header information but understand 
                that totals and financial details may be on later pages.
            """
        elif batch_num == total_batches:
            base_extraction_prompt += """
            16. This is the FINAL BATCH of pages. Pay special attention to extracting totals, taxes,
                and any financial summary information that typically appears at the end of an invoice.
            """
        else:
            base_extraction_prompt += """
            16. This is an INTERMEDIATE BATCH of pages. Focus on extracting line items accurately 
                and any header information that wasn't in earlier pages.
            """
    
    # Add supplier-specific instructions if available
    if supplier_instructions:
        extraction_prompt = f"""
        {base_extraction_prompt}
        
        SUPPLIER-SPECIFIC INSTRUCTIONS:
        {supplier_instructions}

        TEXT CONTENT:
        {combined_text}
        
        Return the complete invoice data in a structured format.
        """
    else:
        extraction_prompt = f"""
        {base_extraction_prompt}

        TEXT CONTENT:
        {combined_text}
        
        Return the complete invoice data in a structured format.
        """
    
    # Use structured LLM
    is_final_batch = batch_num == total_batches
    log_blue(f"Sending batch {batch_num}/{total_batches} for invoice {invoice_number} to LLM" + 
            (f" (FINAL BATCH)" if is_final_batch else ""))
    
    try:
        invoice_data = structured_llm.invoke(extraction_prompt)
        log_blue(f"Received structured response from LLM for batch {batch_num}")
        
        # Convert to dictionary
        invoice_data_dict = invoice_data.model_dump()
        log_blue(f"Successfully extracted structured data with {len(invoice_data_dict.keys())} fields from batch {batch_num}")
        
        # Clean numeric values
        invoice_data_dict = clean_numeric_values(invoice_data_dict)
        
        # Process line items to ensure they have _source_page
        if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
            for item in invoice_data_dict["line_items"]:
                # If _source_page not assigned by LLM, try to infer from context or set to unknown
                if "_source_page" not in item:
                    # For now, mark as batch-specific unknown
                    item["_source_page"] = f"batch_{batch_num}"
            
            log_blue(f"Processed {len(invoice_data_dict['line_items'])} line items from batch {batch_num}")
            
            # Count items by page for logging
            page_counts = {}
            for item in invoice_data_dict["line_items"]:
                page = item.get("_source_page", f"batch_{batch_num}")
                if page not in page_counts:
                    page_counts[page] = 0
                page_counts[page] += 1
            
            for page, count in page_counts.items():
                log_blue(f"Batch {batch_num}: {page} has {count} line items")
        
        # Store batch-specific data
        batch_key = f"batch_{batch_num}"
        invoice_collections[invoice_number]["page_data"][batch_key] = {
            "header": {k: v for k, v in invoice_data_dict.items() if k != "line_items"},
            "line_items": invoice_data_dict.get("line_items", []),
            "is_last_batch": is_final_batch,
            "batch_num": batch_num
        }
        
        # Update invoice collection with extracted data
        # For header fields, prioritize data from the final batch for financial fields
        if is_final_batch:
            # For the final batch, override financial fields in the main header
            financial_fields = ['subtotal', 'total', 'tax', 'items_total', 'total_amount_due', 'output_tax']
            
            for k, v in invoice_data_dict.items():
                if k != "line_items" and v:
                    if k in financial_fields or k not in invoice_collections[invoice_number]["header"]:
                        invoice_collections[invoice_number]["header"][k] = v
                        if k in financial_fields:
                            log_blue(f"Updated financial field '{k}' from final batch with value: {v}")
        else:
            # For non-final batches, only add fields not already present
            for k, v in invoice_data_dict.items():
                if k != "line_items" and v and k not in invoice_collections[invoice_number]["header"]:
                    invoice_collections[invoice_number]["header"][k] = v
        
        # Add the line items to the main collection
        if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
            # Add batch metadata to each line item
            for item in invoice_data_dict["line_items"]:
                item["_batch_num"] = batch_num
            
            # Add items to the collection
            invoice_collections[invoice_number]["line_items"].extend(invoice_data_dict["line_items"])
            log_blue(f"Added {len(invoice_data_dict['line_items'])} line items from batch {batch_num}")
        
        log_blue(f"Updated invoice collection for invoice {invoice_number} with data from batch {batch_num}")
        
        return True
        
    except Exception as e:
        log_yellow(f"Error processing batch {batch_num} for invoice {invoice_number}: {str(e)}")
        log_yellow(traceback.format_exc())
        return False


def get_supplier_configuration(country_code, brand_name, processing_method):
    """
    Get supplier configuration from database including schema and instructions.
    
    Args:
        country_code: The country code
        brand_name: The supplier brand name
        processing_method: 'text' or 'image'
        
    Returns:
        tuple: (schema_data, supplier_instructions)
    """
    import pyodbc
    import json
    
    try:
        with pyodbc.connect(os.getenv("DBConnectionStringGwh")) as connection:
            cursor = connection.cursor()
            
            # Try supplier-specific configuration first
            cursor.execute("""
                SELECT schema_json, prompt, special_instructions
                FROM prompt_registry 
                WHERE country_code = ? AND brand_name = ? AND processing_method = ? AND is_active = 1
            """, (country_code, brand_name.lower(), processing_method))
            
            result = cursor.fetchone()
            
            if result:
                log_green(f"Found supplier-specific schema for {brand_name}")
                schema_entity = result[0]  # schema_json column
                supplier_instructions = result[1] or ""  # prompt column
                
                # Append special_instructions if not null
                if result[2]:  # special_instructions
                    supplier_instructions += f"\n\nSpecial Instructions:\n{result[2]}"
                    
            else:
                log_yellow(f"No supplier-specific schema for {brand_name}")
                log_yellow(f"Using default")
                
                # Get default configuration
                cursor.execute("""
                    SELECT schema_json, prompt, special_instructions
                    FROM prompt_registry 
                    WHERE country_code = ? AND brand_name = 'default' AND processing_method = ? AND is_active = 1
                """, (country_code, processing_method,))
                
                default_result = cursor.fetchone()
                if default_result:
                    schema_entity = default_result[0]
                    supplier_instructions = default_result[1] or ""
                    
                    # Append special_instructions if not null
                    if default_result[2]:  # special_instructions
                        supplier_instructions += f"\n\nSpecial Instructions:\n{default_result[2]}"
                else:
                    raise Exception(f"No default configuration found for {processing_method}")
            
            # Get feedback from brand_feedback table 
            log_yellow(f"Checking for feedback")          
            cursor.execute("""
                SELECT feedback
                FROM brand_feedback 
                WHERE country_code = ? AND brand_name = ?
            """, (country_code, brand_name.lower()))
            
            feedback_result = cursor.fetchone()
            if feedback_result and feedback_result[0]:  # feedback exists
                feedback_text = f"\n\nFeedback Notes from end users during previous episodes:\n{feedback_result[0]}"
                
                supplier_instructions += feedback_text
            else:
                log_yellow(f"No feedback feedback for {country_code} and {brand_name}")          
            
            schema_data = json.loads(schema_entity)
            
            if supplier_instructions:
                log_green(f"Found extraction instructions for {brand_name}")
            else:
                log_yellow(f"No extraction instructions found for {brand_name}")
                
            return schema_data, supplier_instructions
            
    except Exception as e:
        log_red(f"Error loading configuration from database: {str(e)}")
        raise


def extract_invoice_data(state: AgentState) -> Command[Literal["merge_invoice_data", "handle_error"]]:
    """Extract all invoice data based on the supplier-specific schema using text extraction with consistent page tracking."""
    if state.get("status") == "error":
        return Command(goto="handle_error")
    
    try:
        # Get the invoice path from the state
        invoice_path = state.get("invoice_path")
        country_code = state.get("supplier_country_code")
        brand_name = state.get("brand_name")
        pages_to_process = state.get("pages", "all")  # Get pages parameter, default to "all"
        processing_level = state.get("processing_level", "page")  # New parameter, default to "page"
        processing_max_pages = state.get("processing_max_pages", 0)  # NEW: Get max pages per batch, default to 0 (unlimited)
        
        log_cyan(f"Extracting invoice data for supplier: {brand_name} (Pages: {pages_to_process}, Processing level: {processing_level}, Max pages per batch: {processing_max_pages})")
        
        # Get schema and supplier-specific instructions
        try:
            log_green("Checking for supplier specific instructions")
            schema_data, supplier_instructions = get_supplier_configuration(country_code, brand_name, "text")                
        except ResourceNotFoundError:
            log_yellow("Using default extraction instructions")
            schema_data, supplier_instructions = get_supplier_configuration(country_code, "default", "text")

        # Create the Pydantic model from the schema
        InvoiceModel = jsonschema_to_pydantic(schema_data['schema'])
        log_green(f"Successfully created Pydantic model from schema for {brand_name}")
        
        # Read the PDF file
        full_path = os.path.join(INVOICE_STORE, invoice_path)
        log_blue(f"Reading file from: {full_path}")
        
        # Check if file is a PDF
        if not invoice_path.lower().endswith('.pdf'):
            error_msg = f"Text extraction only works with PDF files. File provided: {invoice_path}"
            log_red(error_msg)
            return Command(
                update={
                    "status": "error", 
                    "error": error_msg
                },
                goto="handle_error"
            )
        
        # Variables to store collections
        invoice_collections = {}  # Will store data grouped by invoice number
        
        with open(full_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            # Determine which pages to process
            if pages_to_process == "first":
                page_numbers = [1]  # Use 1-based page numbering for consistency
                log_blue(f"Processing first page only (out of {total_pages})")
            elif pages_to_process == "all":
                page_numbers = list(range(1, total_pages + 1))  # 1-based page numbering
                log_blue(f"Processing all {total_pages} pages")
            else:
                # Try to parse comma-separated page numbers
                try:
                    page_specs = pages_to_process.split(',')
                    page_numbers = []
                    for spec in page_specs:
                        if '-' in spec:
                            start, end = map(int, spec.split('-'))
                            page_numbers.extend(range(start, end + 1))
                        else:
                            page_numbers.append(int(spec))
                    
                    # Validate page numbers are within range
                    page_numbers = [p for p in page_numbers if 1 <= p <= total_pages]
                    if not page_numbers:
                        log_yellow(f"No valid pages specified in '{pages_to_process}', using all pages")
                        page_numbers = list(range(1, total_pages + 1))
                    else:
                        log_blue(f"Processing pages {page_numbers} (out of {total_pages})")
                except ValueError:
                    log_yellow(f"Invalid page specification: '{pages_to_process}', using all pages")
                    page_numbers = list(range(1, total_pages + 1))
            
            # First, detect which pages belong to which invoice numbers
            invoice_pages = {}  # Dictionary mapping invoice number to list of page indices (1-based)
            
            # Process each page to identify invoice numbers
            for page_num in page_numbers:
                page_idx = page_num - 1  # Convert to 0-based index for PyPDF2
                page = pdf_reader.pages[page_idx]
                page_text = page.extract_text()
                
                log_blue(f"Initial pass - page {page_num} to identify invoice numbers")
                
                # Create system prompt to identify invoice numbers
                system_prompt = """
                You are a specialized invoice analyzer. Your only task is to identify the invoice number(s) 
                present in this invoice text. Return ONLY the invoice number without any additional text.
                If you can't find an invoice number, respond with 'unknown'.
                """
                
                # Create message 
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"What is the invoice number in this text?\n\n{page_text}")
                ]
                
                try:
                    # Get response
                    invoice_number_response = llm.invoke(messages).content.strip()
                    
                    # Check if it's a valid invoice number
                    if invoice_number_response.lower() != 'unknown':
                        # Add this page to the invoice's page list
                        if invoice_number_response not in invoice_pages:
                            invoice_pages[invoice_number_response] = []
                        # Store page number as a string for consistency
                        invoice_pages[invoice_number_response].append(str(page_num))
                        log_blue(f"Found invoice number: {invoice_number_response} on page {page_num}")
                    else:
                        log_yellow(f"No invoice number found on page {page_num}")
                except Exception as e:
                    log_yellow(f"Error identifying invoice number on page {page_num}: {str(e)}")
            
            # After we have invoice_pages populated, update db to processng status:
            if invoice_pages:
                # Get the first invoice number found
                first_invoice_number = list(invoice_pages.keys())[0]
                
                # NEW: Update header with invoice number and "Processing" status
                try:                   
                    header_id = state.get("id")
                    
                    success = inserter.update_header_with_invoice_number(
                        header_id=header_id,
                        invoice_number=first_invoice_number,
                        status="Processing"
                    )
                    
                    if success:
                        log_green(f"Updated header with invoice number '{first_invoice_number}' and status 'processing'")
                    else:
                        log_yellow(f"Failed to update header with invoice number for ID: {header_id}")
                        
                except Exception as db_error:
                    log_yellow(f"Error updating header with invoice number: {str(db_error)}")

            # If no invoice numbers found, create a default and assign all pages to it
            if not invoice_pages:
                invoice_pages["unknown"] = [str(p) for p in page_numbers]
                log_yellow("No invoice numbers detected. Treating the entire document as a single invoice.")
            
            # Log the invoice distribution across pages
            for invoice_num, page_nums in invoice_pages.items():
                log_blue(f"Invoice {invoice_num} found on pages: {page_nums}")
            
            # Determine processing strategy based on processing_level
            if processing_level == "invoice":
                log_cyan(f"Using 'invoice' processing level - grouping pages by invoice number")
                
                # Process each unique invoice with all its pages at once
                for invoice_number, page_nums in invoice_pages.items():
                    log_cyan(f"Processing invoice number: {invoice_number} with all pages: {page_nums}")
                    
                    # Initialize invoice data structure
                    if invoice_number not in invoice_collections:
                        invoice_collections[invoice_number] = {
                            "header": {},
                            "line_items": [],
                            "pages": page_nums,
                            "page_data": {}  # Store data by page for better merging
                        }
                    
                    # Sort pages numerically for consistent processing
                    sorted_page_nums = sorted(page_nums, key=lambda x: int(x) if x.isdigit() else 0)
                    
                    # NEW: Implement batch processing based on processing_max_pages
                    if processing_max_pages > 0 and len(sorted_page_nums) > processing_max_pages:
                        # Calculate number of batches needed
                        num_batches = (len(sorted_page_nums) + processing_max_pages - 1) // processing_max_pages  # Ceiling division
                        log_blue(f"Processing {len(sorted_page_nums)} pages in {num_batches} batches of max {processing_max_pages} pages each")
                        
                        # Process each batch of pages
                        for batch_num in range(num_batches):
                            start_idx = batch_num * processing_max_pages
                            end_idx = min(start_idx + processing_max_pages, len(sorted_page_nums))
                            batch_pages = sorted_page_nums[start_idx:end_idx]
                            
                            log_blue(f"Processing batch {batch_num+1}/{num_batches} with pages {batch_pages}")
                            
                            # Process this batch
                            process_page_batch(
                                pdf_reader=pdf_reader,
                                invoice_number=invoice_number,
                                page_nums=batch_pages,
                                invoice_collections=invoice_collections,
                                supplier_instructions=supplier_instructions,
                                brand_name=brand_name,
                                structured_llm=llm.with_structured_output(InvoiceModel),
                                is_batch=True,
                                batch_num=batch_num+1,
                                total_batches=num_batches
                            )
                    else:
                        # Process all pages at once (original behavior)
                        log_blue(f"Processing all {len(sorted_page_nums)} pages at once")
                        
                        # Combine text from all pages that belong to this invoice
                        combined_text = ""
                        for page_num_str in sorted_page_nums:
                            page_num = int(page_num_str)
                            page_idx = page_num - 1  # Convert to 0-based index
                            
                            if page_idx < len(pdf_reader.pages):
                                page = pdf_reader.pages[page_idx]
                                page_text = page.extract_text()
                                
                                # Add page separator and number
                                combined_text += f"\n\n--- PAGE {page_num} ---\n\n{page_text}"
                                
                                # Store each page's text in page_data for reference
                                if page_num_str not in invoice_collections[invoice_number]["page_data"]:
                                    invoice_collections[invoice_number]["page_data"][page_num_str] = {
                                        "text": page_text,
                                        "is_last_page": page_num_str == sorted_page_nums[-1],
                                        "is_multi_page": len(sorted_page_nums) > 1
                                    }
                        
                        log_blue(f"Combined text from {len(sorted_page_nums)} pages for invoice {invoice_number}")
                        
                        # Create extraction prompt for all pages combined
                        base_extraction_prompt = f"""
                        You are a data extraction specialist for {brand_name} invoices. 

                        Your task is to extract ALL information from invoice number {invoice_number}.
                        The text below contains ALL PAGES ({len(sorted_page_nums)}) of this invoice combined.
                        Each page is marked with "--- PAGE X ---" to help you understand page boundaries.

                        TEXT CONTENT:
                        {combined_text}

                        IMPORTANT INSTRUCTIONS:
                        1. FOCUS ONLY on invoice number {invoice_number}
                        2. Extract ALL line items visible across all pages - this is critical
                        3. Pay special attention to identify surcharges, fees, or additional charges even if they don't have the same format as main line items
                        4. Include EVERY SINGLE line item, surcharge, or additional fee visible for this invoice
                        5. Do not include line items from other invoices
                        6. Extract all header information (dates, customer info, totals, etc.)
                        7. Be thorough and precise in your extraction
                        8. If you see a quantity surcharge, service fee, or any other additional charge, include it as a separate line item even if it doesn't have a line number
                        9. Check whether the line item includes both a unit price and a total amount. Some line items may not have a charge — these are often minor additives or components that accompany a primary item. In such cases, ensure they are still recognized, but do not assign a unit price or amount unless explicitly stated.
                        10. Look specifically for fields like: "Items Total", "Total Amount Due", "Output Tax", "Total Amount" which represent the FINAL invoice totals
                        11. The financial totals are likely to be on the last page of the invoice
                        12. If you see any numeric totals that appear to be for the entire invoice, prioritize extracting them
                        13. Look for fields with labels like "subtotal", "tax", "total", "items total", or "total amount due"
                        14. Assign each line item to the page where it appears by including a "_source_page" field in each line item with the page number
                        15. For each distinct part number and quantity combination, create a separate line item entry
                        16. Pay attention to line items that may span across page boundaries
                        """
                        
                        # Add supplier-specific instructions if available
                        if supplier_instructions:
                            extraction_prompt = f"""
                            {base_extraction_prompt}
                            
                            SUPPLIER-SPECIFIC INSTRUCTIONS:
                            {supplier_instructions}
                            
                            Return the complete invoice data in a structured format.
                            """
                        else:
                            extraction_prompt = f"""
                            {base_extraction_prompt}
                            
                            Return the complete invoice data in a structured format.
                            """
                        
                        # Use structured LLM
                        log_blue(f"Sending all pages for invoice {invoice_number} to LLM in one request")
                        try:
                            structured_llm = llm.with_structured_output(InvoiceModel)
                            invoice_data = structured_llm.invoke(extraction_prompt)
                            log_blue(f"Received structured response from LLM")
                            
                            # Convert to dictionary
                            invoice_data_dict = invoice_data.model_dump()
                            log_blue(f"Successfully extracted structured data with {len(invoice_data_dict.keys())} fields")
                            
                            # Clean numeric values
                            invoice_data_dict = clean_numeric_values(invoice_data_dict)
                            
                            # Process line items to ensure they have _source_page
                            if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
                                for item in invoice_data_dict["line_items"]:
                                    # If _source_page not assigned by LLM, try to infer from context or set to unknown
                                    if "_source_page" not in item:
                                        # For now, mark as unknown - we can't reliably determine without more context
                                        item["_source_page"] = "unknown"
                                
                                log_blue(f"Processed {len(invoice_data_dict['line_items'])} line items")
                                
                                # Count items by page for logging
                                page_counts = {}
                                for item in invoice_data_dict["line_items"]:
                                    page = item.get("_source_page", "unknown")
                                    if page not in page_counts:
                                        page_counts[page] = 0
                                    page_counts[page] += 1
                                
                                for page, count in page_counts.items():
                                    log_blue(f"Page {page} has {count} line items")
                            
                            # Update invoice collection with extracted data
                            invoice_collections[invoice_number]["header"] = {
                                k: v for k, v in invoice_data_dict.items() if k != "line_items"
                            }
                            invoice_collections[invoice_number]["line_items"] = invoice_data_dict.get("line_items", [])
                            
                            log_blue(f"Updated invoice collection for invoice {invoice_number}")
                            
                        except Exception as e:
                            log_yellow(f"Error processing invoice {invoice_number}: {str(e)}")
                            log_yellow(traceback.format_exc())
                            log_yellow(f"Falling back to page-by-page processing for invoice {invoice_number}")
                            # Set processing_level to "page" to fall back to page-by-page processing
                            processing_level = "page"
                
            # If processing_level is "page" (default) or fallback from "invoice" failure
            if processing_level == "page":  
                log_cyan(f"Using 'page' processing level - processing each page individually")
                
                # Process each unique invoice using only its relevant pages
                for invoice_number, page_nums in invoice_pages.items():
                    log_blue(f"Processing invoice: {invoice_number}")
                    
                    # Initialize invoice data structure
                    if invoice_number not in invoice_collections:
                        invoice_collections[invoice_number] = {
                            "header": {},
                            "line_items": [],
                            "pages": page_nums,
                            "page_data": {}  # NEW: Store data by page for better merging
                        }
                    
                    # NEW: Track if this is a multi-page invoice
                    is_multi_page = len(page_nums) > 1
                    
                    # Process only the pages that belong to this invoice
                    for page_idx, page_num_str in enumerate(page_nums):
                        page_num = int(page_num_str)
                        actual_page_idx = page_num - 1  # Convert to 0-based index
                        
                        # NEW: Determine if this is the last page of the invoice
                        is_last_page = page_idx == len(page_nums) - 1
                        
                        if actual_page_idx < len(pdf_reader.pages):
                            page = pdf_reader.pages[actual_page_idx]
                            page_text = page.extract_text()
                            log_blue(f"Extracting data for invoice {invoice_number} from page {page_num}")

                            # Create extraction prompt, incorporating supplier-specific instructions if available
                            base_extraction_prompt = f"""
                            You are a data extraction specialist for {brand_name} invoices. 

                            Your task is to extract ALL information from invoice number {invoice_number} in this text.
                            This is page {page_num} of the invoice.

                            TEXT CONTENT:
                            {page_text}

                            IMPORTANT INSTRUCTIONS:
                            1. FOCUS ONLY on invoice number {invoice_number}
                            2. Extract ALL line items visible in this text - this is critical
                            3. Pay special attention to identify surcharges, fees, or additional charges even if they don't have the same format as main line items
                            4. Include EVERY SINGLE line item, surcharge, or additional fee visible for this invoice
                            5. Do not include line items from other invoices
                            6. Extract all header information (dates, customer info, totals, etc.)
                            7. Be thorough and precise in your extraction
                            8. If you see a quantity surcharge, service fee, or any other additional charge, include it as a separate line item even if it doesn't have a line number
                            9. Check whether the line item includes both a unit price and a total amount. Some line items may not have a charge — these are often minor additives or components that accompany a primary item. In such cases, ensure they are still recognized, but do not assign a unit price or amount unless explicitly stated.
                            10. Look specifically for fields like: "Items Total", "Total Amount Due", "Output Tax", "Total Amount" which represent the FINAL invoice totals
                            11. The financial totals on this page are likely to represent the COMPLETE invoice totals
                            12. If you see any numeric totals that appear to be for the entire invoice, prioritize extracting them
                            13. Look for fields with labels like "subtotal", "tax", "total", "items total", or "total amount due"
                            14. For each distinct part number and quantity combination, create a separate line item entry
                            """
                            
                            # Add supplier-specific instructions if available
                            if supplier_instructions:
                                extraction_prompt = f"""
                                {base_extraction_prompt}
                                
                                SUPPLIER-SPECIFIC INSTRUCTIONS:
                                {supplier_instructions}
                                
                                Return the complete invoice data in a structured format.
                                """
                            else:
                                extraction_prompt = f"""
                                {base_extraction_prompt}
                                
                                Return the complete invoice data in a structured format.
                                """
                            
                            # Use structured LLM
                            log_blue(f"Sending page {page_num} to LLM for invoice {invoice_number}" + 
                                    (f" (FINAL PAGE)" if is_last_page and is_multi_page else ""))
                            try:
                                structured_llm = llm.with_structured_output(InvoiceModel)
                                invoice_data = structured_llm.invoke(extraction_prompt)
                                log_blue(f"Received structured response from LLM")
                                
                                # Convert to dictionary
                                invoice_data_dict = invoice_data.model_dump()
                                log_blue(f"Successfully extracted structured data with {len(invoice_data_dict.keys())} fields")
                                
                                # Clean numeric values
                                invoice_data_dict = clean_numeric_values(invoice_data_dict)
                                
                                # NEW: Store page-specific data for better merging
                                invoice_collections[invoice_number]["page_data"][page_num_str] = {
                                    "header": {k: v for k, v in invoice_data_dict.items() if k != "line_items"},
                                    "line_items": invoice_data_dict.get("line_items", []),
                                    "is_last_page": is_last_page,
                                    "is_multi_page": is_multi_page
                                }
                                
                                # Update invoice collection
                                # Update header with any new information
                                for k, v in invoice_data_dict.items():
                                    if k != "line_items" and v:
                                        # NEW: For important financial fields on last page of multi-page invoice,
                                        # always override existing values
                                        financial_fields = ['subtotal', 'total', 'tax', 'items_total', 
                                                            'total_amount_due', 'output_tax']
                                        
                                        if (is_last_page and is_multi_page and k in financial_fields) or \
                                            (k not in invoice_collections[invoice_number]["header"]):
                                            invoice_collections[invoice_number]["header"][k] = v
                                            if is_last_page and is_multi_page and k in financial_fields:
                                                log_blue(f"Updated financial field '{k}' from final page with value: {v}")
                                
                                # Add new line items with page source information
                                if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
                                    # Tag items with source page
                                    for item in invoice_data_dict["line_items"]:
                                        # Store page number as string for consistency
                                        item["_source_page"] = page_num_str
                                    
                                    invoice_collections[invoice_number]["line_items"].extend(invoice_data_dict["line_items"])
                                    log_blue(f"Added {len(invoice_data_dict['line_items'])} line items from page {page_num}")
                                
                                log_blue(f"Updated invoice collection for invoice {invoice_number}")
                            except Exception as e:
                                log_yellow(f"Error processing page {page_num} for invoice {invoice_number}: {str(e)}")
                        else:
                            log_yellow(f"Page index {actual_page_idx} is out of range (max: {len(pdf_reader.pages)-1})")
            
            # Add country codes to all invoices
            for invoice_number, data in invoice_collections.items():
                # Add country codes from state if available
                if state.get("supplier_country_code") and "supplier_country_code" not in data["header"]:
                    data["header"]["supplier_country_code"] = state.get("supplier_country_code")
                    log_blue(f"Added supplier country code to invoice {invoice_number}")
                
                if state.get("buyer_country_code") and "buyer_country_code" not in data["header"]:
                    data["header"]["buyer_country_code"] = state.get("buyer_country_code")
                    log_blue(f"Added buyer country code to invoice {invoice_number}")
                    
                if state.get("ship_to_country_code") and "ship_to_country_code" not in data["header"]:
                    data["header"]["ship_to_country_code"] = state.get("ship_to_country_code")
                    log_blue(f"Added ship-to country code to invoice {invoice_number}")

                if state.get("region") and "region" not in data["header"]:
                    data["header"]["region"] = state.get("region")
                    log_blue(f"Added region to invoice {invoice_number}: {state.get('region')}")
            
            # Fallback for empty invoice collections
            if not invoice_collections:
                log_yellow("No invoice data extracted, creating fallback invoice")
                fallback_invoice_number = "unknown"
                invoice_collections[fallback_invoice_number] = {
                    "header": {
                        "invoice_number": fallback_invoice_number,
                        "supplier_details": state.get("supplier_name", ""),
                        "supplier_country_code": state.get("supplier_country_code"),
                        "buyer_details": state.get("buyer_address", ""),
                        "buyer_country_code": state.get("buyer_country_code"),
                        "ship_to_details": state.get("ship_to_address", ""),
                        "ship_to_country_code": state.get("ship_to_country_code"),
                        "region": state.get("region")
                    },
                    "line_items": [],
                    "pages": [str(i) for i in page_numbers],
                    "page_data": {}  # Empty page data for fallback
                }
            
            # Return the collected data for merging
            return Command(
                update={
                    "invoice_collections": invoice_collections,
                    "invoice_schema": schema_data,
                    "status": "data_extracted_per_page",
                    "extraction_method": "text_per_page" if processing_level == "page" else "text_per_invoice",
                    "page_tracking": {
                        "invoice_to_pages": invoice_pages,
                        "method": "text"
                    }
                },
                goto="merge_invoice_data"
            )
        
    except Exception as e:
        error_msg = f"Error extracting invoice data: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={
                "status": "error", 
                "error": error_msg
            },
            goto="handle_error"
        )


def extract_invoice_data_image(state: AgentState) -> Command[Literal["merge_invoice_data", "handle_error"]]:
    """Extract all invoice data from an image using GPT-4o's vision capabilities with consistent page tracking."""
    if state.get("status") == "error" or not state.get("brand_name"):
        return Command(goto="handle_error")
    
    try:
        # Get the invoice path from the state
        invoice_path = state.get("invoice_path")
        country_code = state.get("supplier_country_code")
        brand_name = state.get("brand_name")
        pages_to_process = state.get("pages", "all")  # Get pages parameter, default to "all"
        processing_level = state.get("processing_level", "page")  # New parameter, default to "page"
        
        log_cyan(f"Extracting invoice data from image for supplier: {brand_name} (Pages: {pages_to_process}, Processing level: {processing_level})")
        
        # Get schema and supplier-specific instructions
        try:
            log_green("Checking for supplier specific instructions")
            schema_data, supplier_instructions = get_supplier_configuration(country_code, brand_name, "image")                
        except ResourceNotFoundError:
            log_yellow("Using default extraction instructions")
            schema_data, supplier_instructions = get_supplier_configuration(country_code, "default", "image")
        
        # Create the Pydantic model from the schema
        InvoiceModel = jsonschema_to_pydantic(schema_data['schema'])
        log_green(f"Successfully created Pydantic model from schema for {brand_name}")
        
        # Load the image or PDF
        full_path = os.path.join(INVOICE_STORE, invoice_path)
        log_blue(f"Reading file from: {full_path}")
        
        # Variables to store all images
        all_images = []
        
        # Collections to store data by invoice number
        invoice_collections = {}  # Will store data grouped by invoice number
        
        # Handle file based on type
        if invoice_path.lower().endswith('.pdf'):
            try:
                from pdf2image import convert_from_bytes
                
                # Determine which pages to process
                with open(full_path, 'rb') as pdf_file:
                    pdf_bytes = pdf_file.read()
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                    total_pages = len(pdf_reader.pages)
                    
                    # Parse pages specification
                    if pages_to_process == "first":
                        page_numbers = [1]
                        log_blue(f"Processing first page only (out of {total_pages})")
                    elif pages_to_process == "all":
                        page_numbers = list(range(1, total_pages + 1))
                        log_blue(f"Processing all {total_pages} pages")
                    else:
                        # Try to parse comma-separated page numbers
                        try:
                            page_specs = pages_to_process.split(',')
                            page_numbers = []
                            for spec in page_specs:
                                if '-' in spec:
                                    start, end = map(int, spec.split('-'))
                                    page_numbers.extend(range(start, end + 1))
                                else:
                                    page_numbers.append(int(spec))
                            
                            # Validate page numbers are within range
                            page_numbers = [p for p in page_numbers if 1 <= p <= total_pages]
                            if not page_numbers:
                                log_yellow(f"No valid pages specified in '{pages_to_process}', defaulting to first page")
                                page_numbers = [1]
                            else:
                                log_blue(f"Processing pages {page_numbers} (out of {total_pages})")
                        except ValueError:
                            log_yellow(f"Invalid page specification: '{pages_to_process}', defaulting to first page")
                            page_numbers = [1]
                
                # Process each page
                for page_num in page_numbers:
                    log_blue(f"Converting page {page_num} to image")
                    page_images = convert_from_bytes(pdf_bytes, first_page=page_num, last_page=page_num)
                    
                    if page_images:
                        all_images.append((page_images[0], page_num))  # Store as tuple (image, page_number)
                    else:
                        log_yellow(f"Failed to convert page {page_num} to image")
                
                # Handle if no pages were successfully converted
                if not all_images:
                    raise Exception("Failed to convert any PDF pages to images")
                    
            except ImportError:
                log_yellow("pdf2image package not available. Falling back to text extraction.")
                return Command(
                    update={
                        "extraction_method": "text_fallback"
                    },
                    goto="extract_invoice_data"
                )
        else:
            # For regular image files, just read the image
            with open(full_path, "rb") as image_file:
                image_bytes = image_file.read()
                
                # Convert to PIL Image and add to list
                from PIL import Image
                img = Image.open(io.BytesIO(image_bytes))
                all_images.append((img, 1))  # Single image, page 1
        
        # First, detect which pages belong to which invoice numbers
        invoice_pages = {}  # Dictionary mapping invoice number to list of page indices (1-based)
        
        # Process each image to identify invoice numbers
        for img, page_num in all_images:
            log_blue(f"Initial pass - image {page_num} to identify invoice numbers")
            
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            base64_image = base64.b64encode(img_byte_arr.getvalue()).decode("utf-8")
            
            # Create system prompt to identify invoice numbers
            system_prompt = """
            You are a specialized invoice analyzer. Your only task is to identify the invoice number(s) 
            present in this invoice image. Return ONLY the invoice number without any additional text.
            If you can't find an invoice number, respond with 'unknown'.
            """
            
            # Create message with image
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(
                    content=[
                        {"type": "text", "text": "What is the invoice number in this image?"},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                    ]
                )
            ]
            
            try:
                # Get response
                invoice_number_response = vision_llm.invoke(messages).content.strip()
                
                # Check if it's a valid invoice number
                if invoice_number_response.lower() != 'unknown':
                    # Add this page to the invoice's page list
                    if invoice_number_response not in invoice_pages:
                        invoice_pages[invoice_number_response] = []
                    # Store page number as a string for consistency
                    invoice_pages[invoice_number_response].append(str(page_num))
                    log_blue(f"Found invoice number: {invoice_number_response} on page {page_num}")
                else:
                    log_yellow(f"No invoice number found on page {page_num}")
            except Exception as e:
                log_yellow(f"Error identifying invoice number on page {page_num}: {str(e)}")
        
        # After we have invoice_pages populated, update db to processng status:
        if invoice_pages:
            # Get the first invoice number found
            first_invoice_number = list(invoice_pages.keys())[0]
            
            # NEW: Update header with invoice number and "Processing" status
            try:                   
                header_id = state.get("id")
                
                success = inserter.update_header_with_invoice_number(
                    header_id=header_id,
                    invoice_number=first_invoice_number,
                    status="Processing"
                )
                
                if success:
                    log_green(f"Updated header with invoice number '{first_invoice_number}' and status 'processing'")
                else:
                    log_yellow(f"Failed to update header with invoice number for ID: {header_id}")
                    
            except Exception as db_error:
                log_yellow(f"Error updating header with invoice number: {str(db_error)}")

        # If no invoice numbers found, create a default and assign all pages to it
        if not invoice_pages:
            invoice_pages["unknown"] = [str(img_page[1]) for img_page in all_images]
            log_yellow("No invoice numbers detected. Treating the entire document as a single invoice.")
        
        # Log the invoice distribution across pages
        for invoice_num, page_nums in invoice_pages.items():
            log_blue(f"Invoice {invoice_num} found on pages: {page_nums}")
        
        # Determine processing strategy based on processing_level
        if processing_level == "invoice":
            log_cyan(f"Using 'invoice' processing level - grouping pages by invoice number")
            
            # Process each unique invoice with all its pages at once
            for invoice_number, page_nums in invoice_pages.items():
                log_cyan(f"Processing invoice number: {invoice_number} with all pages: {page_nums}")
                
                # Initialize invoice data structure
                if invoice_number not in invoice_collections:
                    invoice_collections[invoice_number] = {
                        "header": {},
                        "line_items": [],
                        "pages": page_nums,
                        "page_data": {}  # Store data by page for better merging
                    }
                
                # Sort pages numerically for consistent processing
                sorted_page_nums = sorted(page_nums, key=lambda x: int(x) if x.isdigit() else 0)
                
                # Create a list to store content parts for the message
                message_content = [
                    {"type": "text", "text": f"Extract all line items from invoice {invoice_number} in these images. This is a {len(sorted_page_nums)}-page invoice. Extract all line items as per instructions: {supplier_instructions}"}
                ]
                
                # Map of page number to original index in all_images
                page_to_image = {str(img_page[1]): i for i, img_page in enumerate(all_images)}
                
                # Add each page image to the message content
                for page_num_str in sorted_page_nums:
                    if page_num_str in page_to_image:
                        img_idx = page_to_image[page_num_str]
                        img, _ = all_images[img_idx]
                        
                        # Convert image to base64
                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='PNG')
                        base64_image = base64.b64encode(img_byte_arr.getvalue()).decode("utf-8")
                        
                        # Add image to message
                        message_content.append({
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                        })
                        
                        # Store each page's image in page_data for reference
                        if page_num_str not in invoice_collections[invoice_number]["page_data"]:
                            invoice_collections[invoice_number]["page_data"][page_num_str] = {
                                "is_last_page": page_num_str == sorted_page_nums[-1],
                                "is_multi_page": len(sorted_page_nums) > 1
                            }
                    else:
                        log_yellow(f"Could not find image for page {page_num_str}")
                
                log_blue(f"Sending {len(sorted_page_nums)} page images for invoice {invoice_number} in one request")
                
                # Create base extraction prompt
                base_extraction_prompt = f"""
                You are a data extraction specialist for {brand_name} invoices. 
                
                Your task is to extract ALL information from invoice number {invoice_number}.
                You are looking at ALL PAGES ({len(sorted_page_nums)}) of this invoice at once.
                
                IMPORTANT INSTRUCTIONS:
                1. FOCUS ONLY on invoice number {invoice_number}
                2. Extract ALL line items visible across all pages - this is critical
                3. Pay special attention to identify surcharges, fees, or additional charges
                4. Include EVERY SINGLE line item - be extra careful to count them correctly
                5. Do not merge or combine similar line items - each quantity/part combination is a distinct line item
                6. For items that appear to span across page breaks, treat them as distinct line items
                7. Extract all header information (dates, customer info, totals, etc.)
                8. Be thorough and precise in your extraction
                9. For each line item, indicate which page it appears on by including a "_source_page" field
                10. The financial totals are likely to be on the last page of the invoice
                11. If you see any numeric totals that appear to be for the entire invoice, prioritize extracting them
                12. Pay special attention to QTY SHIP values - each distinct QTY SHIP represents a separate line item
                13. Check that your line item count matches exactly with what's in the invoice - don't skip or merge any
                \n
                """
                
                # Add supplier-specific instructions if available
                extraction_prompt = f"""
                {base_extraction_prompt}
                """
                
                # Create message with multiple images
                messages = [
                    SystemMessage(content=extraction_prompt),
                    HumanMessage(content=message_content)
                ]
                
                # Use the vision model with structured output
                log_blue(f"Sending all {len(message_content)-1} page images to GPT-4o Vision for invoice {invoice_number}")
                try:
                    structured_vision = vision_llm | StrOutputParser()
                    response = structured_vision.invoke(messages)
                    json_match = re.search(r'({[\s\S]*})', response)
                    log_blue(f"Received structured response from GPT-4o Vision")
                    
                    # Convert to dictionary
                    invoice_data = json_match.group(1)
                    invoice_data_dict = json.loads(invoice_data)
                    log_blue(f"Successfully extracted structured data with {len(invoice_data_dict.keys())} fields")
                    
                    # Log the number of line items extracted
                    if "line_items" in invoice_data_dict:
                        line_item_count = len(invoice_data_dict["line_items"])
                        log_blue(f"Extracted {line_item_count} line items")
                    
                    # Clean numeric values
                    invoice_data_dict = clean_numeric_values(invoice_data_dict)
                    
                    # Post-process line items to ensure proper page attribution
                    if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
                        for item in invoice_data_dict["line_items"]:
                            # If _source_page not assigned by LLM, try to infer from context or set to unknown
                            if "_source_page" not in item:
                                item["_source_page"] = "unknown"
                        
                        # Count items by page for logging
                        page_counts = {}
                        for item in invoice_data_dict["line_items"]:
                            page = item.get("_source_page", "unknown")
                            if page not in page_counts:
                                page_counts[page] = 0
                            page_counts[page] += 1
                        
                        for page, count in page_counts.items():
                            log_blue(f"Page {page} has {count} line items")
                    
                    # Update invoice collection
                    invoice_collections[invoice_number]["header"] = {
                        k: v for k, v in invoice_data_dict.items() if k != "line_items"
                    }
                    invoice_collections[invoice_number]["line_items"] = invoice_data_dict.get("line_items", [])
                    
                    log_blue(f"Updated invoice collection for invoice {invoice_number}")
                except Exception as e:
                    log_yellow(f"Error processing invoice {invoice_number}: {str(e)}")
                    log_yellow(traceback.format_exc())
                    
                    # If we failed with combined approach, try again with page-by-page
                    log_yellow(f"Falling back to page-by-page approach for invoice {invoice_number}")
                    processing_level = "page"
                
        # Continue with original "page" processing level if we're using page-by-page or fallback
        if processing_level == "page":  
            log_cyan(f"Using 'page' processing level - processing each page individually")
            
            # Process each unique invoice using only its relevant pages
            for invoice_number, page_nums in invoice_pages.items():
                log_cyan(f"Processing invoice number: {invoice_number}")
                
                # Initialize invoice data structure
                if invoice_number not in invoice_collections:
                    invoice_collections[invoice_number] = {
                        "header": {},
                        "line_items": [],
                        "pages": page_nums,
                        "page_data": {}  # NEW: Store data by page for better merging
                    }
                
                # NEW: Track if this is a multi-page invoice
                is_multi_page = len(page_nums) > 1

                # Create the message
                message_content = [
                    {"type": "text", "text": f"Extract all line items from invoice {invoice_number} in these image. Extract all line items as per instructions: {supplier_instructions}"}
                ]
                
                # Map of page number to original index in all_images
                page_to_image = {str(img_page[1]): i for i, img_page in enumerate(all_images)}
                
                # Process only the pages that belong to this invoice
                for page_idx, page_num_str in enumerate(page_nums):
                    # NEW: Determine if this is the last page of the invoice
                    is_last_page = page_idx == len(page_nums) - 1
                    
                    if page_num_str in page_to_image:
                        img_idx = page_to_image[page_num_str]
                        img, page_num = all_images[img_idx]
                        log_blue(f"Extracting data for invoice {invoice_number} from page {page_num}")
                        
                        # Convert image to byte array
                        img_byte_arr = io.BytesIO()
                        img.save(img_byte_arr, format='PNG')
                        base64_image = base64.b64encode(img_byte_arr.getvalue()).decode("utf-8")

                        # Add image to message
                        message_content.append({
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                        })
                        
                        # Create base extraction prompt
                        base_extraction_prompt = f"""
                        You are a data extraction specialist for {brand_name} invoices. 
                        
                        Your task is to extract ALL information from invoice number {invoice_number} in this image.
                        This is page {page_num} of a {len(page_nums)}-page invoice. Be sure to extract ALL line items on this page.
                        
                        IMPORTANT INSTRUCTIONS:
                        1. FOCUS ONLY on invoice number {invoice_number}
                        2. Extract ALL line items visible on this page
                        3. Pay special attention to identify surcharges, fees, or additional charges
                        4. Include EVERY SINGLE line item visible - be extra careful to count them correctly
                        5. Extract all header information (dates, customer info, totals, etc.)
                        6. Be thorough and precise in your extraction
                        7. Every distinct QTY SHIP value with a part number should be treated as a separate line item
                        8. Look specifically for fields like: "Items Total", "Total Amount Due", "Output Tax", "Total Amount"
                        9. Carefully scan for important header information like issue date, PO number, payment terms
                        10. For each line item, ensure you capture the quantity, line number, description, unit price, and amount
                        11. For each distinct part number and quantity combination, create a separate line item entry
                        """
                        
                        # Add supplier-specific instructions if available
                        extraction_prompt = f"""
                        {base_extraction_prompt}
                        """
                        
                        # Create message with image
                        messages = [
                            SystemMessage(content=extraction_prompt),
                            HumanMessage(content=message_content)
                        ]
                        
                        # Use the vision model with structured output
                        log_blue(f"Sending page {page_num} to GPT-4o Vision for invoice {invoice_number}" +
                                (f" (FINAL PAGE)" if is_last_page and is_multi_page else ""))
                        try:
                            structured_vision = vision_llm.with_structured_output(InvoiceModel)
                            invoice_data = structured_vision.invoke(messages)
                            log_blue(f"Received structured response from GPT-4o Vision")
                            
                            # Convert to dictionary
                            invoice_data_dict = invoice_data.model_dump()
                            log_blue(f"Successfully extracted structured data with {len(invoice_data_dict.keys())} fields")
                            
                            # Log the number of line items extracted for this page
                            if "line_items" in invoice_data_dict:
                                line_item_count = len(invoice_data_dict["line_items"])
                                log_blue(f"Extracted {line_item_count} line items from page {page_num}")
                            
                            # Clean numeric values
                            invoice_data_dict = clean_numeric_values(invoice_data_dict)
                            
                            # NEW: Store page-specific data for better merging
                            invoice_collections[invoice_number]["page_data"][page_num_str] = {
                                "header": {k: v for k, v in invoice_data_dict.items() if k != "line_items"},
                                "line_items": invoice_data_dict.get("line_items", []),
                                "is_last_page": is_last_page,
                                "is_multi_page": is_multi_page
                            }
                            
                            # Update invoice collection 
                            # Update header with any new information - with enhanced logic for header fields
                            for k, v in invoice_data_dict.items():
                                if k != "line_items" and v:
                                    # Define critical header fields that should be prioritized regardless of page
                                    critical_header_fields = [
                                        'invoice_number', 'issue_date', 'po_number', 'due_date', 
                                        'order_number', 'customer_id', 'payment_terms', 'shipping_terms'
                                    ]
                                    
                                    # Define financial fields that should be prioritized from the last page
                                    financial_fields = [
                                        'subtotal', 'total', 'tax', 'items_total', 'total_amount_due', 
                                        'output_tax', 'discount', 'shipping_cost', 'vat'
                                    ]
                                    
                                    # Prioritize certain fields regardless of which page they appear on
                                    if k in critical_header_fields and (k not in invoice_collections[invoice_number]["header"] or 
                                                                       not invoice_collections[invoice_number]["header"].get(k)):
                                        invoice_collections[invoice_number]["header"][k] = v
                                        log_blue(f"Added critical header field '{k}' from page {page_num}")
                                    
                                    # For financial fields, prioritize the last page in multi-page invoices
                                    elif (is_last_page and is_multi_page and k in financial_fields) or (k not in invoice_collections[invoice_number]["header"]):
                                        invoice_collections[invoice_number]["header"][k] = v
                                        if is_last_page and is_multi_page and k in financial_fields:
                                            log_blue(f"Updated financial field '{k}' from final page with value: {v}")
                            
                            # Add new line items with page source information
                            if "line_items" in invoice_data_dict and invoice_data_dict["line_items"]:
                                # Tag items with source page
                                for item in invoice_data_dict["line_items"]:
                                    # Store page number as string for consistency
                                    item["_source_page"] = page_num_str
                                
                                invoice_collections[invoice_number]["line_items"].extend(invoice_data_dict["line_items"])
                                log_blue(f"Added {len(invoice_data_dict['line_items'])} line items from page {page_num}")
                            
                            log_blue(f"Updated invoice collection for invoice {invoice_number}")
                        except Exception as e:
                            log_yellow(f"Error processing page {page_num} for invoice {invoice_number}: {str(e)}")
                    else:
                        log_yellow(f"Could not find image for page {page_num_str}")
                        
                # Post-processing: Check for missing critical header fields across all pages
                if is_multi_page:
                    log_blue(f"Performing post-processing check for missing header fields in invoice {invoice_number}")
                    missing_critical_fields = []
                    
                    # Define critical header fields we want to ensure are captured
                    critical_header_fields = [
                        'invoice_number', 'issue_date', 'po_number', 'due_date', 
                        'order_number', 'customer_id', 'payment_terms', 'shipping_terms'
                    ]
                    
                    # Check which critical fields are missing from the header
                    for field in critical_header_fields:
                        if field not in invoice_collections[invoice_number]["header"] or not invoice_collections[invoice_number]["header"].get(field):
                            missing_critical_fields.append(field)
                    
                    # If any critical fields are missing, scan all pages to find them
                    if missing_critical_fields:
                        log_yellow(f"Missing critical header fields: {missing_critical_fields}")
                        
                        # Look through all page data to find missing fields
                        for page_num, page_data in invoice_collections[invoice_number]["page_data"].items():
                            for field in missing_critical_fields[:]:  # Use a copy to safely modify during iteration
                                if field in page_data["header"] and page_data["header"].get(field):
                                    # Found a missing field in this page
                                    invoice_collections[invoice_number]["header"][field] = page_data["header"][field]
                                    log_blue(f"Found missing header field '{field}' in page {page_num}")
                                    missing_critical_fields.remove(field)
                                    
                        # Log any fields still missing after checking all pages
                        if missing_critical_fields:
                            log_yellow(f"Still missing critical header fields after checking all pages: {missing_critical_fields}")
        
        # Add country codes to all invoices
        for invoice_number, data in invoice_collections.items():
            # Add country codes from state if available
            if state.get("supplier_country_code") and "supplier_country_code" not in data["header"]:
                data["header"]["supplier_country_code"] = state.get("supplier_country_code")
                log_blue(f"Added supplier country code to invoice {invoice_number}")
            
            if state.get("buyer_country_code") and "buyer_country_code" not in data["header"]:
                data["header"]["buyer_country_code"] = state.get("buyer_country_code")
                log_blue(f"Added buyer country code to invoice {invoice_number}")
                
            if state.get("ship_to_country_code") and "ship_to_country_code" not in data["header"]:
                data["header"]["ship_to_country_code"] = state.get("ship_to_country_code")
                log_blue(f"Added ship-to country code to invoice {invoice_number}")

            if state.get("region") and "region" not in data["header"]:
                data["header"]["region"] = state.get("region")
                log_blue(f"Added region to invoice {invoice_number}: {state.get('region')}")
        
        # Fallback for empty invoice collections
        if not invoice_collections:
            log_yellow("No invoice data extracted, creating fallback invoice")
            fallback_invoice_number = "unknown"
            invoice_collections[fallback_invoice_number] = {
                "header": {
                    "invoice_number": fallback_invoice_number,
                    "supplier_details": state.get("supplier_name", ""),
                    "supplier_country_code": state.get("supplier_country_code"),
                    "buyer_details": state.get("buyer_address", ""),
                    "buyer_country_code": state.get("buyer_country_code"),
                    "ship_to_details": state.get("ship_to_address", ""),
                    "ship_to_country_code": state.get("ship_to_country_code"),
                    "region": state.get("region")
                },
                "line_items": [],
                "pages": [str(img_page[1]) for img_page in all_images],
                "page_data": {}  # Empty page data for fallback
            }
        
        # Return the collected data for merging
        return Command(
            update={
                "invoice_collections": invoice_collections,
                "invoice_schema": schema_data,
                "status": "data_extracted_per_page",
                "extraction_method": "vision_per_page" if processing_level == "page" else "vision_per_invoice",
                "page_tracking": {
                    "invoice_to_pages": invoice_pages,
                    "method": "image"
                }
            },
            goto="merge_invoice_data"
        )
    
    except Exception as e:
        error_msg = f"Error extracting invoice data from image: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={
                "status": "error", 
                "error": error_msg
            },
            goto="handle_error"
        )


def merge_invoice_data(state: AgentState) -> Command[Literal["prepare_response", "handle_error"]]:
    """Merge invoice data collected from multiple pages by invoice number with consistent page tracking."""
    log_blue(f"Entering merge_invoice_data with state status: {state.get('status')}")
    
    if state.get("status") == "error":
        return Command(goto="handle_error")
    
    if not state.get("invoice_collections"):
        return Command(
            update={"status": "error", "error": "No invoice collections found in state"},
            goto="handle_error"
        )
    
    try:
        invoice_collections = state.get("invoice_collections", {})
        brand_name = state.get("brand_name", "")
        extraction_method = state.get("extraction_method", "unknown")
        
        # Get country codes from state
        supplier_country_code = state.get("supplier_country_code")
        buyer_country_code = state.get("buyer_country_code")
        ship_to_country_code = state.get("ship_to_country_code")
        
        # Get page tracking information
        page_tracking = state.get("page_tracking", {
            "invoice_to_pages": {},
            "method": extraction_method
        })
        
        log_blue(f"Got country codes from state - Supplier: {supplier_country_code}, Buyer: {buyer_country_code}, Ship-to: {ship_to_country_code}")
        
        log_cyan(f"Merging invoice data collected from multiple pages")
        log_blue(f"Found {len(invoice_collections)} unique invoice(s) in the document")
        log_blue(f"Invoice numbers: {', '.join(invoice_collections.keys())}")
        
        # Get schema from state - throw error if not available
        schema_data = state.get("invoice_schema")
        if not schema_data:
            log_yellow("Schema not found in state, this is required")
            raise ResourceNotFoundError("Invoice schema not found in state")
        else:
            log_blue("Using schema from state")
        
        # Extract header-level and line-item fields from schema
        header_level_fields = []
        line_item_fields = []
        
        # Get all top-level properties from schema (header fields)
        if "schema" in schema_data and "properties" in schema_data["schema"]:
            header_level_fields = list(schema_data["schema"]["properties"].keys())
            
            # Extract line item fields from line_items schema
            if "line_items" in schema_data["schema"]["properties"]:
                line_items_schema = schema_data["schema"]["properties"]["line_items"]
                if "items" in line_items_schema and "properties" in line_items_schema["items"]:
                    line_item_fields = list(line_items_schema["items"]["properties"].keys())
        
        # Remove "line_items" from header fields as it's a special case
        if "line_items" in header_level_fields:
            header_level_fields.remove("line_items")
            
        # Add _source_page as a valid line item field (used internally)
        if "_source_page" not in line_item_fields:
            line_item_fields.append("_source_page")
            
        log_blue(f"Extracted {len(header_level_fields)} header fields from schema")
        log_blue(f"Extracted {len(line_item_fields)} line item fields from schema")
        
        # Process each unique invoice
        merged_invoices = []
        
        for invoice_number, data in invoice_collections.items():
            log_blue(f"Processing invoice: {invoice_number}")
            
            # Get multipage data
            invoice_pages = data.get("pages", [])
            log_blue(f"Pages associated with this invoice: {invoice_pages}")
            
            # For multi-page invoices, prioritize information from the last page
            if len(invoice_pages) > 1:
                log_blue(f"This is a multi-page invoice - checking if we can get totals from the last page")
                
                # Sort pages numerically
                sorted_pages = sorted(invoice_pages, key=lambda x: int(x) if x.isdigit() else 0)
                
                # Get header data and line items
                header_data = data.get("header", {})
                line_items = data.get("line_items", [])
                
                # Group line items by page for logging
                items_by_page = {}
                for item in line_items:
                    page = item.get("_source_page")
                    if page:
                        if page not in items_by_page:
                            items_by_page[page] = []
                        items_by_page[page].append(item)
                
                # Log line items by page
                for page, items in items_by_page.items():
                    page_amount = sum(item.get("amount", 0) for item in items if isinstance(item.get("amount"), (int, float)))
                    log_blue(f"Page {page} line items total: {page_amount}")
            else:
                # Simple case - single page invoice
                header_data = data.get("header", {})
                line_items = data.get("line_items", [])
            
            log_blue(f"Header data has {len(header_data)} fields")
            log_blue(f"Line items count: {len(line_items)}")
            
            # Copy the header_data to preserve all fields
            merged_data = header_data.copy()
            
            # Ensure invoice number is always included
            merged_data["invoice_number"] = invoice_number
            
            # Add country codes to merged data if they exist
            if supplier_country_code and "supplier_country_code" not in merged_data:
                merged_data["supplier_country_code"] = supplier_country_code
                log_blue(f"Added supplier country code: {supplier_country_code}")
            
            if buyer_country_code and "buyer_country_code" not in merged_data:
                merged_data["buyer_country_code"] = buyer_country_code
                log_blue(f"Added buyer country code: {buyer_country_code}")
            
            if ship_to_country_code and "ship_to_country_code" not in merged_data:
                merged_data["ship_to_country_code"] = ship_to_country_code
                log_blue(f"Added ship-to country code: {ship_to_country_code}")
            
            # Clean line items to remove header-level fields and standardize
            cleaned_line_items = []
            for item in line_items:
                # Create a new line item with only appropriate fields
                cleaned_item = {}
                for field in line_item_fields:
                    if field in item and field != "_source_page":  # Remove _source_page from final output
                        cleaned_item[field] = item[field]
                
                cleaned_line_items.append(cleaned_item)
            
            # Add cleaned line items
            merged_data["line_items"] = cleaned_line_items
            
            # Add page tracking information to the merged data
            merged_data["_page_tracking"] = {
                "pages": invoice_pages,
                "method": page_tracking.get("method", extraction_method)
            }
            
            # Remove any line-item specific fields that were incorrectly put at header level
            for field in list(merged_data.keys()):
                if field not in header_level_fields and field != "line_items" and not field.startswith("_"):
                    log_yellow(f"Removing non-header field '{field}' from header level")
                    merged_data.pop(field)
            
            log_blue(f"Merged data created with {len(merged_data)} fields")
            log_blue(f"Cleaned line items from {len(line_items)} to {len(cleaned_line_items)} items")
            
            # Add to the list of merged invoices
            merged_invoices.append(merged_data)
            log_blue(f"Added invoice {invoice_number} to merged_invoices list")
        
        # If only one invoice, use it directly, otherwise include all
        if len(merged_invoices) == 1:
            invoice_data = merged_invoices[0]
            log_green(f"Successfully merged single invoice with {len(invoice_data.get('line_items', []))} line items")
            
            # Log specific fields for debugging
            log_blue(f"Final invoice number: {invoice_data.get('invoice_number')}")
            log_blue(f"Final issue date: {invoice_data.get('issue_date')}")
            log_blue(f"Final total: {invoice_data.get('total')}")
            log_blue(f"Final supplier country code: {invoice_data.get('supplier_country_code')}")
            
            log_blue("Returning Command to go to prepare_response with single invoice")
            return Command(
                update={
                    "invoice_data": invoice_data,
                    "status": "data_merged",
                    "extraction_method": extraction_method,
                    "page_tracking": page_tracking
                },
                goto="prepare_response"
            )
        else:
            # Multiple invoices - create a collection response
            log_green(f"Successfully extracted {len(merged_invoices)} invoices")
            
            log_blue("Returning Command to go to prepare_response with multiple invoices")
            return Command(
                update={
                    "invoice_data": merged_invoices[0],  # Use the first one as primary
                    "all_invoices": merged_invoices,     # Include all invoices
                    "status": "data_merged_multiple",
                    "extraction_method": extraction_method + "_multiple",
                    "page_tracking": page_tracking
                },
                goto="prepare_response"
            )
        
    except ResourceNotFoundError as e:
        error_msg = f"Schema not found: {str(e)}"
        log_red(error_msg)
        return Command(
            update={"status": "error", "error": error_msg},
            goto="handle_error"
        )
    except Exception as e:
        error_msg = f"Error merging invoice data: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={"status": "error", "error": error_msg},
            goto="handle_error"
        )


def prepare_response(state: AgentState) -> Command[Literal[END, "handle_error"]]:
    """Prepare the response with the extracted invoice data including page tracking information."""
    log_blue(f"Entering prepare_response with state status: {state.get('status')}")
    
    if state.get("status") == "error":
        log_red("State has error status, creating error response")
        error_response = {
            "status": "error",
            "error": state.get("error") or "Unknown error during extraction",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_yellow(f"Preparing error response: {json.dumps(error_response, indent=2)}")
        
        return Command(
            update={
                "output": error_response
            },
            goto=END
        )
    
    if not state.get("invoice_data"):
        log_red("No invoice_data found in state, creating error response")
        error_response = {
            "status": "error",
            "error": "Missing invoice data in state",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_yellow(f"Preparing error response for missing data: {json.dumps(error_response, indent=2)}")
        
        return Command(
            update={
                "output": error_response
            },
            goto=END
        )
    
    try:
        invoice_data = state.get("invoice_data", {})
        all_invoices = state.get("all_invoices", [])
        supplier_name = state.get("supplier_name", "")
        extraction_method = state.get("extraction_method", "text")
        status = state.get("status", "")
        page_tracking = state.get("page_tracking", {})
        invoice_collections = state.get("invoice_collections", {})
        
        log_cyan(f"Preparing response for invoice from {supplier_name}")
        log_blue(f"Invoice data contains {len(invoice_data)} fields")
        
        if 'line_items' in invoice_data:
            log_blue(f"Invoice contains {len(invoice_data['line_items'])} line items")
        
        # Standardize invoice data for final output
        # Remove internal tracking fields that start with underscore
        def clean_internal_fields(data):
            if isinstance(data, dict):
                return {k: clean_internal_fields(v) for k, v in data.items() 
                        if not k.startswith('_')}
            elif isinstance(data, list):
                return [clean_internal_fields(item) for item in data]
            else:
                return data
        
        # Initialize simplified page tracking
        simplified_page_tracking = {
            "method": page_tracking.get("method", extraction_method),
            "invoice_to_pages": {},
            "page_line_item_counts": {}  # Simple counts of line items per page
        }
        
        # Build simplified page tracking from invoice_collections
        if invoice_collections:
            for inv_num, data in invoice_collections.items():
                # Initialize tracking for this invoice
                if inv_num not in simplified_page_tracking["invoice_to_pages"]:
                    simplified_page_tracking["invoice_to_pages"][inv_num] = []
                
                # Add page information
                if "pages" in data and data["pages"]:
                    simplified_page_tracking["invoice_to_pages"][inv_num] = data["pages"]
                
                # Count line items per page
                if "line_items" in data and len(data["line_items"]) > 0:
                    # Group and count line items by page
                    page_counts = {}
                    for item in data["line_items"]:
                        if "_source_page" in item and item["_source_page"]:
                            page = item["_source_page"]
                            if page not in page_counts:
                                page_counts[page] = 0
                            page_counts[page] += 1
                    
                    # Add to the tracking structure
                    for page, count in page_counts.items():
                        page_key = f"{inv_num}_{page}"
                        simplified_page_tracking["page_line_item_counts"][page_key] = count
                        log_blue(f"Page {page} of invoice {inv_num} has {count} line items")
        
        # Check if we have multiple invoices
        if status == "data_merged_multiple" and len(all_invoices) > 1:
            log_blue(f"Preparing multi-invoice response with {len(all_invoices)} invoices")
            
            # Clean internal fields from all invoices
            cleaned_invoices = [clean_internal_fields(invoice) for invoice in all_invoices]
            
            # Multi-invoice response
            invoice_response = {
                "status": "success",
                "supplier_name": supplier_name,
                "brand_name": state.get("brand_name", ""),
                "invoice_count": len(cleaned_invoices),
                "invoices": cleaned_invoices,
                "extraction_method": extraction_method,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "page_tracking": simplified_page_tracking
            }
        else:
            log_blue("Preparing single invoice response")
            
            # Clean internal fields from the invoice
            cleaned_invoice = clean_internal_fields(invoice_data)
            
            # Single invoice response
            invoice_response = {
                "status": "success",
                "supplier_name": supplier_name,
                "brand_name": state.get("brand_name", ""),
                "invoice_data": cleaned_invoice,
                "extraction_method": extraction_method,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "page_tracking": simplified_page_tracking
            }
        
        log_blue(f"Response prepared with status: {invoice_response['status']}")
        log_blue(f"Response extraction method: {invoice_response['extraction_method']}")
        log_blue(f"Simplified page tracking: {json.dumps(simplified_page_tracking, indent=2)}")
        
        # Log the size of the prepared response
        response_size = len(json.dumps(invoice_response))
        log_blue(f"Response size: {response_size} characters")
        
        # Return command with updated state
        log_blue("Setting output in state and returning END command")
        return Command(
            update={
                "output": invoice_response,
                "status": "response_prepared"
            },
            goto=END
        )
    except Exception as e:
        error_msg = f"Error preparing response: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        return Command(
            update={
                "status": "error",
                "error": error_msg,
                "output": {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            },
            goto="handle_error"
        )


def handle_error(state: AgentState) -> None:
    """Handle all errors and end the graph execution."""
    log_red("Error handler node invoked")
    
    try:
        # Format the error message
        error_response = {
            "status": "error",
            "error": state.get("error") or "Unknown error during invoice extraction",
            "error_origin": state.get("status"),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_yellow(f"Error details: {json.dumps(error_response, indent=2)}")

        try:           
            header_id = state.get("id")
            if header_id:
                # Try to update existing record, or insert a minimal failed record
                success = inserter.update_invoice_status_by_id(header_id, "Failed")
                
                if success:
                    log_green(f"Updated invoice status to 'failed' for ID: {header_id}")
                else:
                    log_yellow(f"Could not update status to 'failed' for ID: {header_id}")
            else:
                log_yellow("No header ID found, cannot update status to 'failed'")
                
        except Exception as db_error:
            log_yellow(f"Error updating status to 'failed': {str(db_error)}")
                
        # Update state with error output
        state["output"] = error_response
        
    except Exception as e:
        # If error handling itself fails, log it but don't try to handle it again
        log_red(f"Error in error handler: {str(e)}")
        log_red(traceback.format_exc())
    
    # No need to return anything as this is a terminal node
    return None


def create_agent():
    """Create the langgraph agent graph."""
    log_cyan("Creating invoice extraction agent graph")
    
    # Create a new graph
    builder = StateGraph(AgentState)
    
    # Add nodes to the graph
    builder.add_node("parse_message", parse_message)
    builder.add_node("identify_supplier", identify_supplier)
    builder.add_node("extract_country_codes", extract_country_codes)
    builder.add_node("extract_invoice_data", extract_invoice_data)
    builder.add_node("extract_invoice_data_image", extract_invoice_data_image)
    builder.add_node("merge_invoice_data", merge_invoice_data)
    builder.add_node("prepare_response", prepare_response)
    builder.add_node("handle_error", handle_error)
    
    # Set entry point 
    builder.add_edge(START, "parse_message")
    
    # A checkpointer is required for `interrupt` to work.
    checkpointer = InMemorySaver()
    
    # Compile the graph
    graph = builder.compile(checkpointer=checkpointer)
    
    log_cyan("Invoice extraction agent graph compiled successfully")
    return graph


# Create the agent
agent = create_agent()

def standardize_extraction_output(output, processing_method):
    """
    Standardize the output format between text and image extraction methods with simplified page tracking.
    Also adds calculated financials for comparison with extracted values.
    
    Args:
        output: The raw extraction output
        processing_method: 'text' or 'image'
        
    Returns:
        Standardized output with consistent page tracking and calculated financials
    """
    import copy
    
    # Create a deep copy to avoid modifying the original
    standardized = copy.deepcopy(output)
    
    # Add processing method to the output
    standardized["processing_method"] = processing_method
    
    print(f"DEBUG: Standardizing output with keys: {list(output.keys())}")
    
    # Initialize simplified page tracking
    standardized["page_tracking"] = {
        "method": processing_method,
        "invoice_to_pages": {},
        "page_line_item_counts": {}  # Simple counts of line items per page
    }
    
    # If there's existing page tracking, use it as a starting point
    if "page_tracking" in output and isinstance(output["page_tracking"], dict):
        if "method" in output["page_tracking"]:
            standardized["page_tracking"]["method"] = output["page_tracking"]["method"]
        if "invoice_to_pages" in output["page_tracking"]:
            standardized["page_tracking"]["invoice_to_pages"] = copy.deepcopy(output["page_tracking"]["invoice_to_pages"])
        if "page_line_item_counts" in output["page_tracking"]:
            standardized["page_tracking"]["page_line_item_counts"] = copy.deepcopy(output["page_tracking"]["page_line_item_counts"])
            print(f"DEBUG: Using existing page line item counts")
    
    # Get all invoice numbers
    all_invoice_numbers = set()
    
    # From invoice_data
    if "invoice_data" in standardized and isinstance(standardized["invoice_data"], dict):
        if "invoice_number" in standardized["invoice_data"]:
            invoice_number = standardized["invoice_data"]["invoice_number"]
            all_invoice_numbers.add(invoice_number)
            
            # Make sure this invoice is in page tracking
            if invoice_number not in standardized["page_tracking"]["invoice_to_pages"]:
                standardized["page_tracking"]["invoice_to_pages"][invoice_number] = []
            
            # Count line items per page
            if "line_items" in standardized["invoice_data"]:
                # Count by source page
                page_counts = {}
                for item in standardized["invoice_data"]["line_items"]:
                    if "_source_page" in item and item["_source_page"]:
                        page = item["_source_page"]
                        # Add page to invoice_to_pages if not there
                        if page not in standardized["page_tracking"]["invoice_to_pages"][invoice_number]:
                            standardized["page_tracking"]["invoice_to_pages"][invoice_number].append(page)
                        
                        # Count line items
                        if page not in page_counts:
                            page_counts[page] = 0
                        page_counts[page] += 1
                        
                        # Store the _source_page temporarily but remove it later
                        pass
                
                # Add counts to tracking
                for page, count in page_counts.items():
                    page_key = f"{invoice_number}_{page}"
                    standardized["page_tracking"]["page_line_item_counts"][page_key] = count
                    print(f"DEBUG: Page {page} of invoice {invoice_number} has {count} line items")
                
                # Calculate financial totals
                calculated_subtotal = sum(item.get("amount", 0) for item in standardized["invoice_data"]["line_items"] 
                                       if isinstance(item.get("amount"), (int, float)))
                
                # Add calculated financials to the output
                standardized["invoice_data"]["calculated_financials"] = {
                    "subtotal": calculated_subtotal,
                    "total": calculated_subtotal,  # Without tax information, total equals subtotal
                }
                
                print(f"DEBUG: Extracted subtotal: {standardized['invoice_data'].get('subtotal')}")
                print(f"DEBUG: Calculated subtotal: {calculated_subtotal}")
                print(f"DEBUG: Extracted total: {standardized['invoice_data'].get('total')}")
                
                # Remove _source_page from each line item
                for item in standardized["invoice_data"]["line_items"]:
                    if "_source_page" in item:
                        del item["_source_page"]
    
    # From invoices (multi-invoice case)
    if "invoices" in standardized and isinstance(standardized["invoices"], list):
        for invoice in standardized["invoices"]:
            if "invoice_number" in invoice:
                invoice_number = invoice["invoice_number"]
                all_invoice_numbers.add(invoice_number)
                
                # Make sure this invoice is in page tracking
                if invoice_number not in standardized["page_tracking"]["invoice_to_pages"]:
                    standardized["page_tracking"]["invoice_to_pages"][invoice_number] = []
                
                # Count line items per page
                if "line_items" in invoice:
                    # Count by source page
                    page_counts = {}
                    for item in invoice["line_items"]:
                        if "_source_page" in item and item["_source_page"]:
                            page = item["_source_page"]
                            # Add page to invoice_to_pages if not there
                            if page not in standardized["page_tracking"]["invoice_to_pages"][invoice_number]:
                                standardized["page_tracking"]["invoice_to_pages"][invoice_number].append(page)
                            
                            # Count line items
                            if page not in page_counts:
                                page_counts[page] = 0
                            page_counts[page] += 1
                    
                    # Add counts to tracking
                    for page, count in page_counts.items():
                        page_key = f"{invoice_number}_{page}"
                        standardized["page_tracking"]["page_line_item_counts"][page_key] = count
                        print(f"DEBUG: Page {page} of invoice {invoice_number} has {count} line items")
                    
                    # Calculate financial totals
                    calculated_subtotal = sum(item.get("amount", 0) for item in invoice["line_items"] 
                                           if isinstance(item.get("amount"), (int, float)))
                    
                    # Add calculated financials to the output
                    invoice["calculated_financials"] = {
                        "subtotal": calculated_subtotal,
                        "total": calculated_subtotal,  # Without tax information, total equals subtotal
                    }
                    
                    print(f"DEBUG: Invoice {invoice_number} - Extracted subtotal: {invoice.get('subtotal')}")
                    print(f"DEBUG: Invoice {invoice_number} - Calculated subtotal: {calculated_subtotal}")
                    print(f"DEBUG: Invoice {invoice_number} - Extracted total: {invoice.get('total')}")
                    
                    # Remove _source_page from each line item
                    for item in invoice["line_items"]:
                        if "_source_page" in item:
                            del item["_source_page"]
    
    # Process invoice_collections if available
    if "invoice_collections" in output and isinstance(output["invoice_collections"], dict):
        print(f"DEBUG: Processing invoice_collections for page tracking")
        
        for inv_num, data in output["invoice_collections"].items():
            all_invoice_numbers.add(inv_num)
            
            # Make sure this invoice is in page tracking
            if inv_num not in standardized["page_tracking"]["invoice_to_pages"]:
                standardized["page_tracking"]["invoice_to_pages"][inv_num] = []
            
            # Add page information
            if "pages" in data and data["pages"]:
                for page in data["pages"]:
                    if page not in standardized["page_tracking"]["invoice_to_pages"][inv_num]:
                        standardized["page_tracking"]["invoice_to_pages"][inv_num].append(page)
            
            # Count line items per page
            if "line_items" in data and isinstance(data["line_items"], list):
                # Count by source page
                page_counts = {}
                for item in data["line_items"]:
                    if "_source_page" in item and item["_source_page"]:
                        page = item["_source_page"]
                        
                        # Count line items
                        if page not in page_counts:
                            page_counts[page] = 0
                        page_counts[page] += 1
                
                # Add counts to tracking
                for page, count in page_counts.items():
                    page_key = f"{inv_num}_{page}"
                    standardized["page_tracking"]["page_line_item_counts"][page_key] = count
                    print(f"DEBUG: From collections: Page {page} of invoice {inv_num} has {count} line items")
    
    # Sort pages for each invoice
    for inv_num in standardized["page_tracking"]["invoice_to_pages"]:
        standardized["page_tracking"]["invoice_to_pages"][inv_num].sort()
    
    # Remove invoice_collections from standardized output
    if "invoice_collections" in standardized:
        del standardized["invoice_collections"]
    
    print(f"DEBUG: Final simplified page tracking: {json.dumps(standardized['page_tracking'], indent=2)}")
    
    return standardized

def process_invoice(invoice_json):
    """
    Process a single invoice by running the agent graph.
    Standardizes the output and saves to a JSON file with name based on the PDF and processing method.
    """
    import os
    import json
    from datetime import datetime
    import uuid
    from pathlib import Path

    # Initialize logging configuration
    agent_logger.initialize_config()
    
    # Parse the invoice request to get the invoice path and processing method
    try:
        invoice_request = json.loads(invoice_json)
        invoice_path = invoice_request.get("invoice_path", "")
        processing_method = invoice_request.get("processing_method", "text")
    except Exception as e:
        log_red(f"Error parsing invoice JSON: {str(e)}")
        return {
            "status": "error",
            "error": f"Error parsing invoice JSON: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    
    # Create the agent
    agent_graph = create_agent()
    
    thread_id = str(uuid.uuid4())
    log_green(f"Started thread: {thread_id}")

    # Initialize state with the input
    initial_state = {
        "input": invoice_json, 
        "status": "new", 
        "thread_id": thread_id,
        "id": invoice_request.get("transaction_id", "")
    }

    # Set state for logging system
    agent_logger.set_state(initial_state)
    
    try:
        # Process message with the graph
        thread_config = {"configurable": {"thread_id": thread_id}}
        
        log_blue("Invoking agent graph with initial state")
        final_state = agent_graph.invoke(initial_state, config=thread_config)
        log_blue(f"Agent graph execution completed with final state keys: {', '.join(final_state.keys())}")

        # Update logging state to final state
        # agent_logger.set_state(final_state)
        
        if "output" not in final_state:
            log_red("No 'output' field in final state!")
            error_output = {
                "status": "error",
                "error": "Missing 'output' in final state",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # Create filename for error output
            base_filename = os.path.splitext(os.path.basename(invoice_path))[0]
            output_filename = f"output/{base_filename}_{processing_method}_error.json"
            
            # Write to JSON file
            with open(output_filename, 'w', encoding='utf-8') as f:
                json.dump(error_output, f, indent=2)
                
            log_yellow(f"Error output written to {output_filename}")
            return error_output, output_filename
        
        # Get the final output
        output = final_state["output"]
        
        # Add the original invoice file path to the output
        output["original_invoice_path"] = Path("invoice_store/"+invoice_path).absolute().as_posix()
        
        # Standardize the output (add page tracking consistency)
        standardized_output = standardize_extraction_output(output, processing_method)
        
        # Create output filename based on PDF name and processing method
        base_filename = os.path.splitext(os.path.basename(invoice_path))[0]
        output_filename = f"output/{base_filename}_{processing_method}_output.json"
        
        # Write the output to a JSON file
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(standardized_output, f, indent=2)
        
        log_green(f"Successfully processed invoice, output written to {output_filename}")

        # Save session logs at the end
        agent_logger.save_session_logs()

        return standardized_output, output_filename
        
    except Exception as e:
        error_msg = f"Error processing invoice: {str(e)}"
        log_red(error_msg)
        log_red(traceback.format_exc())
        
        # Create error output
        error_output = {
            "status": "error",
            "error": error_msg,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "original_invoice_path": invoice_path  # Include file path even in errors
        }
        
        # Create filename for error output
        base_filename = os.path.splitext(os.path.basename(invoice_path))[0]
        output_filename = f"output/{base_filename}_{processing_method}_error.json"
        
        # Write to JSON file
        try:
            with open(output_filename, 'w', encoding='utf-8') as f:
                json.dump(error_output, f, indent=2)
            log_yellow(f"Error output written to {output_filename}")
        except Exception as json_error:
            log_red(f"Error writing to JSON file: {str(json_error)}")

        # Save logs even on error
        agent_logger.save_session_logs()
        
        return error_output, output_filename
    
def insert_into_db(output_filename, header_id):
    """
    Insert the processed invoice into database using the same inserter instance
    """
    try:
        # Load the processed JSON
        with open(output_filename, 'r', encoding='utf-8') as f:
            original_json = json.load(f)
        
        # Check if processing was successful
        if original_json.get('status') != 'success':
            log_red(f"Skipping database insert - processing failed: {original_json.get('error', 'Unknown error')}")
            return None
        
        # Transform to expected format
        transformed_json = transform_invoice_json(original_json, header_id=header_id)

        # Update existing header with full data using the same inserter instance
        invoice_id = inserter.update_full_invoice_data(transformed_json, header_id=header_id)
        
        # Get the original file path from the JSON
        original_file_path = original_json.get('original_invoice_path', '')
        
        if original_file_path:
            inserter._insert_file_for_existing_invoice(invoice_id, original_file_path)
        
        log_green(f"Successfully inserted invoice with ID: {invoice_id}")
        return invoice_id
        
    except Exception as e:
        log_red(f"Error inserting into database: {str(e)}")
        return None

def process_main(invoice_json, skip_db_insert=False):
    """
    Main processing function that handles both extraction and database insertion
    Similar to the notebook workflow
    
    Args:
        invoice_json: JSON string with invoice processing parameters
        skip_db_insert: If True, skips database insertion (useful for development)
    """
    import os
    import json
    from datetime import datetime
    from pathlib import Path

    # Parse the invoice request to get the transaction ID
    try:
        invoice_request = json.loads(invoice_json)
        transaction_id = invoice_request.get("transaction_id", "")
    except Exception as e:
        log_red(f"Error parsing invoice JSON: {str(e)}")
        return {
            "status": "error",
            "error": f"Error parsing invoice JSON: {str(e)}",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    log_green(f"Starting processing for transaction ID: {transaction_id}")
    
    # Step 1: Process the invoice (extraction)
    result, output_filename = process_invoice(invoice_json)
    
    # Step 2: Insert into database if processing was successful and not skipped
    if skip_db_insert:
        log_blue("Skipping database insert (development mode)")
        return result
    
    if result.get('status') == 'success' and transaction_id:
        log_green("Processing successful, inserting into database...")
        invoice_id = insert_into_db(output_filename, transaction_id)
        
        if invoice_id:
            log_green(f"Successfully inserted invoice into database with ID: {invoice_id}")
            # Add the database ID to the result
            result["invoice_header_id"] = invoice_id
        else:
            log_yellow("Failed to insert invoice into database")
            result["status"] = "error"
            result["error"] = "Failed to insert invoice into database"
    else:
        log_yellow(f"Skipping database insert - processing status: {result.get('status')}")
        if not transaction_id:
            log_yellow("No transaction ID provided")
    
    return result



