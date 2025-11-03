from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.models.database import Session
from app.core.config import settings


class SessionManager:
    @staticmethod
    async def get_or_create_session(
        request: Request,
        db: AsyncSession
    ) -> str:
        """
        Get existing session or create new one
        Returns session_id
        """
        # Try to get session_id from header or cookie
        session_id = request.headers.get("X-Session-ID")
        
        if not session_id:
            session_id = request.cookies.get("session_id")
        
        client_ip = request.client.host
        now = datetime.utcnow()
        
        if session_id:
            # Check if session exists and is valid
            result = await db.execute(
                select(Session).where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()
            
            if session:
                # Check if session is blocked
                if session.is_blocked:
                    raise HTTPException(
                        status_code=403,
                        detail="Session blocked due to suspicious activity"
                    )
                
                # Check session timeout
                timeout = timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
                if now - session.last_activity > timeout:
                    # Session expired, create new one
                    session_id = str(uuid.uuid4())
                    new_session = Session(
                        id=session_id,
                        ip_address=client_ip,
                        created_at=now,
                        last_activity=now,
                        request_count=1
                    )
                    db.add(new_session)
                else:
                    # Update session activity
                    await db.execute(
                        update(Session)
                        .where(Session.id == session_id)
                        .values(
                            last_activity=now,
                            request_count=Session.request_count + 1
                        )
                    )
                
                await db.commit()
                return session_id
        
        # Create new session
        session_id = str(uuid.uuid4())
        new_session = Session(
            id=session_id,
            ip_address=client_ip,
            created_at=now,
            last_activity=now,
            request_count=1
        )
        db.add(new_session)
        await db.commit()
        
        return session_id
    
    @staticmethod
    async def check_session_abuse(
        session_id: str,
        db: AsyncSession
    ) -> bool:
        """
        Check if session has excessive requests
        Returns True if session should be blocked
        """
        result = await db.execute(
            select(Session).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        # Block if more than 500 requests in session
        if session.request_count > 500:
            await db.execute(
                update(Session)
                .where(Session.id == session_id)
                .values(is_blocked=True)
            )
            await db.commit()
            return True
        
        return False
