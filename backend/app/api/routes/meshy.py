from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

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
                    if "fbx" in model_urls:
                        update_data["texture_url"] = model_urls.get("base_color", "")
            
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
