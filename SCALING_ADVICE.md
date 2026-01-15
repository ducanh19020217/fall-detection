# Scaling & Resource Planning

This document provides guidance on resource requirements and strategies for scaling the system to handle more cameras and groups.

## 1. Resource Calculations (2-3 Streams)

Based on the current optimizations (Frame skipping 1/3, imgsz=640, YOLOv8n-pose):

| Component | 1 Stream | 2 Streams | 3 Streams |
| :--- | :--- | :--- | :--- |
| **CPU (Modern i5/i7)** | ~15-20% | ~30-40% | ~50-60% |
| **RAM (Baseline)** | ~800MB | ~1.1GB | ~1.4GB |
| **Storage (Snapshots)** | ~10MB/day | ~20MB/day | ~30MB/day |

### Key Assumptions:
- **No GPU**: All inference is done on the CPU (OpenVINO or standard PyTorch CPU).
- **Resolution**: Input streams are 1080p, resized to 640p for AI.
- **RAM Usage**: The baseline RAM includes the OS, Python runtime, and the YOLO model loaded into memory once. Each additional stream adds roughly 200-300MB for frame buffers and tracking state.

## 2. Scaling Strategies

When moving beyond 3-5 cameras, or adding many more groups, consider the following approaches:

### A. Horizontal Scaling (Distributed Processing)
Instead of one large server, use multiple small "Edge" nodes (e.g., Mini PCs or Raspberry Pi 5).
- **Central Manager**: One node runs the Database and Frontend.
- **Worker Nodes**: Multiple nodes run the `cv_pipeline`. They fetch configurations from the Central Manager and report events back.

## 📊 Monitoring Resource Usage

To monitor your system's health and resource consumption, use these tools:

### 1. System-wide (CPU/RAM)
Run `htop` in your terminal. It provides a real-time view of CPU cores, memory usage, and running processes.
```bash
sudo apt update && sudo apt install htop
htop
```

### 2. Container Specific
To see how much CPU and RAM each Docker container is using:
```bash
docker stats
```

### 3. Disk Space
If you encounter "No space left on device", check your disk usage:
```bash
df -h
```
To clean up unused Docker data (images, containers, volumes, build cache):
```bash
docker system prune -a --volumes
```

---

## 🍓 Raspberry Pi 8GB Optimization

The Raspberry Pi is capable but has limited CPU power compared to a PC. Follow these tips:

1.  **Use Nano Models**: We are already using `yolov8n-pose.pt`. Do not switch to `s`, `m`, or `l` models as they will be too slow.
2.  **Frame Skipping**: The current implementation processes every 3rd frame. On a Pi, you might want to increase this to every 5th frame if the lag is high.
3.  **Resolution**: Reduce the input stream resolution (e.g., 640x480) at the source if possible.
4.  **Cooling**: Ensure your Pi has a heatsink or fan, as CV processing generates significant heat which can cause thermal throttling.
5.  **Swap Space**: If you run out of RAM, ensure you have a swap file (at least 2GB) on a fast SSD/SD card.

### B. Message Queues
Implement a message broker (like **Redis** or **RabbitMQ**) to decouple detection from notification.
1. `cv_pipeline` detects a fall and pushes a message to the queue.
2. A separate `notification_worker` picks up the message and handles Telegram/Email/SMS.
This ensures that a slow network or Telegram API delay doesn't block the video processing.

### C. GPU Acceleration
If hardware allows, adding a budget GPU (e.g., NVIDIA T4 or even a consumer GTX 1650) can allow a single server to handle 10+ streams easily by moving inference from CPU to CUDA.

### D. Database Partitioning
If you have hundreds of cameras and thousands of events:
- Partition the `fall_events` table by month/year.
- Implement an automated cleanup script for old snapshots and video clips.

## 3. Deployment for Windows

For Windows environments, **Docker Desktop** is the recommended path. It provides:
- Consistent environment (Linux containers).
- Easy resource limiting (CPU/RAM caps).
- Simple "one-click" startup via `docker-compose`.
