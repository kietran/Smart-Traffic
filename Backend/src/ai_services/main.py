import threading
import multiprocessing
from time import sleep
import math
import numpy as np
from confluent_kafka import Producer

from config import KAFKA_SERVER
from utils.logger import logger
from utils.draw import ServicesDrawer
import redis
from config import REDIS_HOST, REDIS_PORT
from modules.lpr_tracker import LPRTracker
from modules.reid_tracker import REIDTracker
from camera import FrameQueue
import asyncio
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED

from modules.services import (
    handle_crowd_detection,
    handle_vehicle_counting,
    handle_license_plate,
    handle_speed_estimate,
    handle_reid,
    handle_traffic_light,
    handle_wrong_lane,
)

from config import (
    KAFKA_SERVER,
    MONGO_DATABASE,
    MONGO_HOST,
    MONGO_PORT,
    MONGO_USER,
    MONGO_PASSWORD,
    MONGO_URI,
)
from confluent_kafka import Consumer, KafkaError, TopicPartition, Producer, OFFSET_END
from collections import defaultdict



SERVICE_MAP = {
    "crowd_detection": handle_crowd_detection,
    "vehicle_counting": handle_vehicle_counting,
    "license_plate": handle_license_plate,
    # "speed_estimate": handle_speed_estimate,
    "reidentify": handle_reid,
    # "traffic_light": handle_traffic_light,
    # "wrong_lane": handle_wrong_lane,
}
MAX_PENDING = 12
def run_services(
    camera_info,
    service_info,
    img,
    detections,
    services_drawer,
    producer,
    ikey,
    timestamp,
    lpr_tracker,
    reid_tracker,
    view_transformer,
    trigger_threads,
    stop_events,
    redis_client,
    executor,
    pending,
    db,
):
    topic = camera_info["camera_id"]
    for service_name, info in service_info.items():
        
        if not info["enable"]:
            continue

        if service_name in SERVICE_MAP:
            handler = SERVICE_MAP[service_name]
            tracker = None
            vga_drawer = services_drawer["vga_size"].drawer.get(service_name)
            org_drawer = services_drawer["org_size"].drawer.get(service_name)
            if service_name == "license_plate":
                tracker = lpr_tracker
            elif service_name == "reidentify":
                tracker = reid_tracker
            elif service_name == "speed_estimate":
                tracker = view_transformer
                vga_drawer = services_drawer["vga_size"].drawer.get("license_plate")
                org_drawer = services_drawer["org_size"].drawer.get("license_plate")
            if len(pending) >= MAX_PENDING:
                done, _ = wait(pending, return_when=FIRST_COMPLETED)
                pending -= done
                
            future=executor.submit(
                handler,
                topic,
                img.copy(),
                detections,
                camera_info,
                info,
                tracker,
                vga_drawer,
                org_drawer,
                producer,
                trigger_threads[service_name],
                stop_events[service_name],
                ikey,
                timestamp,
                redis_client,
                db,
            )
            pending.add(future)
    
    wait(pending)

def extract_camera_data(service_info, image_size=(640, 480)):
    img_width, img_height = image_size[0], image_size[1]
    for service_name, data in service_info.items():
        if data["polygons"]:
            for polygon in data["polygons"]:
                if len(polygon["zone"]) != 4:
                    continue
                polygon["zone"] = [
                    [z[0] * img_width, z[1] * img_height] for z in polygon["zone"]
                ]

        if data["lines"]:
            for line in data["lines"]:
                if len(line["start"]) != 2 or len(line["end"]) != 2:
                    continue

                line["start"] = [
                    line["start"][0] * img_width,
                    line["start"][1] * img_height,
                ]
                line["end"] = [line["end"][0] * img_width, line["end"][1] * img_height]

    return service_info


import os
import signal
import cv2


class ViewTransformer:

    def __init__(self, source: np.ndarray, target: np.ndarray) -> None:
        source = source.astype(np.float32)
        target = target.astype(np.float32)
        self.m = cv2.getPerspectiveTransform(source, target)

    def transform_points(self, points: np.ndarray) -> np.ndarray:
        if points.size == 0:
            return points

        reshaped_points = points.reshape(-1, 1, 2).astype(np.float32)
        transformed_points = cv2.perspectiveTransform(reshaped_points, self.m)
        return transformed_points.reshape(-1, 2)


