from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
import httpx
import logging
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from app.db.database import get_db
from app.services.meshy_service import MeshyService
from app.models.database import MeshyTask
from app.middleware.session_manager import SessionManager
from app.middleware.rate_limiter import rate_limiter

router = APIRouter(prefix="/api/meshy", tags=["meshy"])
logger = logging.getLogger(__name__)

# Minimum file size in bytes for GLB files - GLB files smaller than this are likely corrupt
# A valid GLB file has a 12-byte header + JSON chunk header (8 bytes) + minimal JSON (few bytes)
# + binary chunk header (8 bytes) + binary data. We use 100 bytes as a practical minimum
# to catch obviously corrupt files while allowing small test models.
MIN_GLB_FILE_SIZE = 100


def _redact_meshy_url(url: str) -> str:
    """
    Redact sensitive query parameters in Meshy signed URLs for logging.
    Masks values for Signature, Expires, Key-Pair-Id (case-insensitive).
    """
    try:
        parts = urlparse(url)
        q = parse_qsl(parts.query, keep_blank_values=True)
        redacted = []
        for k, v in q:
            if k.lower() in ("signature", "expires", "key-pair-id", "x-amz-signature", "x-amz-expires"):
                redacted.append((k, "***"))
            else:
                if len(v) > 64:
                    v = v[:16] + "…"
                redacted.append((k, v))
        new_query = urlencode(redacted)
        return urlunparse((parts.scheme, parts.netloc, parts.path, parts.params, new_query, parts.fragment))
    except Exception:
        return "<unparseable-url>"


class PreviewRequest(BaseModel):
    prompt: str = Field(..., max_length=600)
    art_style: str = Field(default="realistic")
    ai_model: str = Field(default="meshy-5")
    seed: Optional[int] = None
    topology: str = Field(default="triangle")
    target_polycount: int = Field(default=30000, ge=100, le=300000)
    should_remesh: bool = Field(default=True)
    symmetry_mode: Optional[str] = Field(default="auto")
    is_a_t_pose: bool = Field(default=False)
    moderation: Optional[bool] = Field(default=False)


class RefineRequest(BaseModel):
    preview_task_id: str
    enable_pbr: bool = Field(default=False)
    texture_prompt: Optional[str] = Field(None, max_length=600)
    texture_image_url: Optional[str] = None
    ai_model: str = Field(default="meshy-5")
    moderation: Optional[bool] = Field(default=False)


@router.post("/preview")
async def create_preview(
    request: Request,
    preview_req: PreviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Text to 3D Preview task"""
    await rate_limiter.check_rate_limit(request)
    session_id = await SessionManager.get_or_create_session(request, db)
    if await SessionManager.check_session_abuse(session_id, db):
        raise HTTPException(status_code=403, detail="Session blocked")
    try:
        meshy_service = MeshyService()
        result = await meshy_service.create_preview(
            prompt=preview_req.prompt,
            art_style=preview_req.art_style,
            ai_model=preview_req.ai_model,
            seed=preview_req.seed,
            topology=preview_req.topology,
            target_polycount=preview_req.target_polycount,
            should_remesh=preview_req.should_remesh,
            symmetry_mode=preview_req.symmetry_mode,
            is_a_t_pose=preview_req.is_a_t_pose,
            moderation=preview_req.moderation
        )
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
        logger.exception("Error in create_preview")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine")
async def create_refine(
    request: Request,
    refine_req: RefineRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Text to 3D Refine task"""
    await rate_limiter.check_rate_limit(request)
    session_id = await SessionManager.get_or_create_session(request, db)
    if await SessionManager.check_session_abuse(session_id, db):
        raise HTTPException(status_code=403, detail="Session blocked")
    try:
        meshy_service = MeshyService()
        result = await meshy_service.create_refine(
            preview_task_id=refine_req.preview_task_id,
            enable_pbr=refine_req.enable_pbr,
            texture_prompt=refine_req.texture_prompt,
            texture_image_url=refine_req.texture_image_url,
            ai_model=refine_req.ai_model,
            moderation=refine_req.moderation
        )
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
        logger.exception("Error in create_refine")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}")
