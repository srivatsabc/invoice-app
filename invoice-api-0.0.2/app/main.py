from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, Response
import uvicorn
from .routers import invoice, dashboard, invoice_tester, sql_agent, prompt
from .routers import regions, prompt_registry, feedback, agent_logs, agent_control
from .middleware.logging import RequestLoggingMiddleware, logger, Colors

app = FastAPI(
    title="Invoice Management API",
    description="API for managing invoices and retrieving invoice data",
    version="0.0.1",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Add CORS middleware
origins = ['*']
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(invoice.router)
app.include_router(dashboard.router)
app.include_router(invoice_tester.router)
app.include_router(sql_agent.router)
app.include_router(prompt.router)
app.include_router(regions.router)
app.include_router(prompt_registry.router)
app.include_router(feedback.router)
app.include_router(agent_logs.router)
app.include_router(agent_control.router)

@app.get("/")
async def root():
    """
    Root endpoint that redirects to API documentation
    """
    logger.info(f"{Colors.GREEN}API server is running{Colors.RESET}")
    return {"message": "Invoice API is running. See /api/docs for documentation"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    """
    logger.info(f"{Colors.GREEN}Health check successful{Colors.RESET}")
    return {"status": "healthy", "version": "0.0.1"}

@app.on_event("startup")
async def startup_event():
    """
    Event handler that runs when the application starts
    """
    logger.info(f"{Colors.BLUE}{Colors.BOLD}=== Invoice API Starting Up ==={Colors.RESET}")
    logger.info(f"{Colors.BLUE}Version: 0.0.1{Colors.RESET}")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Event handler that runs when the application shuts down
    """
    logger.info(f"{Colors.YELLOW}{Colors.BOLD}=== Invoice API Shutting Down ==={Colors.RESET}")

if __name__ == "__main__":
    uvicorn.run(app, host='localhost', port=8088)