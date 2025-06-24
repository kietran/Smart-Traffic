import datetime
import numpy as np
import pymongo
import supervision as sv
import torch
from ultralytics import YOLO
import cv2
from rich import print, inspect
from os.path import join
from utils.logger import logger
import json
from config import MONGODB_SERVER, KAFKA_SERVER, REDIS_HOST, REDIS_PORT
import time
from utils.camera import Camera
from confluent_kafka import Producer
from utils.common import encode_image, serialize_data
from utils.kafka import pub_kafka_metadata
from utils.redis import RedisHandler
import queue

import multiprocessing
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, Request
import uvicorn
import threading

# Global state for dynamic camera management
camera_streams = []
topics = []
trackers = []
preprocess_outputs = (None, None, None, None, None, None)
batch_ref_id = 0

# Model and infrastructure initialization
net = YOLO("src/ai-streaming/models/detect/CHECKPOINTCCCCCCC.pt")
redis_client = RedisHandler(host=REDIS_HOST, port=REDIS_PORT, db=0, timeout=5)
producer = Producer({
    "bootstrap.servers": KAFKA_SERVER,
    "message.max.bytes": 10 * 1024 * 1024,
    "enable.ssl.certificate.verification": False,
})

app = FastAPI()

@app.post("/internal/add_camera")
async def api_add_camera(request: Request):
    data = await request.json()
    camera_id = data["camera_id"]
    url = data["url"]
    add_camera(camera_id, url)
    return {"status": "ok"}

@app.post("/internal/remove_camera")
async def api_remove_camera(request: Request):
    data = await request.json()
    camera_id = data["camera_id"]
    remove_camera(camera_id)
    return {"status": "ok"}

def add_camera(camera_id, url):
    global camera_streams, topics, trackers
    cam = Camera(url, redis_client, topic=camera_id, cam=0)
    camera_streams.append(cam)
    topics.append(camera_id)
    trackers.append(sv.ByteTrack())
    logger.info(f"Camera {camera_id} added and started.")

def remove_camera(camera_id):
    global camera_streams, topics, trackers
    if camera_id in topics:
        idx = topics.index(camera_id)
        camera_streams[idx].stop()
        camera_streams[idx].join()
        del camera_streams[idx]
        del topics[idx]
        del trackers[idx]
        logger.info(f"Camera {camera_id} stopped and removed.")

# Main processing loop (runs even if no cameras yet)
def main_loop():
    global preprocess_outputs, batch_ref_id
    stream = torch.cuda.Stream()
    import threading

    # Track last push time for each topic
    last_push_time = {}
    push_interval = 120  # seconds (2 minutes)
    topic_initialized = {}

    def preprocessing():
        global preprocess_outputs, batch_ref_id
        while True:
            if not camera_streams:
                time.sleep(0.5)
                continue
            def get_frame(thread):
                ret_, (frame_tensor, key, frame, timestamp) = thread.get()
                frame_tensor = frame_tensor.div_(255.0)
                return ret_, key, frame, frame_tensor, timestamp
            with ThreadPoolExecutor(max_workers=len(camera_streams) if len(camera_streams) else 4) as executor:
                futures = [executor.submit(get_frame, thread) for thread in camera_streams]
                results = [future.result() for future in futures]
                ret_list, keys, frames_list, frames_tensor_list, timestamps = zip(*results)
                batch_tensor = torch.stack(frames_tensor_list)
                batch_id = batch_ref_id + 1
                preprocess_outputs = (
                    list(ret_list),
                    list(keys),
                    list(frames_list),
                    list(timestamps),
                    batch_tensor,
                    batch_id,
                )
                batch_ref_id = batch_id

    preprocess_thread = threading.Thread(target=preprocessing, daemon=True)
    preprocess_thread.start()
    while True:
        try:
            time.sleep(1 / 15)
            if not camera_streams or preprocess_outputs[0] is None:
                continue
            ret, keys, frames, timestamps, frames_tensor, batch_id = preprocess_outputs
            if batch_ref_id != batch_id:
                continue
            with torch.cuda.stream(stream):
                results = net(
                    frames_tensor,
                    stream=False,
                    verbose=False,
                    conf=0.4,
                    iou=0.7,
                    agnostic_nms=True,
                    classes=[1, 2, 3, 4, 5],
                )
            for idx, result in enumerate(results):
                if not ret[idx]:
                    continue
                topic = topics[idx]
                now = time.time()
                logger.info(f"[Inference] Frame processed for topic {topic} at {now}. Result: {result}")
                should_push = False
                if topic not in topic_initialized:
                    should_push = True
                    topic_initialized[topic] = True
                    logger.info(f"First frame for topic {topic} - pushing immediately")
                elif topic not in last_push_time or now - last_push_time[topic] >= push_interval:
                    should_push = True
                
                if should_push:
                    logger.info(f"[Metadata] Sending metadata for topic {topic} at {now}")
                    send_metadata(
                        producer,
                        result,
                        keys[idx],
                        topics[idx],
                        frames[idx],
                        timestamps[idx],
                        trackers[idx],
                    )
                    last_push_time[topic] = now
        except KeyboardInterrupt:
            for camera in camera_streams:
                camera.stop()
                camera.join()
                logger.info(f"Camera {camera} stopped.")
            break
        except Exception as e:
            console.print_exception()
            logger.error(f"Error: {e}")
            continue


import uuid


def send_metadata(
    producer,
    result,
    key,
    topic,
    frame,
    timestamp,
    tracker,
):
    try:
        result = result.to("cpu")
        detections = sv.Detections.from_ultralytics(result)
        detections = tracker.update_with_detections(detections)
        meta = {
            "timestamp": timestamp,
            "detections": detections.xyxy.tolist(),
            "confidences": detections.confidence.tolist(),
            "class_ids": detections.class_id.tolist(),
            "data": {
                "class_name": detections.data.get("class_name", np.empty(0)).tolist()
            },
            "track_ids": detections.tracker_id.tolist(),
        }
        frame_bytes = encode_image(frame)
        data = serialize_data(frame_bytes, meta)

        pub_kafka_metadata(
            producer,
            f"stream.{topic}",
            key,
            data,
        )
    except Exception as e:
        console.print_exception()
        logger.error(f"Error: {e}")


from rich.console import Console

console = Console()

import argparse

def run_api():
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")

if __name__ == "__main__":
    # Start FastAPI in a background thread
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    logger.info("AI streaming service started. No cameras running by default.")
    main_loop()
    cv2.destroyAllWindows()