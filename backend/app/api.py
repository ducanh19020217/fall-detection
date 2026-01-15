from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import cv2
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

from . import schemas, database, pipeline_manager

router = APIRouter()
logger = logging.getLogger(__name__)

# Security Config
SECRET_KEY = "your-secret-key-change-me-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Global instance
manager = pipeline_manager.PipelineManager()

# --- Auth Helpers ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(database.User).filter(database.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- Auth Endpoints ---

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return current_user

# --- Group Endpoints ---

@router.post("/groups", response_model=schemas.Group)
def create_group(group: schemas.GroupCreate, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    db_group = database.Group(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups", response_model=List[schemas.Group])
def read_groups(db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    return db.query(database.Group).all()

@router.put("/groups/{group_id}", response_model=schemas.Group)
def update_group(group_id: int, group_update: schemas.GroupCreate, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    group = db.query(database.Group).filter(database.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group.name = group_update.name
    group.chat_id = group_update.chat_id
    group.bot_token = group_update.bot_token
    
    db.commit()
    db.refresh(group)
    return group

@router.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    group = db.query(database.Group).filter(database.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Optional: Check if group has sources, handle accordingly (e.g., set source.group_id to null or delete sources)
    # For now, we'll just delete the group, and sources will have group_id set to null (if foreign key allows) or cascade delete?
    # In database.py we didn't specify ondelete="CASCADE" for group_id in VideoSourceModel, so it might fail if we don't handle it.
    # Let's set group_id to NULL for associated sources first.
    sources = db.query(database.VideoSourceModel).filter(database.VideoSourceModel.group_id == group_id).all()
    for source in sources:
        source.group_id = None
    
    db.delete(group)
    db.commit()
    return {"status": "deleted", "id": group_id}

# --- Source Endpoints (Protected) ---

@router.post("/sources", response_model=schemas.VideoSource)
def create_source(source: schemas.VideoSourceCreate, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    db_source = database.VideoSourceModel(**source.dict())
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source

@router.get("/sources", response_model=List[schemas.VideoSource])
def read_sources(db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    return db.query(database.VideoSourceModel).all()

@router.delete("/sources/{source_id}")
def delete_source(source_id: int, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    source = db.query(database.VideoSourceModel).filter(database.VideoSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Stop pipeline if running
    manager.stop_pipeline(source_id)
    
    db.delete(source)
    db.commit()
    return {"status": "deleted", "id": source_id}

@router.put("/sources/{source_id}", response_model=schemas.VideoSource)
def update_source(source_id: int, source_update: schemas.VideoSourceCreate, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    source = db.query(database.VideoSourceModel).filter(database.VideoSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    source.name = source_update.name
    source.source_url = source_update.source_url
    source.type = source_update.type
    source.group_id = source_update.group_id
    
    db.commit()
    db.refresh(source)
    return source

@router.post("/pipeline/start")
def start_pipeline(config: schemas.PipelineStart, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    source_id = config.source_id
    source = db.query(database.VideoSourceModel).filter(database.VideoSourceModel.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    is_file = source.type == 'file'
    
    # Priority: 1. Explicit config from request body, 2. Group config from DB, 3. Environment variables
    telegram_config = config.telegram_config
    if not telegram_config and source.group:
        telegram_config = {
            "chat_id": source.group.chat_id,
            "bot_token": source.group.bot_token
        }
    
    if not telegram_config:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if bot_token and chat_id:
            telegram_config = {
                "chat_id": chat_id,
                "bot_token": bot_token
            }

    manager.start_pipeline(source.id, source.source_url, is_file=is_file, telegram_config=telegram_config)
    return {"status": "started", "source": source.name}

@router.post("/pipeline/stop")
def stop_pipeline(source_id: int, current_user: schemas.User = Depends(get_current_user)):
    manager.stop_pipeline(source_id)
    return {"status": "stopped", "source_id": source_id}

@router.get("/pipeline/status")
def get_pipeline_status(current_user: schemas.User = Depends(get_current_user)):
    """Return list of active source IDs"""
    return {"active_source_ids": list(manager.pipelines.keys())}

@router.post("/pipeline/config")
def update_config(source_id: int, night_mode: bool, current_user: schemas.User = Depends(get_current_user)):
    pipeline = manager.get_pipeline(source_id)
    if pipeline:
        pipeline.detector.set_night_mode(night_mode)
        return {"status": "updated", "night_mode": night_mode}
    raise HTTPException(status_code=404, detail="Pipeline not found")

@router.get("/events", response_model=List[schemas.FallEvent])
def get_events(limit: int = 50, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user)):
    return db.query(database.FallEventModel).order_by(database.FallEventModel.timestamp.desc()).limit(limit).all()

@router.post("/upload")
async def upload_video(file: UploadFile = File(...), current_user: schemas.User = Depends(get_current_user)):
    upload_dir = "data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    return {"filename": file.filename, "path": os.path.abspath(file_path)}

@router.websocket("/ws/stream/{source_id}")
async def websocket_endpoint(websocket: WebSocket, source_id: int):
    await websocket.accept()
    pipeline = manager.get_pipeline(source_id)
    
    if not pipeline:
        await websocket.close(code=1000, reason="Pipeline not active")
        return

    try:
        while True:
            # Check if pipeline is still running
            if not pipeline.running:
                break

            annotated_frame, events = pipeline.get_processed_frame()
            
            if annotated_frame is None:
                await asyncio.sleep(0.1)
                continue

            # Encode frame to JPEG
            ret, buffer = cv2.imencode('.jpg', annotated_frame)
            if not ret:
                continue
            
            await websocket.send_bytes(buffer.tobytes())
            
            if events:
                await websocket.send_text(json.dumps({"type": "events", "data": events}))

            await asyncio.sleep(0.03) # Limit WS FPS to ~30 FPS
            
    except WebSocketDisconnect:
        logger.info(f"Client disconnected from stream {source_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
