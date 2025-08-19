from typing import Callable
import logging
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json

# Define ANSI color codes for console output
class Colors:
    GREEN = "\033[92m"      # Success
    RED = "\033[91m"        # Error
    YELLOW = "\033[93m"     # Warning
    BLUE = "\033[94m"       # Info
    CYAN = "\033[96m"       # Debug
    BOLD = "\033[1m"        # Bold
    UNDERLINE = "\033[4m"   # Underline
    RESET = "\033[0m"       # Reset all formatting

# Create a colored formatter for console output
class ColoredFormatter(logging.Formatter):
    """
    A formatter that adds colors to logs based on level
    """
    FORMATS = {
        logging.DEBUG: Colors.CYAN + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.INFO: Colors.BLUE + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.WARNING: Colors.YELLOW + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.ERROR: Colors.RED + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Colors.RESET,
        logging.CRITICAL: Colors.RED + Colors.BOLD + "%(asctime)s - %(name)s - %(levelname)s - %(message)s" + Colors.RESET
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt, datefmt="%Y-%m-%d %H:%M:%S")
        return formatter.format(record)

# Configure logging
logger = logging.getLogger("invoice-api")
logger.setLevel(logging.INFO)

# Add console handler with colors
console_handler = logging.StreamHandler()
console_handler.setFormatter(ColoredFormatter())
logger.addHandler(console_handler)

# Optionally add a file handler for persistent logs (without colors)
file_handler = logging.FileHandler("api.log")
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))
logger.addHandler(file_handler)

# Remove the root logger handlers to avoid duplicate logs
logger.propagate = False


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests and responses with color coding
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        
        # Start timer for request duration
        start_time = time.time()
        
        # Extract request details
        method = request.method
        url = str(request.url)
        client_host = request.client.host if request.client else "unknown"
        
        # Log the request
        logger.info(
            f"Request started | ID: {request_id} | {method} {url} | "
            f"Client: {client_host}"
        )
        
        # Try to extract and log request body for non-GET requests
        if method != "GET":
            try:
                # Need to create a copy as we can only read the body once
                body_bytes = await request.body()
                request._body = body_bytes  # Save the body for later use
                
                # Try to parse as JSON, if applicable
                try:
                    body = json.loads(body_bytes)
                    logger.debug(f"Request body | ID: {request_id} | {json.dumps(body)}")
                except:
                    # If not JSON, log as string (truncated if large)
                    body_str = body_bytes.decode('utf-8', errors='replace')
                    if len(body_str) > 1000:
                        body_str = body_str[:1000] + "... (truncated)"
                    logger.debug(f"Request body | ID: {request_id} | {body_str}")
            except Exception as e:
                logger.warning(f"Failed to log request body | ID: {request_id} | Error: {str(e)}")
        
        # Process the request
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Color code based on status code
            if response.status_code < 400:  # Success
                # Use explicit success message with green color
                success_msg = (
                    f"{Colors.GREEN}Request completed successfully | ID: {request_id} | "
                    f"{method} {url} | Status: {response.status_code} | "
                    f"Duration: {duration:.4f}s{Colors.RESET}"
                )
                logger.info(success_msg)
            elif response.status_code < 500:  # Client error
                warning_msg = (
                    f"{Colors.YELLOW}Request completed with client error | ID: {request_id} | "
                    f"{method} {url} | Status: {response.status_code} | "
                    f"Duration: {duration:.4f}s{Colors.RESET}"
                )
                logger.warning(warning_msg)
            else:  # Server error
                error_msg = (
                    f"{Colors.RED}Request completed with server error | ID: {request_id} | "
                    f"{method} {url} | Status: {response.status_code} | "
                    f"Duration: {duration:.4f}s{Colors.RESET}"
                )
                logger.error(error_msg)
            
            # Add request ID to response headers for tracking
            response.headers["X-Request-ID"] = request_id
            
            return response
        except Exception as e:
            # Log any unhandled exceptions
            duration = time.time() - start_time
            error_msg = (
                f"{Colors.RED}{Colors.BOLD}Request failed | ID: {request_id} | "
                f"{method} {url} | Error: {str(e)} | "
                f"Duration: {duration:.4f}s{Colors.RESET}"
            )
            logger.error(error_msg, exc_info=True)
            raise  # Re-raise the exception after logging