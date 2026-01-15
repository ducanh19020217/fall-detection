import cv2
import numpy as np
from ultralytics import YOLO
import logging
from collections import deque
import time
import os
from .notifications import TelegramBot
import threading

logger = logging.getLogger(__name__)

_MODEL_CACHE = {}
_MODEL_CACHE_LOCK = threading.Lock()


class FallDetector:
    _SKELETON = (
        (5, 7), (7, 9), (6, 8), (8, 10),
        (11, 13), (13, 15), (12, 14), (14, 16),
        (5, 6), (11, 12), (5, 11), (6, 12)
    )

    def __init__(self, model_path='yolov8n-pose.pt', telegram_config=None):
        global _MODEL_CACHE

        with _MODEL_CACHE_LOCK:
            if model_path not in _MODEL_CACHE:
                logger.info(f"Loading YOLO model: {model_path}")
                _MODEL_CACHE[model_path] = YOLO(model_path)
            else:
                logger.info(f"Using cached YOLO model: {model_path}")

        self.model = _MODEL_CACHE[model_path]

        # --- Only store what velocity needs ---
        # {track_id: deque([(ts, y_center, height), ...])}
        self.track_history = {}
        self.fall_cooldown = {}
        self.COOLDOWN_SECONDS = 5.0
        self.FALL_CONFIDENCE_THRESHOLD = 0.8

        # Heuristic thresholds
        self.ANGLE_THRESHOLD = 55
        self.ASPECT_RATIO_THRESHOLD = 1.5

        # --- NEW: Pending-fall confirmation (avoid sit->stand false alarms) ---
        # track_id -> {"t0": float, "best_score": float, "reason": str, "recovered_since": float|None}
        self.pending_falls = {}
        self.CONFIRM_SECONDS = 1.8        # must remain "lying" for >= this time to confirm
        self.RECOVER_CLEAR_SECONDS = 0.6  # if upright for >= this time, cancel pending

        # Features
        self.night_mode = False
        self._clahe = None

        # Telegram
        token = telegram_config.get("bot_token") if telegram_config else None
        chat_id = telegram_config.get("chat_id") if telegram_config else None
        self.telegram_bot = TelegramBot(token=token, chat_id=chat_id)

        # Optimization
        self.frame_count = 0
        self.SKIP_FRAMES = 2  # process 1, skip 2
        self.last_results = None

        # 480p processing target
        self.TARGET_H = 480

        # Skeleton draw config
        self.KPT_CONF_THR = 0.35

    def set_night_mode(self, enabled: bool):
        self.night_mode = enabled
        if enabled and self._clahe is None:
            self._clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        logger.info(f"Night mode set to: {enabled}")

    def _resize_to_480h(self, frame):
        """
        Resize by fixing height=480, keep aspect ratio.
        Returns resized frame.
        """
        h, w = frame.shape[:2]
        if h == self.TARGET_H:
            return frame
        scale = self.TARGET_H / float(h)
        new_w = int(w * scale)
        return cv2.resize(frame, (new_w, self.TARGET_H), interpolation=cv2.INTER_AREA)

    def _preprocess_frame(self, frame):
        if not self.night_mode:
            return frame

        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        if self._clahe is not None:
            l = self._clahe.apply(l)
        limg = cv2.merge((l, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

    def process_frame(self, frame):
        """
        Returns: (annotated_frame, events)
        Note: annotated_frame is on 480p-resized image.
        """
        self.frame_count += 1
        current_time = time.time()

        frame_480 = self._resize_to_480h(frame)

        # Skip inference frames: only draw cached last_results
        if (self.frame_count % (self.SKIP_FRAMES + 1) != 0) and (self.last_results is not None):
            return self._draw_results(
                frame_480,
                self.last_results,
                current_time=current_time,
                draw_skeleton=False,
                emit_events=False
            )

        processed = self._preprocess_frame(frame_480)

        results = self.model.track(
            processed,
            persist=True,
            verbose=False,
            classes=[0],
            imgsz=640
        )

        self.last_results = results
        return self._draw_results(
            frame_480,
            results,
            current_time=current_time,
            draw_skeleton=True,
            emit_events=True
        )

    def _draw_results(self, frame, results, current_time=None, draw_skeleton=True, emit_events=True):
        annotated = frame.copy()
        events = []

        if current_time is None:
            current_time = time.time()

        if not results or results[0].boxes is None or results[0].boxes.xywh is None:
            return annotated, events

        r0 = results[0]
        boxes = r0.boxes.xywh.cpu().numpy()
        track_ids = r0.boxes.id
        if track_ids is None:
            return annotated, events
        track_ids = track_ids.int().cpu().numpy()

        kpts_xy = None
        kpts_conf = None
        if getattr(r0, "keypoints", None) is not None and r0.keypoints is not None:
            if r0.keypoints.xy is not None:
                kpts_xy = r0.keypoints.xy.cpu().numpy()
            if hasattr(r0.keypoints, "conf") and r0.keypoints.conf is not None:
                kpts_conf = r0.keypoints.conf.cpu().numpy()

        for i, track_id in enumerate(track_ids):
            bbox = boxes[i]
            x, y, w, h = bbox
            x1, y1 = int(x - w / 2), int(y - h / 2)
            x2, y2 = int(x + w / 2), int(y + h / 2)

            color = (0, 255, 0)
            is_fall = False
            score = 0.0
            reason = ""

            if emit_events and (kpts_xy is not None) and i < len(kpts_xy):
                kpts = kpts_xy[i]

                # Update minimal history for velocity
                if track_id not in self.track_history:
                    self.track_history[track_id] = deque(maxlen=60)
                self.track_history[track_id].append((current_time, float(y), float(h)))

                is_fall, score, reason = self._detect_fall(track_id, kpts, bbox, current_time)

                if is_fall:
                    color = (0, 0, 255)
                    last_fall = self.fall_cooldown.get(int(track_id), 0.0)
                    if current_time - last_fall > self.COOLDOWN_SECONDS:
                        self.fall_cooldown[int(track_id)] = current_time

                        event_data = {
                            "track_id": int(track_id),
                            "fall_score": float(score),
                            "is_fall": True,
                            "timestamp": current_time,
                            "reason": reason
                        }
                        events.append(event_data)

                        cv2.putText(
                            annotated,
                            f"FALL CONFIRMED! ({reason})",
                            (x1, max(0, y1 - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.8,
                            (0, 0, 255),
                            2
                        )

                        # Optional: send snapshot
                        try:
                            if hasattr(self.telegram_bot, "send_photo"):
                                ok, buf = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                                if ok:
                                    self.telegram_bot.send_photo(
                                        caption=f"📸 Fall Snapshot (CONFIRMED)\nTrack ID: {int(track_id)}\nScore: {score:.2f}\nReason: {reason}",
                                        photo_bytes=buf.tobytes()
                                    )
                        except Exception as e:
                            logger.debug(f"Snapshot send skipped/failed: {e}")

                # If pending, show hint (optional, very light)
                elif reason == "Pending":
                    cv2.putText(
                        annotated,
                        "FALL? (pending confirm)",
                        (x1, max(0, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 165, 255),
                        2
                    )

            # Draw bbox + ID
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                annotated,
                f"ID: {int(track_id)}",
                (x1, max(0, y1 - 30)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2
            )

            # Draw skeleton only when useful
            if draw_skeleton and (kpts_xy is not None) and i < len(kpts_xy):
                if is_fall or score >= 0.6:
                    conf_row = (kpts_conf[i] if kpts_conf is not None and i < len(kpts_conf) else None)
                    self._draw_skeleton_fast(annotated, kpts_xy[i], color, conf_row)

        return annotated, events

    def _posture(self, angle_deg: float, aspect_ratio: float):
        """
        Classify posture roughly using hysteresis-like thresholds.
        - upright: clearly standing/sitting upright
        - lying: clearly horizontal / fallen
        """
        upright = (angle_deg < 35.0) and (aspect_ratio < 1.15)
        lying = (angle_deg > 60.0) or (aspect_ratio > 1.65)
        return upright, lying

    def _detect_fall(self, track_id, keypoints, bbox, current_time: float):
        """
        Returns (is_fall_confirmed, score, reason)
        Uses pending confirmation window to avoid sit->stand false positives.
        """
        w, h = float(bbox[2]), float(bbox[3])
        if h <= 1e-6:
            return False, 0.0, ""

        aspect_ratio = w / h

        if keypoints is None or len(keypoints) < 13:
            return False, 0.0, ""

        l_shoulder, r_shoulder = keypoints[5], keypoints[6]
        l_hip, r_hip = keypoints[11], keypoints[12]

        # Must have meaningful points
        if (l_shoulder[0] <= 0 and l_shoulder[1] <= 0) or (l_hip[0] <= 0 and l_hip[1] <= 0):
            return False, 0.0, ""

        mid_shoulder = (l_shoulder + r_shoulder) * 0.5
        mid_hip = (l_hip + r_hip) * 0.5

        dx = float(mid_shoulder[0] - mid_hip[0])
        dy = float(mid_shoulder[1] - mid_hip[1])

        angle_rad = np.arctan2(abs(dx), max(abs(dy), 1e-6))
        angle_deg = float(np.degrees(angle_rad))

        score = 0.0
        reason_parts = []
        pose_indicates_fall = False

        if angle_deg > self.ANGLE_THRESHOLD:
            score += 0.6
            reason_parts.append("Angle")
            pose_indicates_fall = True

        if aspect_ratio > self.ASPECT_RATIO_THRESHOLD:
            score += 0.4
            reason_parts.append("Ratio")
            pose_indicates_fall = True

        if not pose_indicates_fall:
            # If not even candidate, we can still clear pending if recovered long enough (handled below)
            pass

        has_velocity = self._check_fall_velocity(track_id)
        if pose_indicates_fall and has_velocity:
            score += 0.4
            reason_parts.append("Velocity")
        elif pose_indicates_fall:
            head_y = float(keypoints[0][1]) if keypoints[0][1] > 0 else 0.0
            ground_y = float(bbox[1] + bbox[3] / 2.0)
            head_relative_height = (ground_y - head_y) / h if h > 0 else 1.0

            if head_relative_height < 0.4:
                score += 0.3
                reason_parts.append("HeadLow")

        # Posture classification for confirmation logic
        upright, lying = self._posture(angle_deg, aspect_ratio)

        tid = int(track_id)
        pend = self.pending_falls.get(tid)

        # Define what is a "candidate" to start pending
        fall_candidate = pose_indicates_fall and (score >= self.FALL_CONFIDENCE_THRESHOLD)

        # Start/update pending if candidate happens
        if fall_candidate:
            if pend is None:
                self.pending_falls[tid] = {
                    "t0": current_time,
                    "best_score": float(score),
                    "reason": ", ".join(reason_parts),
                    "recovered_since": None
                }
                pend = self.pending_falls[tid]
            else:
                if score > pend.get("best_score", 0.0):
                    pend["best_score"] = float(score)
                    pend["reason"] = ", ".join(reason_parts)

        # If we have pending, decide confirm/cancel
        if pend is not None:
            # If upright => count recovered time and potentially cancel
            if upright:
                if pend.get("recovered_since") is None:
                    pend["recovered_since"] = current_time
                if (current_time - pend["recovered_since"]) >= self.RECOVER_CLEAR_SECONDS:
                    # Cancel: person stood back up (sit->stand, stumble recovery, etc.)
                    best = float(pend.get("best_score", score))
                    del self.pending_falls[tid]
                    return False, best, "Recovered"
            else:
                # Not upright => reset recovered timer
                pend["recovered_since"] = None

            # Confirm only if lying and has persisted long enough
            if lying and (current_time - pend["t0"]) >= self.CONFIRM_SECONDS:
                best_score = float(pend.get("best_score", score))
                best_reason = pend.get("reason", ", ".join(reason_parts))
                del self.pending_falls[tid]
                return True, best_score, f"{best_reason}"

            # Still pending
            return False, float(pend.get("best_score", score)), "Pending"

        # No pending and not confirmed
        return False, score, ""

    def _check_fall_velocity(self, track_id):
        history = self.track_history.get(track_id)
        if not history or len(history) < 6:
            return False

        hist = list(history)
        max_v_norm = 0.0

        for i in range(len(hist) - 1, 5, -1):
            t_curr, y_curr, h_curr = hist[i]
            t_prev, y_prev, _ = hist[i - 5]

            dt = t_curr - t_prev
            if dt <= 1e-6 or h_curr <= 1e-6:
                continue

            dy = (y_curr - y_prev)  # positive = down
            v_norm = (dy / dt) / h_curr  # heights/sec
            if v_norm > max_v_norm:
                max_v_norm = v_norm

        return max_v_norm > 0.5

    def _draw_skeleton_fast(self, frame, kpts_xy, color, kpts_conf=None):
        pts = kpts_xy.astype(np.int32, copy=False)

        if kpts_conf is not None:
            valid = kpts_conf > self.KPT_CONF_THR
        else:
            valid = (pts[:, 0] != 0) & (pts[:, 1] != 0)

        for p1, p2 in self._SKELETON:
            if valid[p1] and valid[p2]:
                cv2.line(
                    frame,
                    (int(pts[p1, 0]), int(pts[p1, 1])),
                    (int(pts[p2, 0]), int(pts[p2, 1])),
                    color,
                    2
                )
