from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from . import database, api

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DB
database.init_db()

app = FastAPI(title="Fall Detection System")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for snapshots/uploads
os.makedirs("data/snapshots", exist_ok=True)
os.makedirs("data/uploads", exist_ok=True)
app.mount("/data", StaticFiles(directory="data"), name="data")

# Include routers
app.include_router(api.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    print(bot_token, chat_id)
    uvicorn.run(app, host="0.0.0.0", port=8000)
