from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, index=True)
    ip_address = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    is_blocked = Column(Boolean, default=False)
    request_count = Column(Integer, default=0)


class MeshyTask(Base):
    __tablename__ = "meshy_tasks"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String, unique=True, index=True)
    session_id = Column(String, index=True)
    task_type = Column(String)  # 'preview' or 'refine'
    prompt = Column(Text, nullable=True)
    status = Column(String)  # 'PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED'
    model_url = Column(String, nullable=True)
    texture_url = Column(String, nullable=True)
    preview_task_id = Column(String, nullable=True)  # For refine tasks
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RateLimitRecord(Base):
    __tablename__ = "rate_limit_records"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ip_address = Column(String, index=True)
    endpoint = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    request_count = Column(Integer, default=1)