async def get_task(
    request: Request,
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get the status of a Text to 3D task"""
    await rate_limiter.check_rate_limit(request)
    try:
        meshy_service = MeshyService()
        result = await meshy_service.get_task(task_id)
        db_result = await db.execute(select(MeshyTask).where(MeshyTask.task_id == task_id))
        task = db_result.scalar_one_or_none()
        if task:
            status = result.get("status", "PENDING")
            update_data = {"status": status, "updated_at": datetime.utcnow()}
            if status == "SUCCEEDED":
                if result.get("model_urls"):
                    model_urls = result["model_urls"]
                    if "glb" in model_urls:
                        update_data["model_url"] = model_urls["glb"]
                if result.get("texture_urls"):
                    texture_urls = result["texture_urls"]
                    if "base_color" in texture_urls:
                        update_data["texture_url"] = texture_urls["base_color"]
            await db.execute(update(MeshyTask).where(MeshyTask.task_id == task_id).values(**update_data))
            await db.commit()
        return result
    except Exception as e:
        logger.exception("Error in get_task")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_tasks(
    request: Request,
    page_num: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """List user's Text to 3D tasks"""
    await rate_limiter.check_rate_limit(request)
    session_id = await SessionManager.get_or_create_session(request, db)
    try:
        result = await db.execute(
            select(MeshyTask)
            .where(MeshyTask.session_id == session_id)
            .order_by(MeshyTask.created_at.desc())
            .limit(page_size)
            .offset((page_num - 1) * page_size)
        )
        tasks = result.scalars().all()
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
        logger.exception("Error in list_tasks")
        raise HTTPException(status_code=500, detail=str(e))


@router.options("/proxy")
async def proxy_options():
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
            "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag, Last-Modified",
            "Access-Control-Max-Age": "3600"
        }
    )


