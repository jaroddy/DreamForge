from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
import httpx

from app.db.database import get_db
from app.services.meshy_service import MeshyService
from app.models.database import MeshyTask
from app.middleware.session_manager import SessionManager
from app.middleware.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/meshy", tags=["meshy"])


class PreviewRequest(BaseModel):
    prompt: str = Field(..., max_length=600)
    art_style: str = Field(default="realistic")
    ai_model: str = Field(default="meshy-5")
    seed: Optional[int] = None
    topology: str = Field(default="triangle")
    target_polycount: int = Field(default=30000, ge=100, le=300000)
    should_remesh: bool = Field(default=True)


class RefineRequest(BaseModel):
    preview_task_id: str
    enable_pbr: bool = Field(default=False)
    texture_prompt: Optional[str] = Field(None, max_length=600)
    texture_image_url: Optional[str] = None
    ai_model: str = Field(default="meshy-5")


@router.post("/preview")
async def create_preview(
    request: Request,
    preview_req: PreviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Text to 3D Preview task"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    # Check for session abuse
    if await SessionManager.check_session_abuse(session_id, db):
        raise HTTPException(status_code=403, detail="Session blocked")
    
    try:
        # Call Meshy API
        meshy_service = MeshyService()
        result = await meshy_service.create_preview(
            prompt=preview_req.prompt,
            art_style=preview_req.art_style,
            ai_model=preview_req.ai_model,
            seed=preview_req.seed,
            topology=preview_req.topology,
            target_polycount=preview_req.target_polycount,
            should_remesh=preview_req.should_remesh
        )
        
        # Store task in database
        task_id = result.get("result")
        meshy_task = MeshyTask(
            task_id=task_id,
            session_id=session_id,
            task_type="preview",
            prompt=preview_req.prompt,
            status="PENDING"
        )
        db.add(meshy_task)
        await db.commit()
        
        return {
            "success": True,
            "task_id": task_id,
            "session_id": session_id,
            "message": "Preview task created successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine")
async def create_refine(
    request: Request,
    refine_req: RefineRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Text to 3D Refine task"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get or create session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    # Check for session abuse
    if await SessionManager.check_session_abuse(session_id, db):
        raise HTTPException(status_code=403, detail="Session blocked")
    
    try:
        # Call Meshy API
        meshy_service = MeshyService()
        result = await meshy_service.create_refine(
            preview_task_id=refine_req.preview_task_id,
            enable_pbr=refine_req.enable_pbr,
            texture_prompt=refine_req.texture_prompt,
            texture_image_url=refine_req.texture_image_url,
            ai_model=refine_req.ai_model
        )
        
        # Store task in database
        task_id = result.get("result")
        meshy_task = MeshyTask(
            task_id=task_id,
            session_id=session_id,
            task_type="refine",
            prompt=refine_req.texture_prompt,
            status="PENDING",
            preview_task_id=refine_req.preview_task_id
        )
        db.add(meshy_task)
        await db.commit()
        
        return {
            "success": True,
            "task_id": task_id,
            "session_id": session_id,
            "message": "Refine task created successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}")
async def get_task(
    request: Request,
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the status of a Text to 3D task"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    try:
        # Call Meshy API
        meshy_service = MeshyService()
        result = await meshy_service.get_task(task_id)
        
        # Update task in database if it exists
        db_result = await db.execute(
            select(MeshyTask).where(MeshyTask.task_id == task_id)
        )
        task = db_result.scalar_one_or_none()
        
        if task:
            status = result.get("status", "PENDING")
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            
            # Add model URLs if available
            if status == "SUCCEEDED":
                if result.get("model_urls"):
                    model_urls = result["model_urls"]
                    if "glb" in model_urls:
                        update_data["model_url"] = model_urls["glb"]
                if result.get("texture_urls"):
                    texture_urls = result["texture_urls"]
                    if "base_color" in texture_urls:
                        update_data["texture_url"] = texture_urls["base_color"]
            
            await db.execute(
                update(MeshyTask)
                .where(MeshyTask.task_id == task_id)
                .values(**update_data)
            )
            await db.commit()
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_tasks(
    request: Request,
    page_num: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """List user's Text to 3D tasks"""
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # Get session
    session_id = await SessionManager.get_or_create_session(request, db)
    
    try:
        # Get tasks from database for this session
        result = await db.execute(
            select(MeshyTask)
            .where(MeshyTask.session_id == session_id)
            .order_by(MeshyTask.created_at.desc())
            .limit(page_size)
            .offset((page_num - 1) * page_size)
        )
        tasks = result.scalars().all()
        
        # Convert to dict
        tasks_list = [
            {
                "task_id": task.task_id,
                "task_type": task.task_type,
                "prompt": task.prompt,
                "status": task.status,
                "model_url": task.model_url,
                "texture_url": task.texture_url,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None
            }
            for task in tasks
        ]
        
        return {
            "success": True,
            "tasks": tasks_list,
            "page_num": page_num,
            "page_size": page_size
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.options("/proxy")
async def proxy_options():
    """
    Handle CORS preflight requests for the proxy endpoint
    """
    from fastapi.responses import Response
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600"
        }
    )


@router.get("/proxy")
async def proxy_model_file(
    request: Request,
    url: str
):
    """
    Proxy endpoint to download model files from Meshy.ai
    This bypasses CORS issues by downloading the file on the backend
    and serving it with appropriate CORS headers
    
    Security: Only allows URLs from the trusted Meshy.ai assets domain
    to prevent SSRF attacks and unauthorized resource access
    """
    # Check rate limit
    await rate_limiter.check_rate_limit(request)
    
    # SSRF Protection: Strict validation that the URL is from Meshy's trusted domain
    # This prevents attackers from using this endpoint to access internal resources
    # or make requests to arbitrary external services
    ALLOWED_DOMAIN = "https://assets.meshy.ai/"
    if not url.startswith(ALLOWED_DOMAIN):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid URL: Only Meshy assets from {ALLOWED_DOMAIN} are allowed"
        )
    
    # Additional validation: ensure no URL manipulation tricks (e.g., @, .., etc)
    if "@" in url or ".." in url:
        raise HTTPException(
            status_code=400,
            detail="Invalid URL: URL manipulation detected"
        )
    
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            # Stream the file from Meshy using aiter_bytes for memory efficiency
            # SSRF Note: URL is validated above to only allow https://assets.meshy.ai/ domain
            # Additional validation blocks URL manipulation (@ and .. characters)
            # This is a controlled proxy for a trusted external service (Meshy.ai)
            async with client.stream("GET", url) as response:  # nosec - URL validated above
                response.raise_for_status()
                
                # Check content length to avoid streaming empty or corrupt files
                content_length = response.headers.get("content-length")
                if content_length and int(content_length) < 100:
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too small ({content_length} bytes), possibly corrupt or empty"
                    )
                
                # Determine content type based on file extension or response header
                content_type = response.headers.get("content-type", "application/octet-stream")
                
                # Override content type for GLB files to ensure proper handling
                if url.endswith('.glb') or url.endswith('.GLB'):
                    content_type = "model/gltf-binary"
                elif url.endswith('.gltf') or url.endswith('.GLTF'):
                    content_type = "model/gltf+json"
                
                # Extract filename from URL for informational purposes
                filename = "model.glb"
                if "/" in url:
                    url_filename = url.split("/")[-1].split("?")[0]  # Remove query params
                    if url_filename:
                        filename = url_filename
                
                # Stream the response content efficiently
                async def stream_generator():
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        yield chunk
                
                # Return the file with appropriate headers for inline viewing
                # CORS headers are required for model-viewer to load the file
                # Content-Disposition is set to inline (not attachment) to allow viewing
                return StreamingResponse(
                    stream_generator(),
                    media_type=content_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{filename}"',
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type",
                        "Cache-Control": "public, max-age=3600"
                    }
                )
    
    except httpx.HTTPStatusError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"HTTP error fetching file from {url}: {e.response.status_code}")
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"Failed to fetch file from Meshy: HTTP {e.response.status_code}"
        )
    except httpx.TimeoutException as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Timeout fetching file from {url}: {str(e)}")
        raise HTTPException(status_code=504, detail="Timeout fetching file from Meshy")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error proxying file from {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error proxying file: {str(e)}")
