import httpx
from typing import Optional, Dict, Any
from app.core.config import settings


class MeshyService:
    def __init__(self):
        self.base_url = settings.MESHY_API_BASE_URL
        self.api_key = settings.MESHY_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def create_preview(
        self,
        prompt: str,
        art_style: str = "realistic",
        ai_model: str = "meshy-5",
        seed: Optional[int] = None,
        topology: str = "triangle",
        target_polycount: int = 30000,
        should_remesh: bool = True,
        symmetry_mode: Optional[str] = "auto",
        is_a_t_pose: bool = False,
        moderation: Optional[bool] = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a Text to 3D Preview task
        """
        # Ensure prompt is within 600 character limit for Meshy
        if len(prompt) > 600:
            print(f"[MeshyService] WARNING: Prompt length ({len(prompt)}) exceeds 600 characters. Truncating.")
            prompt = prompt[:600]
        
        payload = {
            "mode": "preview",
            "prompt": prompt,
            "art_style": art_style,
            "ai_model": ai_model,
            "topology": topology,
            "target_polycount": target_polycount,
            "should_remesh": should_remesh
        }
        
        if seed is not None:
            payload["seed"] = seed
        
        if symmetry_mode is not None:
            payload["symmetry_mode"] = symmetry_mode
            
        payload["is_a_t_pose"] = is_a_t_pose
        payload["moderation"] = moderation
        
        # Add any additional parameters
        payload.update(kwargs)
        
        # Log the payload being sent to Meshy
        print("[MeshyService] ===== PREVIEW REQUEST TO MESHY =====")
        print(f"[MeshyService] Prompt length: {len(prompt)} characters")
        print(f"[MeshyService] Prompt: {prompt}")
        print(f"[MeshyService] Art style: {art_style}")
        print(f"[MeshyService] AI model: {ai_model}")
        print(f"[MeshyService] Other params: topology={topology}, target_polycount={target_polycount}")
        print("[MeshyService] =======================================")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-3d",
                json=payload,
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def create_refine(
        self,
        preview_task_id: str,
        enable_pbr: bool = False,
        texture_prompt: Optional[str] = None,
        texture_image_url: Optional[str] = None,
        ai_model: str = "meshy-5",
        moderation: Optional[bool] = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a Text to 3D Refine task
        """
        # Ensure texture_prompt is within 600 character limit for Meshy
        if texture_prompt and len(texture_prompt) > 600:
            print(f"[MeshyService] WARNING: Texture prompt length ({len(texture_prompt)}) exceeds 600 characters. Truncating.")
            texture_prompt = texture_prompt[:600]
        
        payload = {
            "mode": "refine",
            "preview_task_id": preview_task_id,
            "enable_pbr": enable_pbr,
            "ai_model": ai_model
        }
        
        if texture_prompt:
            payload["texture_prompt"] = texture_prompt
        
        if texture_image_url:
            payload["texture_image_url"] = texture_image_url
            
        payload["moderation"] = moderation
        
        # Add any additional parameters
        payload.update(kwargs)
        
        # Log the payload being sent to Meshy
        print("[MeshyService] ===== REFINE REQUEST TO MESHY =====")
        print(f"[MeshyService] Preview task ID: {preview_task_id}")
        if texture_prompt:
            print(f"[MeshyService] Texture prompt length: {len(texture_prompt)} characters")
            print(f"[MeshyService] Texture prompt: {texture_prompt}")
        print(f"[MeshyService] Enable PBR: {enable_pbr}")
        print(f"[MeshyService] AI model: {ai_model}")
        print("[MeshyService] ======================================")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/text-to-3d",
                json=payload,
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """
        Retrieve a Text to 3D task by ID
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/text-to-3d/{task_id}",
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def list_tasks(
        self,
        page_num: int = 1,
        page_size: int = 10,
        sort_by: str = "-created_at"
    ) -> Dict[str, Any]:
        """
        List Text to 3D tasks with pagination
        """
        params = {
            "page_num": page_num,
            "page_size": min(page_size, 50),  # Max 50
            "sort_by": sort_by
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/text-to-3d",
                params=params,
                headers=self.headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
