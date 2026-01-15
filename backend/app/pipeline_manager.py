import logging
import threading
import time
import cv2
import os
from datetime import datetime
from typing import Dict, Optional
from .stream import VideoStream
from .cv_pipeline import FallDetector
from .notifications import TelegramBot
from . import database

logger = logging.getLogger(__name__)

class PipelineInstance:
    def __init__(self, source_id: int, source_url: str, manager, is_file: bool = False, telegram_config: Optional[Dict] = None):
        self.source_id = source_id
        self.manager = manager
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
            self.thread.join(timeout=0.5)
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
                
                # Inline keyboard for resolution
                reply_markup = {
                    "inline_keyboard": [[
                        {"text": "✅ Resolve / Đã xử lý", "callback_data": f"resolve_{db_event.id}"}
                    ]]
                }
                
                response = self.detector.telegram_bot.send_photo(caption, snapshot_path, reply_markup=reply_markup)
                if response and response.get("ok"):
                    db_event.telegram_message_id = str(response["result"]["message_id"])
                    db.commit()
                    
                # Start repeated notification thread for this specific event if not already handled
                # Start repeated notification thread for this specific event if not already handled
                threading.Thread(target=self._notification_loop, args=(db_event.id, self.manager), daemon=True).start()
                
        except Exception as e:
            logger.error(f"Error handling event in pipeline: {e}")
            db.rollback()

    def _notification_loop(self, event_id: int, manager):
        """Repeatedly send messages until the event is resolved."""
        logger.info(f"Starting notification loop for event {event_id}")
        db = database.SessionLocal()
        try:
            while manager.running:
                # Refresh event from DB
                db.expire_all()
                event = db.query(database.FallEventModel).filter(database.FallEventModel.id == event_id).first()
                if not event or event.is_resolved:
                    logger.info(f"Event {event_id} resolved or deleted. Stopping notifications.")
                    break
                
                # Wait 10 seconds before next reminder
                # We wait at the beginning so the first reminder is 10s after the initial alert
                for _ in range(10):
                    if not manager.running: break
                    time.sleep(1)
                
                if not manager.running: break
                
                # Re-check resolution after sleep
                db.refresh(event)
                if event.is_resolved:
                    break
                
                # Send reminder
                if self.detector.telegram_bot and self.detector.telegram_bot.base_url:
                    msg = f"🚨 REMINDER: Fall event {event_id} (Source {self.source_id}) is still NOT resolved!"
                    self.detector.telegram_bot.send_message(msg)
                    logger.info(f"Sent reminder for event {event_id}")
                    
        except Exception as e:
            logger.error(f"Error in notification loop for event {event_id}: {e}")
        finally:
            db.close()

    def get_processed_frame(self):
        with self.lock:
            return self.last_frame, self.last_events

class PipelineManager:
    def __init__(self):
        self.pipelines: Dict[int, PipelineInstance] = {}
        self.lock = threading.Lock()
        self.polling_threads = {} # {bot_token: thread}
        self.polling_offsets = {} # {bot_token: offset}
        self.running = True

    def _poll_telegram(self, bot_token: str):
        """Poll for updates for a specific bot token."""
        logger.info(f"Starting Telegram polling for bot: {bot_token[:10]}...")
        bot = TelegramBot(token=bot_token)
        
        while self.running:
            try:
                offset = self.polling_offsets.get(bot_token)
                updates = bot.get_updates(offset=offset)
                
                for update in updates:
                    self.polling_offsets[bot_token] = update["update_id"] + 1
                    
                    if "callback_query" in update:
                        cb = update["callback_query"]
                        data = cb.get("data", "")
                        
                        if data.startswith("resolve_"):
                            event_id = int(data.split("_")[1])
                            user = cb.get("from", {})
                            username = user.get("username") or user.get("first_name", "Unknown")
                            user_id = str(user.get("id"))
                            chat_id = cb.get("message", {}).get("chat", {}).get("id")
                            
                            self._resolve_event(event_id, username, user_id, bot, cb["id"], chat_id)
                
                time.sleep(1) # Poll every second
            except Exception as e:
                logger.error(f"Error in Telegram polling: {e}")
                time.sleep(5)

    def _resolve_event(self, event_id: int, responder_name: str, responder_id: str, bot: TelegramBot, cb_id: str, chat_id: int):
        db = database.SessionLocal()
        try:
            event = db.query(database.FallEventModel).filter(database.FallEventModel.id == event_id).first()
            if event and not event.is_resolved:
                event.is_resolved = True
                event.responder_name = responder_name
                event.responder_id = responder_id
                event.resolved_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"Event {event_id} resolved by {responder_name}")
                
                # Acknowledge callback
                bot.answer_callback_query(cb_id, text=f"Event {event_id} resolved by {responder_name}")
                
                # Update original message to show it's resolved
                if event.telegram_message_id:
                    new_caption = (
                        f"✅ RESOLVED by {responder_name}\n"
                        f"Source ID: {event.source_id}\n"
                        f"Track ID: {event.track_id}\n"
                        f"Time: {event.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
                        f"Resolved at: {event.resolved_at.strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                    bot.edit_message_caption(event.telegram_message_id, new_caption, reply_markup=None, chat_id=chat_id)
            else:
                bot.answer_callback_query(cb_id, text="Event already resolved or not found.")
        except Exception as e:
            logger.error(f"Error resolving event {event_id}: {e}")
            db.rollback()
        finally:
            db.close()

    def start_pipeline(self, source_id: int, source_url: str, is_file: bool = False, telegram_config: Optional[Dict] = None):
        with self.lock:
            if source_id in self.pipelines:
                logger.info(f"Pipeline {source_id} already running.")
                return

            logger.info(f"Starting pipeline for source {source_id}")
            pipeline = PipelineInstance(source_id, source_url, self, is_file, telegram_config)
            pipeline.start()
            self.pipelines[source_id] = pipeline
            
            # Start polling for this bot if not already started
            if telegram_config and telegram_config.get("bot_token"):
                token = telegram_config["bot_token"]
                if token not in self.polling_threads:
                    thread = threading.Thread(target=self._poll_telegram, args=(token,), daemon=True)
                    thread.start()
                    self.polling_threads[token] = thread

    def stop_pipeline(self, source_id: int):
        with self.lock:
            if source_id in self.pipelines:
                logger.info(f"Stopping pipeline {source_id}")
                self.pipelines[source_id].stop()
                del self.pipelines[source_id]

    def get_pipeline(self, source_id: int) -> Optional[PipelineInstance]:
        return self.pipelines.get(source_id)

    def stop_all(self):
        self.running = False # Stop all polling loops
        with self.lock:
            for pid, pipeline in self.pipelines.items():
                pipeline.stop()
            self.pipelines.clear()
            
            # Wait for polling threads to finish (optional, since they are daemon)
            self.polling_threads.clear()
