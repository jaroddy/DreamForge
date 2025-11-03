from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List
import asyncio
from app.core.config import settings


class RateLimiter:
    def __init__(self):
        # Store requests per IP: {ip: [(timestamp, endpoint), ...]}
        self.requests: Dict[str, List[tuple]] = defaultdict(list)
        self.blocked_ips: Dict[str, datetime] = {}
        self.lock = asyncio.Lock()
    
    async def check_rate_limit(self, request: Request) -> bool:
        """
        Check if request should be rate limited
        Returns True if allowed, raises HTTPException if blocked
        """
        client_ip = request.client.host
        endpoint = request.url.path
        now = datetime.utcnow()
        
        async with self.lock:
            # Check if IP is blocked
            if client_ip in self.blocked_ips:
                block_time = self.blocked_ips[client_ip]
                if now < block_time:
                    remaining = (block_time - now).seconds
                    raise HTTPException(
                        status_code=429,
                        detail=f"IP blocked due to excessive requests. Try again in {remaining} seconds."
                    )
                else:
                    # Unblock IP after timeout
                    del self.blocked_ips[client_ip]
            
            # Clean old requests (outside the window)
            window = timedelta(minutes=settings.RATE_LIMIT_WINDOW_MINUTES)
            self.requests[client_ip] = [
                (ts, ep) for ts, ep in self.requests[client_ip]
                if now - ts < window
            ]
            
            # Check rate limit
            request_count = len(self.requests[client_ip])
            
            if request_count >= settings.RATE_LIMIT_PER_MINUTE:
                # Block IP for 1 hour
                self.blocked_ips[client_ip] = now + timedelta(hours=1)
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. IP blocked for 1 hour."
                )
            
            # Add current request
            self.requests[client_ip].append((now, endpoint))
            
            return True
    
    async def get_request_count(self, ip: str) -> int:
        """Get current request count for an IP"""
        now = datetime.utcnow()
        window = timedelta(minutes=settings.RATE_LIMIT_WINDOW_MINUTES)
        
        async with self.lock:
            self.requests[ip] = [
                (ts, ep) for ts, ep in self.requests[ip]
                if now - ts < window
            ]
            return len(self.requests[ip])


# Global rate limiter instance
rate_limiter = RateLimiter()
