import requests
import logging
import threading
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self, token=None, chat_id=None):
        # Only use environment variables if BOTH are missing from arguments
        # This allows disabling notifications by passing None if we want, 
        # but here we'll assume if they are provided, we use them.
        # If they are NOT provided (None), we check if we should fallback.
        # To satisfy the user, if they are NOT in a group and NOT in demo config, 
        # they should be None.
        self.token = token
        self.chat_id = chat_id
        
        # If both are None, we COULD fallback to env, but the user says it's "wrong".
        # So I will only fallback if the env vars are actually set AND no specific config was passed.
        # Actually, let's just make it strict: if not passed, it's None.
        # But wait, some users might WANT the default. 
        # Let's check if they were passed as None explicitly.
        
        self.base_url = f"https://api.telegram.org/bot{self.token}" if self.token else None

    def send_message(self, text):
        if not self.base_url or not self.chat_id:
            logger.warning("Telegram token or chat_id not set. Skipping message.")
            return

        def _send():
            try:
                url = f"{self.base_url}/sendMessage"
                payload = {"chat_id": self.chat_id, "text": text}
                requests.post(url, json=payload, timeout=5)
            except Exception as e:
                logger.error(f"Failed to send Telegram message: {e}")

        threading.Thread(target=_send, daemon=True).start()

    def send_photo(self, caption, photo_path):
        if not self.base_url or not self.chat_id:
            logger.warning("Telegram token or chat_id not set. Skipping photo.")
            return

        def _send():
            try:
                url = f"{self.base_url}/sendPhoto"
                with open(photo_path, "rb") as f:
                    files = {"photo": f}
                    data = {"chat_id": self.chat_id, "caption": caption}
                    requests.post(url, data=data, files=files, timeout=10)
            except Exception as e:
                logger.error(f"Failed to send Telegram photo: {e}")

        threading.Thread(target=_send, daemon=True).start()

    def send_video(self, caption, video_path):
        if not self.base_url or not self.chat_id:
            logger.warning("Telegram token or chat_id not set. Skipping video.")
            return

        def _send():
            try:
                url = f"{self.base_url}/sendVideo"
                with open(video_path, "rb") as f:
                    files = {"video": f}
                    data = {"chat_id": self.chat_id, "caption": caption}
                    requests.post(url, data=data, files=files, timeout=60)
            except Exception as e:
                logger.error(f"Failed to send Telegram video: {e}")

        threading.Thread(target=_send, daemon=True).start()
