from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
import uuid

from app.core.config import settings
from app.db.database import init_db
from app.api.routes import meshy, slant3d, stripe


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="DreamForge API",
    description="Backend API for DreamForge - AI-powered 3D model generation and printing",
    version="1.0.0",
    lifespan=lifespan
)

# Configure basic logging format if not already set by uvicorn
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Expose session and streaming-related headers for diagnostics
    expose_headers=["X-Session-ID", "Content-Length", "Content-Range", "ETag", "Last-Modified"],
)

# Correlation + access logging middleware
@app.middleware("http")
async def access_logger(request: Request, call_next):
    # Create per-request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    method = request.method
    path = request.url.path
    # Avoid logging sensitive query parameters; just show whether a query exists and its length
    query = request.url.query
    query_info = f"len={len(query)}" if query else "none"
    client_ip = request.client.host if request.client else "-"
    range_header = request.headers.get("range")
    referer = request.headers.get("referer")

    logging.getLogger(__name__).info(
        f"[{request_id}] REQ {method} {path} query={query_info} ip={client_ip} range={range_header} referer={referer}"
    )

    t0 = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as e:
        dt = int((time.perf_counter() - t0) * 1000)
        logging.getLogger(__name__).exception(f"[{request_id}] EXC {method} {path} after {dt}ms: {e}")
        raise

    # Attach the request ID for client correlation
    response.headers["X-Request-ID"] = request_id

    dt = int((time.perf_counter() - t0) * 1000)
    logging.getLogger(__name__).info(
        f"[{request_id}] RESP {method} {path} status={response.status_code} dur={dt}ms"
    )
    return response


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Include routers
app.include_router(meshy.router)
app.include_router(slant3d.router)
app.include_router(stripe.router)


@app.get("/")
async def root():
    return {
        "message": "DreamForge API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "Internal server error",
            "message": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.BACKEND_PORT,
        reload=True
    )