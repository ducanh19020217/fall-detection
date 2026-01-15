# Fall Detection System

A complete computer vision system for detecting falls in real-time using YOLOv8, FastAPI, and React.

## Features
- **Real-time Detection**: Detects people and tracks their movement.
- **Fall Logic**: Analyzes pose (keypoints), aspect ratio, and orientation to detect falls.
- **Video Sources**: Supports RTSP streams, Webcams, and Video Files.
- **Interactive UI**: React-based dashboard with live video and event logging.
- **Event Logging**: Saves fall events with snapshots to SQLite.

## 🚀 Deployment for Users (No Source Code Needed)

If you just want to run the system without touching the code, you only need two files: `docker-compose.prod.yml` and `.env`.

1.  **Download the deployment files**:
    *   `docker-compose.prod.yml`
    *   `.env.example` (rename to `.env`)
2.  **Configure `.env`**:
    *   Set `DOCKER_USER` to the username where the images are hosted.
    *   (Optional) Set your Telegram Bot credentials.
3.  **Run the system**:
    ```bash
    docker compose -f docker-compose.prod.yml up -d
    ```
4.  **Access**: [http://localhost](http://localhost) (Login: `admin` / `admin`)

---

## 🛠️ Setup for Developers (Clone & Build)

If you want to modify the code and build your own images:

1.  **Clone the repository**
2.  **Run the setup script**:
    *   **Linux/macOS**: `chmod +x setup.sh && ./setup.sh`
    *   **Windows**: Double-click `setup.bat`

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
