import logging
import threading
import time
import cv2
import os
from datetime import datetime
from typing import Dict, Optional
from .stream import VideoStream
from .cv_pipeline import FallDetector
from . import database

logger = logging.getLogger(__name__)

class PipelineInstance:
    def __init__(self, source_id: int, source_url: str, is_file: bool = False, telegram_config: Optional[Dict] = None):
        self.source_id = source_id
        self.stream = VideoStream(source_url, is_file)
        self.detector = FallDetector(telegram_config=telegram_config)
        self.running = False
        self.thread = None
        self.last_frame = None
        self.last_events = []
        self.lock = threading.Lock()

    def start(self):
        if self.running:
            return
        self.stream.start()
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        logger.info(f"Pipeline thread started for source {self.source_id}")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        self.stream.stop()
        logger.info(f"Pipeline thread stopped for source {self.source_id}")

    def _run(self):
        db = database.SessionLocal()
        try:
            while self.running:
                frame = self.stream.read()
                if frame is None:
                    time.sleep(0.01)
                    continue
                
                # Process frame
                annotated_frame, events = self.detector.process_frame(frame)
                
                with self.lock:
                    self.last_frame = annotated_frame
                    self.last_events = events

                # Handle events (Save to DB and Send Telegram Photo)
                if events:
                    for event_data in events:
                        self._handle_event(db, event_data, annotated_frame)
                
                # Small sleep to prevent 100% CPU if stream is too fast
                # but usually stream.read() blocks or we handle FPS in stream.py
                time.sleep(0.001)
        finally:
            db.close()

    def _handle_event(self, db, event_data, frame):
        try:
            # 1. Save Snapshot
            timestamp = int(event_data['timestamp'])
            snapshot_name = f"fall_{self.source_id}_{timestamp}_{event_data['track_id']}.jpg"
            snapshot_path = os.path.join("data/snapshots", snapshot_name)
            os.makedirs("data/snapshots", exist_ok=True)
            cv2.imwrite(snapshot_path, frame)

            # 2. Save to Database
            db_event = database.FallEventModel(
                source_id=self.source_id,
                track_id=event_data['track_id'],
                fall_score=event_data['fall_score'],
                is_fall=True,
                timestamp=datetime.fromtimestamp(event_data['timestamp']),
                snapshot_path=snapshot_name
            )
            db.add(db_event)
            db.commit()
            logger.info(f"Saved fall event to DB for source {self.source_id}")

            # 3. Send Telegram Photo Alert (Video is handled by FallDetector internally)
            if self.detector.telegram_bot and self.detector.telegram_bot.base_url:
                caption = (
                    f"⚠️ FALL DETECTED!\n"
                    f"Source ID: {self.source_id}\n"
                    f"Track ID: {event_data['track_id']}\n"
                    f"Score: {event_data['fall_score']:.2f}\n"
                    f"Time: {db_event.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
                )
                self.detector.telegram_bot.send_photo(caption, snapshot_path)
        except Exception as e:
            logger.error(f"Error handling event in pipeline: {e}")
            db.rollback()

    def get_processed_frame(self):
        with self.lock:
            return self.last_frame, self.last_events

class PipelineManager:
    def __init__(self):
        self.pipelines: Dict[int, PipelineInstance] = {}
        self.lock = threading.Lock()

    def start_pipeline(self, source_id: int, source_url: str, is_file: bool = False, telegram_config: Optional[Dict] = None):
        with self.lock:
            if source_id in self.pipelines:
                logger.info(f"Pipeline {source_id} already running.")
                return

            logger.info(f"Starting pipeline for source {source_id}")
            pipeline = PipelineInstance(source_id, source_url, is_file, telegram_config)
            pipeline.start()
            self.pipelines[source_id] = pipeline

    def stop_pipeline(self, source_id: int):
        with self.lock:
            if source_id in self.pipelines:
                logger.info(f"Stopping pipeline {source_id}")
                self.pipelines[source_id].stop()
                del self.pipelines[source_id]

    def get_pipeline(self, source_id: int) -> Optional[PipelineInstance]:
        return self.pipelines.get(source_id)

    def stop_all(self):
        with self.lock:
            for pid, pipeline in self.pipelines.items():
                pipeline.stop()
            self.pipelines.clear()