@router.get("/proxy")
async def proxy_model_file(
    request: Request,
    url: str
):
    """
    Streaming proxy for Meshy model files.
    - Passes through Range requests (206) without buffering.
    - Streams full content with a single resume attempt on upstream early close.
    - Sends raw bytes (Accept-Encoding: identity) to avoid decode/length mismatches.
    - Avoids setting Content-Length for streamed responses (prevents h11 mismatches).
    - Emits detailed logs keyed by X-Request-ID to diagnose issues.
    """
    await rate_limiter.check_rate_limit(request)

    request_id = getattr(request.state, "request_id", "-")
    client_ip = request.client.host if request.client else "-"
    incoming_range = request.headers.get("range")
    redacted_url = _redact_meshy_url(url)
    logger.info(f"[{request_id}] /proxy start ip={client_ip} range={incoming_range} url={redacted_url}")

    ALLOWED_DOMAIN = "https://assets.meshy.ai/"
    if not url.startswith(ALLOWED_DOMAIN):
        logger.warning(f"[{request_id}] blocked non-allowed domain url={redacted_url}")
        raise HTTPException(status_code=400, detail=f"Invalid URL: Only Meshy assets from {ALLOWED_DOMAIN} are allowed")
    if "@" in url or ".." in url:
        logger.warning(f"[{request_id}] blocked url manipulation url={redacted_url}")
        raise HTTPException(status_code=400, detail="Invalid URL: URL manipulation detected")

    # RANGE path: keep client open for generator lifetime
    if incoming_range:
        client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)
        try:
            req = client.build_request("GET", url, headers={"Accept-Encoding": "identity", "Range": incoming_range})
            upstream = await client.send(req, stream=True)
            status_code = upstream.status_code

            # Determine content type from upstream header or URL
            content_type = upstream.headers.get("content-type", "application/octet-stream")
            url_path = url.split("?")[0].lower()
            if url_path.endswith(".glb"):
                content_type = "model/gltf-binary"
            elif url_path.endswith(".gltf"):
                content_type = "model/gltf+json"

            # Filename
            filename = "model.glb"
            if "/" in url:
                url_filename = url.split("/")[-1].split("?")[0]
                if url_filename:
                    filename = url_filename

            cl = upstream.headers.get("content-length")
            cr = upstream.headers.get("content-range")
            ar = upstream.headers.get("accept-ranges")
            ce = upstream.headers.get("content-encoding")
            logger.info(f"[{request_id}] upstream RANGE resp status={status_code} cl={cl} cr={cr} ar={ar} ce={ce}")

            headers = {
                "Content-Disposition": f'inline; filename="{filename}"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag, Last-Modified",
                "Cache-Control": "public, max-age=3600",
            }
            content_range = upstream.headers.get("content-range")
            etag = upstream.headers.get("etag")
            last_modified = upstream.headers.get("last-modified")
            accept_ranges = upstream.headers.get("accept-ranges") or "bytes"
            headers["Accept-Ranges"] = accept_ranges
            if content_range:
                headers["Content-Range"] = content_range
            if etag:
                headers["ETag"] = etag
            if last_modified:
                headers["Last-Modified"] = last_modified

            async def upstream_iter():
                bytes_out = 0
                try:
                    async for chunk in upstream.aiter_raw():
                        if chunk:
                            bytes_out += len(chunk)
                            yield chunk
                    logger.info(f"[{request_id}] RANGE stream complete bytes_sent={bytes_out}")
                except Exception as e:
                    logger.exception(f"[{request_id}] RANGE stream error after bytes_sent={bytes_out}: {e}")
                    raise
                finally:
                    try:
                        await upstream.aclose()
                    except Exception:
                        pass
                    try:
                        await client.aclose()
                    except Exception:
                        pass

            return StreamingResponse(upstream_iter(), media_type=content_type, headers=headers, status_code=status_code)
        except Exception:
            # Ensure client is closed on early failure before StreamingResponse is built
            try:
                await client.aclose()
            except Exception:
                pass
            raise

    # Non-range full stream with resume-once; keep client for generator lifetime
    client = httpx.AsyncClient(timeout=60.0, follow_redirects=True)

    url_path = url.split("?")[0].lower()
    content_type = "application/octet-stream"
    if url_path.endswith(".glb"):
        content_type = "model/gltf-binary"
    elif url_path.endswith(".gltf"):
        content_type = "model/gltf+json"

    filename = "model.glb"
    if "/" in url:
        url_filename = url.split("/")[-1].split("?")[0]
        if url_filename:
            filename = url_filename

    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag, Last-Modified",
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
    }

    async def stream_with_resume():
        bytes_sent = 0
        attempts = 0
        max_retries = 1
        headers_base = {"Accept-Encoding": "identity"}

        try:
            while True:
                req_headers = dict(headers_base)
                if bytes_sent > 0:
                    req_headers["Range"] = f"bytes={bytes_sent}-"
                    logger.info(f"[{request_id}] resume attempt={attempts} from={bytes_sent}")
                req = client.build_request("GET", url, headers=req_headers)
                resp = await client.send(req, stream=True)

                cl = resp.headers.get("content-length")
                cr = resp.headers.get("content-range")
                ar = resp.headers.get("accept-ranges")
                ce = resp.headers.get("content-encoding")
                logger.info(
                    f"[{request_id}] upstream resp status={resp.status_code} "
                    f"cl={cl} cr={cr} ar={ar} ce={ce} bytes_sent_so_far={bytes_sent}"
                )

                try:
                    async for chunk in resp.aiter_raw():
                        if chunk:
                            bytes_sent += len(chunk)
                            yield chunk
                    logger.info(f"[{request_id}] full stream complete bytes_sent={bytes_sent}")
                    return
                except httpx.ReadError as e:
                    attempts += 1
                    logger.warning(f"[{request_id}] upstream read error after bytes_sent={bytes_sent} attempts={attempts}: {e}")
                    await resp.aclose()
                    if attempts <= max_retries and bytes_sent > 0:
                        continue  # try resume
                    else:
                        logger.error(f"[{request_id}] giving up after attempts={attempts} bytes_sent={bytes_sent}")
                        return
                except Exception as e:
                    logger.exception(f"[{request_id}] streaming error after bytes_sent={bytes_sent}: {e}")
                    await resp.aclose()
                    return
                finally:
                    try:
                        await resp.aclose()
                    except Exception:
                        pass
        finally:
            try:
                await client.aclose()
            except Exception:
                pass

    return StreamingResponse(stream_with_resume(), media_type=content_type, headers=headers)