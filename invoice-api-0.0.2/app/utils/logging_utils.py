import logging
import functools
import inspect
import time
from typing import Callable, Any, Dict, Optional
import json

# Import color codes and logger from the middleware
from ..middleware.logging import logger, Colors


def log_function_call(func: Callable) -> Callable:
    """
    Decorator to log function calls, parameters and execution time with color coding
    """
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        # Get function details
        func_name = func.__qualname__
        module = inspect.getmodule(func)
        module_name = module.__name__ if module else "unknown"
        
        # Format arguments for logging (excluding self)
        log_args = args[1:] if len(args) > 0 and hasattr(args[0], '__class__') else args
        
        # Clean sensitive data from kwargs (like passwords, tokens)
        safe_kwargs = {k: ("*" * 8 if k.lower() in ('password', 'token', 'secret', 'key') else v) 
                       for k, v in kwargs.items()}
        
        # Log function call
        logger.debug(
            f"{Colors.CYAN}Function call | {module_name}.{func_name} | "
            f"Args: {log_args} | Kwargs: {safe_kwargs}{Colors.RESET}"
        )
        
        # Measure execution time
        start_time = time.time()
        
        try:
            # Execute the function
            result = await func(*args, **kwargs)
            
            # Log successful execution
            duration = time.time() - start_time
            logger.debug(
                f"{Colors.GREEN}Function completed | {module_name}.{func_name} | "
                f"Duration: {duration:.4f}s{Colors.RESET}"
            )
            
            return result
        except Exception as e:
            # Log exception
            duration = time.time() - start_time
            logger.error(
                f"{Colors.RED}Function failed | {module_name}.{func_name} | "
                f"Error: {str(e)} | Duration: {duration:.4f}s{Colors.RESET}",
                exc_info=True
            )
            raise  # Re-raise the exception
    
    @functools.wraps(func)
    def sync_wrapper(*args, **kwargs):
        # Get function details
        func_name = func.__qualname__
        module = inspect.getmodule(func)
        module_name = module.__name__ if module else "unknown"
        
        # Format arguments for logging (excluding self)
        log_args = args[1:] if len(args) > 0 and hasattr(args[0], '__class__') else args
        
        # Clean sensitive data from kwargs (like passwords, tokens)
        safe_kwargs = {k: ("*" * 8 if k.lower() in ('password', 'token', 'secret', 'key') else v) 
                       for k, v in kwargs.items()}
        
        # Log function call
        logger.debug(
            f"{Colors.CYAN}Function call | {module_name}.{func_name} | "
            f"Args: {log_args} | Kwargs: {safe_kwargs}{Colors.RESET}"
        )
        
        # Measure execution time
        start_time = time.time()
        
        try:
            # Execute the function
            result = func(*args, **kwargs)
            
            # Log successful execution
            duration = time.time() - start_time
            logger.debug(
                f"{Colors.GREEN}Function completed | {module_name}.{func_name} | "
                f"Duration: {duration:.4f}s{Colors.RESET}"
            )
            
            return result
        except Exception as e:
            # Log exception
            duration = time.time() - start_time
            logger.error(
                f"{Colors.RED}Function failed | {module_name}.{func_name} | "
                f"Error: {str(e)} | Duration: {duration:.4f}s{Colors.RESET}",
                exc_info=True
            )
            raise  # Re-raise the exception
    
    # Choose the appropriate wrapper based on whether the function is async or not
    if inspect.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


def log_event(event_type: str, message: str, details: Optional[Dict[str, Any]] = None, level: str = "info"):
    """
    Log application events with structured data and color coding
    
    Args:
        event_type: Type of event (e.g., 'user_login', 'data_export')
        message: Human-readable message
        details: Dictionary of event details
        level: Log level (debug, info, warning, error, critical)
    """
    # Create log data dictionary
    log_data = {
        "event_type": event_type,
        "message": message,
    }
    
    # Add details if provided
    if details:
        log_data["details"] = details
    
    # Convert to JSON
    log_json = json.dumps(log_data)
    
    # Color coding based on log level
    if level == "debug":
        logger.debug(f"{Colors.CYAN}EVENT | {log_json}{Colors.RESET}")
    elif level == "info":
        logger.info(f"{Colors.BLUE}EVENT | {log_json}{Colors.RESET}")
    elif level == "warning":
        logger.warning(f"{Colors.YELLOW}EVENT | {log_json}{Colors.RESET}")  
    elif level == "error":
        logger.error(f"{Colors.RED}EVENT | {log_json}{Colors.RESET}")
    elif level == "critical":
        logger.critical(f"{Colors.RED}{Colors.BOLD}EVENT | {log_json}{Colors.RESET}")
    else:
        logger.info(f"{Colors.BLUE}EVENT | {log_json}{Colors.RESET}")  # Default to info