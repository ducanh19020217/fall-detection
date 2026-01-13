# Fall Detection System

A complete computer vision system for detecting falls in real-time using YOLOv8, FastAPI, and React.

## Features
- **Real-time Detection**: Detects people and tracks their movement.
- **Fall Logic**: Analyzes pose (keypoints), aspect ratio, and orientation to detect falls.
- **Video Sources**: Supports RTSP streams, Webcams, and Video Files.
- **Interactive UI**: React-based dashboard with live video and event logging.
- **Event Logging**: Saves fall events with snapshots to SQLite.

## 🚀 Quick Start (Docker - Recommended)

The easiest way to run the system on any OS (Windows, Linux, macOS) is using Docker.

1.  **Clone the repository**
2.  **Run the setup script**:
    *   **Linux/macOS**: `chmod +x setup.sh && ./setup.sh`
    *   **Windows**: Double-click `setup.bat`
3.  **Access the system**:
    *   **UI**: [http://localhost](http://localhost)
    *   **Default Login**: `admin` / `admin`

> [!TIP]
> You can configure Telegram notifications and other settings in the `.env` file created after running the setup script.

## 🛠️ Manual Setup (Development)

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Run the server
python -m app.main
```
Server will start at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
UI will be available at `http://localhost:5173`.

## 📖 Features
- **Real-time Detection**: Multi-stream support with YOLOv8-pose.
- **Group Management**: Organize cameras into groups with specific notification settings.
- **Telegram Alerts**: Automatic photo/video notifications to Telegram groups.
- **Multi-OS Support**: Fully containerized with Docker.
- **Internationalization**: Full support for English and Vietnamese.

## ⚙️ Configuration
All configurations are handled via environment variables in the `.env` file:
- `DATABASE_URL`: Connection string for Postgres or SQLite.
- `TELEGRAM_BOT_TOKEN`: Your bot token.
- `TELEGRAM_CHAT_ID`: Your chat ID.

## 📄 Documentation
- [Architecture & Flow](ARCHITECTURE.md)
- [Scaling Advice](SCALING_ADVICE.md)
- [API Docs](http://localhost:8000/docs)