def start(
    camera_info,
    producer_config,
    consumer_config,
    redis_client,
    stop_event=None,
):
    client = MongoClient(MONGO_URI)
    db = client["nano"]

    import copy

    service_info = camera_info.pop("services")
    service_info_scaled = extract_camera_data(copy.deepcopy((service_info)), (640, 640))
    service_info_org = extract_camera_data(
        copy.deepcopy((service_info)),
        (camera_info["resolution"]["width"], camera_info["resolution"]["height"]),
    )

    topic = camera_info["camera_name"]

    services_drawer = {
        "vga_size": ServicesDrawer(service_info_scaled),
        "org_size": ServicesDrawer(service_info_org),
    }
    executor = ThreadPoolExecutor(max_workers=MAX_PENDING)

    stop_events = {
        service_name: threading.Event() for service_name in SERVICE_MAP.keys()
    }
    trigger_threads = {
        service_name: [threading.Thread(), threading.Thread()]
        for service_name in SERVICE_MAP.keys()
    }

    producer = Producer(producer_config)

    lpr_tracker = LPRTracker()
    reid_tracker = REIDTracker()
    lpr_tracker.start()
    reid_tracker.start()

    SOURCE = np.array(
        service_info_scaled["license_plate"]["polygons"][0]["zone"]
    ).astype(int)

    TARGET_ZONE_WIDTH = 9
    TARGET_ZONE_HEIGHT = 250

    TARGET = np.array(
        [
            [0, 0],
            [TARGET_ZONE_WIDTH - 1, 0],
            [TARGET_ZONE_WIDTH - 1, TARGET_ZONE_HEIGHT - 1],
            [0, TARGET_ZONE_HEIGHT - 1],
        ]
    )

    view_transformer = ViewTransformer(source=SOURCE, target=TARGET)
    camera_queue = FrameQueue(consumer_config, topic)
    camera_queue.start()
    pending = set()
    while True:
        
        if stop_event and stop_event.is_set():
            logger.info(f"Stopping process for camera {camera_info['camera_name']}")
            camera_queue.stop()
            break
        ret, (img, detections, ikey, timestamp) = camera_queue.get()
        if not ret:
            continue
        run_services(
            camera_info,
            service_info,
            img,
            detections,
            services_drawer,
            producer,
            ikey,
            timestamp,
            lpr_tracker,
            reid_tracker,
            view_transformer,
            trigger_threads,
            stop_events,
            redis_client,
            executor,
            pending,
            db,
        )

    camera_queue.join()
    producer.flush()


def fetch_camera_configs(db):
    camera_collection = db["camera"]
    camera_configs = camera_collection.find()
    return camera_configs


def kill_process(process):
    pid = process.pid
    try:
        os.kill(process.pid, signal.SIGTERM)
        process.join(timeout=1.0)
    except OSError:
        logger.error(f"Failed to send SIGTERM signal to process {pid}")


def init_camera_consumer(producer_config, consumer_config, redis_client):
    process_map = {}

    client = MongoClient(MONGO_URI)
    db = client["nano"]
    camera_configs = fetch_camera_configs(db)

    for config in camera_configs:
        cam_id = config["camera_name"]
        stop_cam = multiprocessing.Event()
        process_map[cam_id] = {
            "process": multiprocessing.Process(
                target=start,
                args=(
                    config,
                    producer_config,
                    consumer_config,
                    redis_client,
                    stop_cam,
                ),
            ),
            "stop_cam": stop_cam,
        }
        process_map[cam_id]["process"].start()
        logger.info(f"Starting new camera process: {cam_id}")

    return process_map


from pymongo import MongoClient


def init_config_and_start():

    producer_config = {
        "bootstrap.servers": KAFKA_SERVER,
        "linger.ms": 5,
        "batch.size": 20,
        "message.max.bytes": 10000000,
        "enable.ssl.certificate.verification": False,
    }
    consumer_config = {
        "bootstrap.servers": KAFKA_SERVER,
        "auto.offset.reset": "latest",
        "fetch.min.bytes": 1000000,
        "fetch.message.max.bytes": 100000000,
        "enable.ssl.certificate.verification": False,
        "enable.auto.commit": False,
    }
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

    processes = init_camera_consumer(producer_config, consumer_config, redis_client)
    try:
        while True:
            sleep(600)
    except KeyboardInterrupt:
        logger.info("Exiting...")

    for p in processes.values():
        p["stop_cam"].set()
        p["process"].join()
        kill_process(p["process"])
    logger.info("All processes stopped")


if __name__ == "__main__":
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    loop.run_until_complete(init_config_and_start())
