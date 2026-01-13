from pydantic import BaseModel
from typing import List, Optional
from typing import List, Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    username: str
    is_active: bool = True

    class Config:
        from_attributes = True


class GroupBase(BaseModel):
    name: str
    chat_id: Optional[str] = None
    bot_token: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class Group(GroupBase):
    id: int
    
    class Config:
        from_attributes = True

class VideoSourceBase(BaseModel):
    name: str
    source_url: str  # RTSP URL, file path, or '0' for webcam
    type: str  # 'rtsp', 'file', 'webcam'
    group_id: Optional[int] = None

class VideoSourceCreate(VideoSourceBase):
    pass

class VideoSource(VideoSourceBase):
    id: int
    is_active: bool = True
    group: Optional[Group] = None

    class Config:
        from_attributes = True

class FallEventBase(BaseModel):
    track_id: int
    fall_score: float
    timestamp: datetime
    snapshot_path: Optional[str] = None

class FallEvent(FallEventBase):
    id: int
    source_id: int

    class Config:
        from_attributes = True

class PipelineStatus(BaseModel):
    active: bool
    fps: float
    source_id: Optional[int] = None
    device: str

class PipelineStart(BaseModel):
    source_id: int
    telegram_config: Optional[dict] = None
