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

    def get_frame(thread):
        if not thread.is_alive():
            logger.error(f"Camera process for {thread.rtsp_link} is not alive.")
            return None
            
        try:
            ret_, (frame_tensor, key, frame, timestamp) = thread.get()
            if not ret_:
                return None
            frame_tensor = frame_tensor.div_(255.0)
            return ret_, key, frame, frame_tensor, timestamp
        except Exception as e:
            logger.error(f"Error getting frame: {e}")
            return None

    batch_id = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        while True:
            futures = [executor.submit(get_frame, thread) for thread in camera_streams]
            results = [future.result() for future in futures if future.result() is not None]

            if not results:
                time.sleep(0.1)
                continue
            
            ret_list, keys, frames_list, frames_tensor_list, timestamps = zip(*results)
            # batch_tensor = torch.cat(frames_tensor_list, dim=0)
            batch_tensor = torch.stack(frames_tensor_list)
            while batch_ref_id != batch_id:
                time.sleep(1 / 100)
            batch_id += 1
            if batch_id == 1000:
                batch_id = 0
            preprocess_outputs = (
                list(ret_list),
                list(keys),
                list(frames_list),
                list(timestamps),
                batch_tensor,
                batch_id,
            )


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
    # add argument parser

    parser = argparse.ArgumentParser(description="Process camera.")
    parser.add_argument("--start_index", type=int, required=False, help="Start index")
    parser.add_argument("--num_cam", type=int, required=False, help="Number of camera")
    parser.add_argument("--meta_file", type=str, required=False, help="Meta file")

    args = parser.parse_args()

    preprocess_outputs = (None, None, None, None, None, None)
    batch_ref_id = 0
    # Load model
    net = YOLO("src/ai-streaming/models/detect/CHECKPOINTCCCCCCC.pt")

    mongo_client = pymongo.MongoClient(MONGODB_SERVER)
    camera_collection = mongo_client["nano"]["camera"]

    if camera_collection.count_documents({}) == 0:
        logger.info("Camera collection is empty. Populating from config/camera.json...")
        try:
            with open("src/ai-streaming/config/camera.json", "r") as f:
                camera_config_data = json.load(f)
            if camera_config_data:
                camera_collection.insert_many(camera_config_data)
                logger.info(f"Successfully inserted {len(camera_config_data)} camera documents.")
            else:
                logger.warning("camera.json is empty. No data to populate.")
        except FileNotFoundError:
            logger.error("src/ai-streaming/config/camera.json not found. Cannot populate camera collection.")
        except json.JSONDecodeError:
            logger.error("Error decoding camera.json. Please check its format.")

    metadata = list(camera_collection.find({}))
    logger.info(f"Connected to mongodb: {MONGODB_SERVER}!")
    logger.info(f"Found {len(metadata)} camera(s) in the database.")

    camera_data = metadata[args.start_index : args.start_index + args.num_cam]
    logger.info(f"Processing {len(camera_data)} camera(s) starting from index {args.start_index}.")

    if not camera_data:
        logger.warning("No camera data to process. Exiting.")

    CLASS_NAMES = net.names
    redis_client = RedisHandler(host=REDIS_HOST, port=REDIS_PORT, db=0, timeout=5)
    topics = [camera_data[i]["camera_id"] for i in range(len(camera_data))]
    camera_streams = [
        Camera(camera_data[i]["url"], redis_client, topic=topics[i], cam=0)
        for i in range(len(camera_data))
    ]
    main(
        net,
        args.start_index,
        camera_streams,
        topics,
    )

    cv2.destroyAllWindows()