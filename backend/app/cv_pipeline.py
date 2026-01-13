import cv2
import numpy as np
from ultralytics import YOLO
import logging
from collections import deque
import time
import os
from .notifications import TelegramBot

logger = logging.getLogger(__name__)

class FallDetector:
    def __init__(self, model_path='yolov8n-pose.pt', telegram_config=None):
        logger.info(f"Loading YOLO model: {model_path}")
        self.model = YOLO(model_path)
        self.track_history = {} # Store history for velocity calc: {track_id: deque([(ts, keypoints, bbox), ...])}
        self.fall_cooldown = {} # {track_id: last_fall_time}
        self.COOLDOWN_SECONDS = 5.0
        self.FALL_CONFIDENCE_THRESHOLD = 0.6
        
        # Heuristic thresholds
        self.ANGLE_THRESHOLD = 45 # degrees from vertical
        self.ASPECT_RATIO_THRESHOLD = 1.2 # width / height
        
        # Features
        self.night_mode = False
        
        token = telegram_config.get("bot_token") if telegram_config else None
        chat_id = telegram_config.get("chat_id") if telegram_config else None
        self.telegram_bot = TelegramBot(token=token, chat_id=chat_id)
        
        # Video Recording
        self.fps = 30
        self.buffer_duration = 5 # seconds
        self.buffer_size = self.fps * self.buffer_duration
        self.frame_buffer = deque(maxlen=self.buffer_size)
        self.active_recordings = [] # List of dicts: {'frames': [], 'target_length': int, 'track_id': int, 'start_ts': float}
        
        # Optimization
        self.frame_count = 0
        self.SKIP_FRAMES = 2 # Process 1 frame, skip 2 (effectively 10 FPS processing from 30 FPS input)
        self.last_results = None
        self.last_annotated_frame = None

    def set_night_mode(self, enabled: bool):
        self.night_mode = enabled
        logger.info(f"Night mode set to: {enabled}")

    def _preprocess_frame(self, frame):
        if not self.night_mode:
            return frame
        
        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # Convert to LAB color space
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L-channel
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        
        # Merge and convert back to BGR
        limg = cv2.merge((cl, a, b))
        final = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return final

    def process_frame(self, frame):
        self.frame_count += 1
        
        # Update buffer (always add every frame for smooth video recording)
        self.frame_buffer.append(frame.copy())
        
        # Update active recordings
        completed_recordings = []
        for rec in self.active_recordings:
            rec['frames'].append(frame.copy())
            if len(rec['frames']) >= rec['target_length']:
                completed_recordings.append(rec)
        
        # Process completed recordings
        for rec in completed_recordings:
            self.active_recordings.remove(rec)
            self._save_and_send_video(rec)

        # Optimization: Skip frames for inference
        # We still draw the LAST known boxes on skipped frames to maintain visual continuity
        if self.frame_count % (self.SKIP_FRAMES + 1) != 0 and self.last_results is not None:
            return self._draw_results(frame, self.last_results)

        # Preprocess for night vision if enabled
        processed_frame = self._preprocess_frame(frame)

        # Run inference with tracking
        # imgsz=640 ensures input is resized to 640 before inference, saving memory/compute on large images
        results = self.model.track(processed_frame, persist=True, verbose=False, classes=[0], imgsz=640) 
        
        self.last_results = results # Cache results
        return self._draw_results(frame, results)

    def _draw_results(self, frame, results):
        annotated_frame = frame.copy()
        events = []
        current_time = time.time()

        if results and results[0].boxes and results[0].keypoints:
            boxes = results[0].boxes.xywh.cpu().numpy()
            track_ids = results[0].boxes.id
            if track_ids is not None:
                track_ids = track_ids.int().cpu().numpy()
            else:
                track_ids = []
            
            keypoints = results[0].keypoints.xy.cpu().numpy() # (N, 17, 2)

            for i, track_id in enumerate(track_ids):
                bbox = boxes[i] # x_center, y_center, w, h
                kpts = keypoints[i]

                # Update history
                if track_id not in self.track_history:
                    self.track_history[track_id] = deque(maxlen=60) # Store ~2 sec at 30fps
                self.track_history[track_id].append((current_time, kpts, bbox))

                # Fall Detection Logic
                is_fall, score, reason = self._detect_fall(track_id, kpts, bbox)

                # Draw info
                color = (0, 255, 0)
                if is_fall:
                    color = (0, 0, 255)
                    # Check cooldown
                    last_fall = self.fall_cooldown.get(track_id, 0)
                    if current_time - last_fall > self.COOLDOWN_SECONDS:
                        self.fall_cooldown[track_id] = current_time
                        
                        event_data = {
                            "track_id": int(track_id),
                            "fall_score": float(score),
                            "is_fall": True,
                            "timestamp": current_time,
                            "reason": reason
                        }
                        events.append(event_data)
                        
                        # Start Recording
                        # Capture buffer (past) + need future frames
                        # Total length = buffer_size (past) + buffer_size (future)
                        recording = {
                            'frames': list(self.frame_buffer), # Copy current buffer
                            'target_length': len(self.frame_buffer) + self.buffer_size,
                            'track_id': int(track_id),
                            'start_ts': current_time,
                            'score': score
                        }
                        self.active_recordings.append(recording)
                        
                        cv2.putText(annotated_frame, f"FALL DETECTED! ({reason})", (int(bbox[0]-bbox[2]/2), int(bbox[1]-bbox[3]/2)-10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

                # Draw bbox
                x, y, w, h = bbox
                cv2.rectangle(annotated_frame, (int(x-w/2), int(y-h/2)), (int(x+w/2), int(y+h/2)), color, 2)
                cv2.putText(annotated_frame, f"ID: {track_id}", (int(x-w/2), int(y-h/2)-30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                # Draw skeleton (simplified)
                self._draw_skeleton(annotated_frame, kpts, color)

        return annotated_frame, events

    def _save_and_send_video(self, recording):
        try:
            frames = recording['frames']
            if not frames: return
            
            height, width, _ = frames[0].shape
            timestamp = int(recording['start_ts'])
            filename = f"fall_clip_{timestamp}_{recording['track_id']}.mp4"
            filepath = os.path.join("data/snapshots", filename)
            
            # Write video
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(filepath, fourcc, self.fps, (width, height))
            for f in frames:
                out.write(f)
            out.release()
            
            logger.info(f"Saved video clip: {filepath}")
            
            # Send via Telegram
            self.telegram_bot.send_video(
                caption=f"🎥 Fall Video Clip\nTrack ID: {recording['track_id']}\nScore: {recording['score']:.2f}",
                video_path=filepath
            )
        except Exception as e:
            logger.error(f"Failed to save/send video: {e}")


    def _detect_fall(self, track_id, keypoints, bbox):
        # 1. Aspect Ratio Check
        # bbox: x, y, w, h
        w, h = bbox[2], bbox[3]
        aspect_ratio = w / h
        
        # 2. Torso Angle Check
        # Keypoints: 5=L_Shoulder, 6=R_Shoulder, 11=L_Hip, 12=R_Hip
        # Average shoulder and hip points
        if len(keypoints) < 13: return False, 0.0, ""
        
        l_shoulder, r_shoulder = keypoints[5], keypoints[6]
        l_hip, r_hip = keypoints[11], keypoints[12]
        
        # Check if keypoints are detected (not [0,0])
        if np.sum(l_shoulder) == 0 or np.sum(l_hip) == 0:
            return False, 0.0, ""

        mid_shoulder = (l_shoulder + r_shoulder) / 2
        mid_hip = (l_hip + r_hip) / 2
        
        dx = mid_shoulder[0] - mid_hip[0]
        dy = mid_shoulder[1] - mid_hip[1] # y increases downwards
        
        # Angle with vertical axis (y-axis)
        angle_rad = np.arctan2(abs(dx), abs(dy))
        angle_deg = np.degrees(angle_rad)
        
        score = 0.0
        reason = []

        # Static Pose Checks
        pose_indicates_fall = False
        if angle_deg > self.ANGLE_THRESHOLD:
            score += 0.6
            reason.append("Angle")
            pose_indicates_fall = True
        
        if aspect_ratio > self.ASPECT_RATIO_THRESHOLD:
            score += 0.4
            reason.append("Ratio")
            pose_indicates_fall = True
            
        if not pose_indicates_fall:
            return False, 0.0, ""

        # 3. Dynamic Velocity Check (To distinguish from lying down slowly)
        # We check if there was a high downward velocity in the recent history
        has_velocity = self._check_fall_velocity(track_id, bbox[3])
        
        if has_velocity:
            score += 0.3
            reason.append("Velocity")
        else:
            # If no velocity, check for "Slow Collapse"
            # Conditions: Extreme Angle + Head Low (near ground/feet)
            
            # Check Head Height vs Ankle Height
            # Keypoints: 0=Nose, 15=L_Ankle, 16=R_Ankle
            head_y = keypoints[0][1] if keypoints[0][1] > 0 else 0
            
            l_ankle_y = keypoints[15][1]
            r_ankle_y = keypoints[16][1]
            
            # Get max ankle y (lowest point)
            ankle_y = max(l_ankle_y, r_ankle_y)
            if ankle_y == 0: ankle_y = bbox[1] + bbox[3]/2 # Fallback to bbox bottom
            
            # If head is close to ground (within 20% of height from ankle)
            # AND Angle is very large (> 60)
            head_dist_from_ground = abs(ankle_y - head_y)
            is_head_low = head_dist_from_ground < (bbox[3] * 0.3) # Head within 30% of height from feet level
            
            if angle_deg > 60 and is_head_low:
                score += 0.2
                reason.append("Collapsed")
            elif score < 0.8: 
                # If score is not overwhelming and no collapse signs, reject
                return False, score, "Static Only (Lying Down?)"
            
        is_fall = score >= self.FALL_CONFIDENCE_THRESHOLD
        return is_fall, score, ", ".join(reason)

    def _check_fall_velocity(self, track_id, current_height):
        history = self.track_history.get(track_id)
        if not history or len(history) < 5:
            return False
            
        # Check last ~1 second (30 frames)
        # We look for a peak downward velocity
        max_v_norm = 0.0
        
        # Iterate backwards to find recent fall
        # We compare frame i with frame i-5 to get smoother velocity
        history_list = list(history)
        for i in range(len(history_list) - 1, 5, -1):
            curr = history_list[i]
            prev = history_list[i-5]
            
            dt = curr[0] - prev[0]
            if dt <= 0: continue
            
            dy = curr[2][1] - prev[2][1] # Change in y_center (positive = down)
            
            # Normalize by height to be scale invariant
            # v_norm = (pixels/sec) / height = heights/sec
            v_norm = (dy / dt) / current_height
            
            if v_norm > max_v_norm:
                max_v_norm = v_norm
                
        # Threshold: > 0.5 heights per second is a reasonable "drop"
        # Walking is usually horizontal. Sitting down is slow. Falling is fast.
        return max_v_norm > 0.5

    def _draw_skeleton(self, frame, kpts, color):
        # Simple skeleton drawing
        # COCO Keypoints connections
        skeleton = [
            (5, 7), (7, 9), (6, 8), (8, 10), # Arms
            (11, 13), (13, 15), (12, 14), (14, 16), # Legs
            (5, 6), (11, 12), (5, 11), (6, 12) # Torso
        ]
        for p1, p2 in skeleton:
            if p1 < len(kpts) and p2 < len(kpts):
                pt1 = (int(kpts[p1][0]), int(kpts[p1][1]))
                pt2 = (int(kpts[p2][0]), int(kpts[p2][1]))
                if pt1 != (0,0) and pt2 != (0,0):
                    cv2.line(frame, pt1, pt2, color, 2)
