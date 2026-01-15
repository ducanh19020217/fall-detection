import cv2
import time
import threading
import queue
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class VideoStream:
    def __init__(self, source_url: str, is_file: bool = False):
        self.source_url = source_url
        self.is_file = is_file
        self.cap = None
        self.running = False
        self.lock = threading.Lock()
        self.frame_queue = queue.Queue(maxsize=5) # Drop frames if processing is slow
        self.thread = None

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()
        logger.info(f"Started video stream: {self.source_url}")

    def stop(self):
        self.running = False
        if self.thread:
            # Use a small timeout to avoid hanging the API if VideoCapture is stuck
            self.thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()
        logger.info(f"Stopped video stream: {self.source_url}")

    def _update(self):
        # Open capture in background thread
        if self.source_url.isdigit():
            self.cap = cv2.VideoCapture(int(self.source_url))
        else:
            # Force TCP for RTSP reliability
            # os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
            self.cap = cv2.VideoCapture(self.source_url)

        if not self.running:
            if self.cap: self.cap.release()
            return

        if not self.cap or not self.cap.isOpened():
            logger.error(f"Failed to open video source: {self.source_url}")
            self.running = False
            return

        while self.running:
            if not self.cap or not self.cap.isOpened():
                logger.error("Video source not opened")
                self.running = False
                break

            ret, frame = self.cap.read()
            if not ret:
                if self.is_file:
                    # Loop video file
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    logger.error("Failed to read frame")
                    # Try reconnect logic here if needed
                    time.sleep(1)
                    continue

            # Manage queue size
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            self.frame_queue.put(frame)
            
            # Limit capture FPS if needed (simple sleep)
            time.sleep(0.01)

    def read(self):
        try:
            return self.frame_queue.get_nowait()
        except queue.Empty:
            return None

class StreamManager:
    def __init__(self):
        self.current_stream: Optional[VideoStream] = None
        self.active_source_id: Optional[int] = None

    def set_source(self, source_url: str, source_id: int, is_file: bool = False):
        self.stop_current()
        self.current_stream = VideoStream(source_url, is_file)
        self.active_source_id = source_id
        self.current_stream.start()

    def stop_current(self):
        if self.current_stream:
            self.current_stream.stop()
            self.current_stream = None
            self.active_source_id = None

    def get_frame(self):
        if self.current_stream:
            return self.current_stream.read()
        return None
