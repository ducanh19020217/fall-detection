from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://falluser:fallpass@localhost:54326/fall_detection")

# Tạo engine phù hợp từng loại DB
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    chat_id = Column(String, nullable=True)
    bot_token = Column(String, nullable=True)
    
    sources = relationship("VideoSourceModel", back_populates="group")


class VideoSourceModel(Base):
    __tablename__ = "video_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    source_url = Column(String, nullable=False)
    type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    group = relationship("Group", back_populates="sources")


class FallEventModel(Base):
    __tablename__ = "fall_events"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("video_sources.id", ondelete="CASCADE"))
    track_id = Column(Integer)
    fall_score = Column(Float)
    is_fall = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    snapshot_path = Column(String, nullable=True)
    
    # New columns for resolution tracking
    is_resolved = Column(Boolean, default=False)
    responder_name = Column(String, nullable=True)
    responder_id = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    telegram_message_id = Column(String, nullable=True)

    source = relationship("VideoSourceModel")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
