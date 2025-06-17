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


def preprocessing(camera_streams, start_index):
    global preprocess_outputs, batch_ref_id

    def get_frame(thread):
        ret_, (frame_tensor, key, frame, timestamp) = thread.get()
        frame_tensor = frame_tensor.div_(255.0)
        return ret_, key, frame, frame_tensor, timestamp

    batch_id = 0
    with ThreadPoolExecutor(max_workers=len(camera_streams)) as executor:
        while True:
            futures = [executor.submit(get_frame, thread) for thread in camera_streams]
            results = [future.result() for future in futures]

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


def main(
    net,
    start_index,
    camera_streams,
    topics,
):
    global preprocess_outputs, batch_ref_id
    trackers = [sv.ByteTrack() for _ in range(len(topics))]
    executor = ThreadPoolExecutor(max_workers=8)
    stream = torch.cuda.Stream()
    start = time.time()
    import threading

    preprocess_thread = threading.Thread(
        target=preprocessing, args=(camera_streams, start_index)
    )
    preprocess_thread.start()
    producer = Producer(
        {
            "bootstrap.servers": KAFKA_SERVER,  
            "message.max.bytes": 10 * 1024 * 1024,  # 10 MB
            "enable.ssl.certificate.verification": False,
        }
    )
    while True:
        try:
            time.sleep(1 / 100)
            if preprocess_outputs[0] is None:
                continue
            ret, keys, frames, timestamps, frames_tensor, batch_id = preprocess_outputs
            if batch_ref_id != batch_id:
                batch_ref_id = batch_id
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
            else:
                continue
            if start_index == 0:
                elapsed_time = time.time() - start
                start = time.time()
                print(f"FPS: {1/elapsed_time}", batch_id, ret)

            for idx, result in enumerate(results):
                if not ret[idx]:
                    continue
                send_metadata(
                    producer,
                    result,
                    keys[idx],
                    topics[idx],
                    frames[idx],
                    timestamps[idx],
                    trackers[idx],
                )
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


from rich.console import Console

console = Console()

import argparse

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
    net = YOLO("src/ai-streaming/models/detect/CHECKPOINTCCCCCCC.engine")

    mongo_client = pymongo.MongoClient(
        "mongodb://admin:anh123@100.112.243.28:27010/?authSource=admin"
    )
    metadata = mongo_client["nano"]["camera"]
    metadata = list(metadata.find({}))
    logger.info(f"Connected to mongodb: {MONGODB_SERVER}!")

    camera_data = metadata[args.start_index : args.start_index + args.num_cam]

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
