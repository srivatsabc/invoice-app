import pyodbc
import os
import logging
import sys
from datetime import datetime
import uuid

# Define color codes for logging
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    YELLOW = '\033[93m'
    BOLD = '\033[1m'
    ENDC = '\033[0m'

# Create a colored formatter
class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to levelname"""
    FORMATS = {
        logging.DEBUG: Colors.BLUE + "%(message)s" + Colors.ENDC,
        logging.INFO: Colors.GREEN + "%(message)s" + Colors.ENDC,
        logging.WARNING: Colors.YELLOW + "%(message)s" + Colors.ENDC,
        logging.ERROR: Colors.RED + "%(message)s" + Colors.ENDC,
        logging.CRITICAL: Colors.RED + Colors.BOLD + "%(message)s" + Colors.ENDC
    }

    def format(self, record):
        log_format = self.FORMATS.get(record.levelno, "%(message)s")
        formatter = logging.Formatter(log_format)
        return formatter.format(record)

def setup_colored_logger(name="colored_logger"):
    """Setup and return a colored logger"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Clear any existing handlers
    if logger.handlers:
        logger.handlers = []
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter())
    logger.addHandler(console_handler)
    
    return logger

class AgentLogger:
    def __init__(self):
        self.logging_enabled = True
        self.logging_level = "INFO"
        self.current_state = None
        self.logger = setup_colored_logger("invoice_extraction_agent")
        
    def initialize_config(self):
        """Initialize logging configuration from database"""
        try:
            with pyodbc.connect(os.getenv("DBConnectionStringGwh")) as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    SELECT is_active, value FROM agent_control_center 
                    WHERE control = 'logging'
                """)
                
                result = cursor.fetchone()
                if result:
                    self.logging_enabled = bool(result[0])  # is_active flag
                    self.logging_level = result[1]  # value (INFO, DEBUG, etc.)
                else:
                    # Default to DISABLED when no entry exists
                    print("No logging configuration found in database - logging disabled")
                    self.logging_enabled = False
                    self.logging_level = "INFO"
                    
        except Exception as e:
            print(f"Error loading logging config: {e}")
            # Default to DISABLED on error too
            self.logging_enabled = False
            self.logging_level = "INFO"
    
    def set_state(self, state):
        """Set the current state for logging"""
        self.current_state = state
        
        # Generate session ID if not exists
        if "id" not in state:
            state["id"] = str(uuid.uuid4())
        
        # Initialize session logs if not exists
        if "session_logs" not in state:
            state["session_logs"] = []
    
    def should_log(self, level):
        """Check if we should log based on current logging level for session/db logging only"""
        if not self.logging_enabled:
            return False
        
        level_hierarchy = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4
        }
        
        current_level_num = level_hierarchy.get(self.logging_level, 1)
        log_level_num = level_hierarchy.get(level, 1)
        
        return log_level_num >= current_level_num
    
    def add_to_session_log(self, level, message):
        """Add log entry to session logs"""
        if self.should_log(level) and self.current_state:
            # Ensure session_logs exists
            if "session_logs" not in self.current_state:
                self.current_state["session_logs"] = []
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = f"[{timestamp}] [{level}] {message}"
            self.current_state["session_logs"].append(log_entry)
            
            # Debug: Print how many logs we have so far
            print(f"DEBUG: Added log entry. Total logs: {len(self.current_state['session_logs'])}")
    
    def save_session_logs(self):
        """Save all session logs to database"""
        if not self.logging_enabled or not self.current_state or "session_logs" not in self.current_state or not self.current_state["session_logs"]:
            return
        
        session_id = self.current_state.get("id")
        if not session_id:
            return
        
        try:
            print(f"DEBUG: Saving {len(self.current_state['session_logs'])} log entries to database")
            # Add double newlines for better readability
            separator = "\r\n" + "="*80 + "\r\n"
            combined_logs = separator.join(self.current_state["session_logs"])
            log_with_id = f"Session ID: {session_id}\r\n{'='*80}\r\n{combined_logs}\r\n{'='*80}"
            
            print(f"DEBUG: Combined log length: {len(log_with_id)} characters")
            
            with pyodbc.connect(os.getenv("DBConnectionStringGwh")) as connection:
                cursor = connection.cursor()
                cursor.execute("""
                    INSERT INTO agent_control_center_logs (log, transaction_id) 
                    VALUES (?, ?)
                """, (log_with_id, session_id))  # Add session_id as transaction_id
                connection.commit()
                print("DEBUG: Successfully saved logs to database")
                
        except Exception as e:
            print(f"Error saving session logs: {e}")
    
    # Logging methods
    def log_blue(self, msg):
        self.add_to_session_log("DEBUG", msg)
        self.logger.debug(msg)
    
    def log_green(self, msg):
        self.add_to_session_log("INFO", msg)
        self.logger.info(msg)
    
    def log_yellow(self, msg):
        self.add_to_session_log("WARNING", msg)
        self.logger.warning(msg)
    
    def log_red(self, msg):
        self.add_to_session_log("ERROR", msg)
        self.logger.error(msg)
    
    def log_cyan(self, msg):
        self.add_to_session_log("INFO", msg)
        
        # For cyan, we'll use a custom format
        cyan_formatter = logging.Formatter(Colors.CYAN + "%(message)s" + Colors.ENDC)
        
        # Store the original formatter
        original_formatter = self.logger.handlers[0].formatter
        
        # Temporarily use the cyan formatter
        self.logger.handlers[0].setFormatter(cyan_formatter)
        
        # Log the message at INFO level (but with cyan color)
        self.logger.info(msg)
        
        # Restore the original formatter
        self.logger.handlers[0].setFormatter(original_formatter)

# Create global instance
agent_logger = AgentLogger()