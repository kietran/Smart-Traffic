import threading
import cv2
import time
import numpy as np
from utils.logger import logger
import asyncio
import multiprocessing
import uuid
import queue
import torch
from ultralytics import YOLO


class Camera(multiprocessing.Process):
    def __init__(self, rtsp_link, redis_client, topic, imgsz=(640, 640), cam=0):
        super().__init__()
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        self.img_queue = multiprocessing.Queue(maxsize=40)
        self.imgsz = imgsz
        self.topic = topic
        self.redis_client = redis_client
        self.is_running = True
        self.rtsp_link = rtsp_link
        self.base_image = np.zeros((imgsz[1], imgsz[0], 3), np.float32)
        self.base_image_tensor = (
            torch.from_numpy(self.base_image.astype(np.float32))
            .permute(2, 0, 1)
            .float()
            .div_(255.0)
            .to("cuda", non_blocking=True)
        )
        self.old_data = {
            "frame_id": None,
            "frame": None,
            "frame_tensor": None,
            "timestamp": None,
        }
        self.start()

    def run(self):
        self.camera = cv2.VideoCapture(self.rtsp_link)
        while True:
            if self.is_running == False:
                break
            self.ret, frame = self.camera.read()
            if self.ret:
                try:
      
                    if self.img_queue.full():
                        self.img_queue.get_nowait()
                    key = str(uuid.uuid4())
                    frame_bytes = cv2.imencode(
                        ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    )[1].tobytes()
                    self.redis_client.set(key, frame_bytes, ex=12)
                    self.img_queue.put_nowait(
                        (key, cv2.resize(frame, self.imgsz), time.time())
                    )
                except Exception as e:
                    continue
            else:
                retry_count = 0
                while True:
                    self.camera.open(self.rtsp_link)
                    if self.camera.isOpened():
                        break
                    if retry_count > 5:
                        break
                    logger.info(f"Reopen camera: {self.rtsp_link}")
                    retry_count += 1
                    time.sleep(1)
        self.camera.release()
        self.img_queue._queue.clear()

    def stop(self):
        self.is_running = False
        self.img_queue._queue.clear()

    def get(self):
        try:
            if self.img_queue.empty():
                raise queue.Empty
            frame_id, frame, timestamp = self.img_queue.get(timeout=0.1)
            frame_tensor = (
                torch.from_numpy(frame.astype(np.float32))
                .permute(2, 0, 1)
                .float()
                .to("cuda", non_blocking=True)
            )
            self.old_data["frame_id"] = frame_id
            self.old_data["frame"] = frame
            self.old_data["frame_tensor"] = frame_tensor
            self.old_data["timestamp"] = timestamp
            
            return True, (frame_tensor, frame_id, frame, timestamp)
        except queue.Empty:
            if self.old_data["frame_id"] is not None:
                return True, (
                    self.old_data["frame_tensor"],
                    self.old_data["frame_id"],
                    self.old_data["frame"],
                    self.old_data["timestamp"],
                )
            return False, (self.base_image_tensor, None, self.base_image, time.time())
        except Exception as e:
            logger.error(f"Unexpected error in get: {e}")
            return False, (self.base_image_tensor, None, self.base_image, time.time())
