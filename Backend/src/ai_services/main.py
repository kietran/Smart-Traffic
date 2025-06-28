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
from camera import FrameQueue
import asyncio
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED

from modules.services import (
    handle_vehicle_counting,
    handle_license_plate,
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

# Add FastAPI imports
from fastapi import FastAPI, Request
import uvicorn

# Global state for dynamic camera management
camera_processes = {}
camera_lock = threading.Lock()

# Global configurations (will be set at startup)
global_producer_config = {}
global_consumer_config = {}
global_redis_client = None

# FastAPI app
app = FastAPI()

SERVICE_MAP = {
    "vehicle_counting": handle_vehicle_counting,
    "license_plate": handle_license_plate,
}
MAX_PENDING = 12

@app.post("/internal/add_camera")
async def api_add_camera(request: Request):
    """Add a new camera (but don't start ai-services until services are enabled)"""
    try:
        data = await request.json()
        camera_id = data["camera_id"]
        
        # Just acknowledge the camera addition - don't start processing yet
        logger.info(f"Camera {camera_id} added to system. AI services will start when enabled.")
        return {"status": "ok", "message": f"Camera {camera_id} registered. AI services will start when enabled."}
        
    except Exception as e:
        logger.error(f"Error adding camera: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/internal/enable_services")
async def api_enable_services(request: Request):
    """Start AI services for a camera when services are enabled"""
    try:
        data = await request.json()
        camera_id = data["camera_id"]
        
        # Fetch camera config from MongoDB
        client = MongoClient(MONGO_URI)
        db = client["nano"]
        camera_config = db.camera.find_one({"camera_id": camera_id})
        
        if not camera_config:
            return {"status": "error", "message": f"Camera {camera_id} not found in database"}
        
        # Check if camera has enabled services
        services = camera_config.get("services", {})
        
        # Consider services enabled if they have configuration data (unless explicitly disabled)
        enabled_services = {}
        for name, info in services.items():
            # If "enable" field exists, use it; otherwise assume enabled if service has lines/polygons
            explicitly_enabled = info.get("enable", None)
            has_config = info.get("lines") or info.get("polygons")
            
            if explicitly_enabled is True or (explicitly_enabled is None and has_config):
                enabled_services[name] = info
                
        if not enabled_services:
            # If no services enabled, stop any existing process
            remove_camera_process(camera_id)
            logger.info(f"Camera {camera_id} has no enabled services - not starting AI processing")
            return {"status": "ok", "message": f"No services enabled for camera {camera_id}. Process stopped if running."}
        
        # Start or restart the camera process with enabled services
        camera_name = camera_config["camera_name"]
        logger.info(f"Starting AI services for camera {camera_name} with services: {list(enabled_services.keys())}")
        
        with camera_lock:
            # Stop existing process if running
            if camera_name in camera_processes:
                logger.info(f"Restarting camera {camera_name} with updated services")
                remove_camera_process(camera_id)
        
        # Start new process with current configuration
        add_camera_process(camera_config)
        return {"status": "ok", "message": f"AI services started for camera {camera_id}: {list(enabled_services.keys())}"}
        
    except Exception as e:
        logger.error(f"Error enabling services: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/internal/remove_camera")
async def api_remove_camera(request: Request):
    """Remove a camera from processing"""
    try:
        data = await request.json()
        camera_id = data["camera_id"]
        
        remove_camera_process(camera_id)
        return {"status": "ok", "message": f"Camera {camera_id} process stopped"}
        
    except Exception as e:
        logger.error(f"Error removing camera: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/internal/cameras")
async def list_cameras():
    """List all active camera processes"""
    with camera_lock:
        active_cameras = list(camera_processes.keys())
    return {"status": "ok", "cameras": active_cameras}

def add_camera_process(camera_config):
    """Add a new camera process"""
    with camera_lock:
        camera_name = camera_config["camera_name"]
        camera_id = camera_config["camera_id"]
        
        if camera_name in camera_processes:
            logger.warning(f"Camera {camera_name} process already exists")
            return
        
        stop_event = multiprocessing.Event()
        
        process = multiprocessing.Process(
            target=start,
            args=(
                camera_config.copy(),
                global_producer_config,
                global_consumer_config,
                global_redis_client,
                stop_event,
            ),
        )
        
        camera_processes[camera_name] = {
            "process": process,
            "stop_event": stop_event,
            "camera_id": camera_id,
        }
        
        process.start()
        logger.info(f"Started new camera process: {camera_name} (ID: {camera_id})")

def remove_camera_process(camera_id):
    """Remove a camera process by camera_id"""
    with camera_lock:
        # Find camera by camera_id
        camera_name_to_remove = None
        for camera_name, process_info in camera_processes.items():
            if process_info["camera_id"] == camera_id:
                camera_name_to_remove = camera_name
                break
        
        if not camera_name_to_remove:
            logger.warning(f"Camera with ID {camera_id} not found in active processes")
            return
        
        process_info = camera_processes[camera_name_to_remove]
        process_info["stop_event"].set()
        process_info["process"].join(timeout=5.0)
        
        if process_info["process"].is_alive():
            logger.warning(f"Force killing camera process: {camera_name_to_remove}")
            kill_process(process_info["process"])
        
        del camera_processes[camera_name_to_remove]
        logger.info(f"Stopped camera process: {camera_name_to_remove} (ID: {camera_id})")

def run_api():
    """Run the FastAPI server in a separate thread"""
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")

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
    # Fallback: convert list to dict if needed
    if isinstance(service_info, list):
        service_info = {
            s["service_name"]: s for s in service_info if "service_name" in s
        }
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
    camera_name = camera_info.get("camera_name", "unknown")
    camera_id = camera_info.get("camera_id", "unknown")

    import copy

    # Handle missing services field gracefully
    service_info = camera_info.get("services", {})
    if not service_info:
        logger.info(f"Camera {camera_name} (ID: {camera_id}) has no AI services configured. Process will wait for service activation.")
        # Create minimal service info to avoid errors
        service_info = {}
    
    if isinstance(service_info, list):
        service_info = {
            s["service_name"]: s for s in service_info if "service_name" in s
        }
    
    # Check if there are any enabled services
    enabled_services = {name: info for name, info in service_info.items() if info.get("enable", False)}
    
    if not enabled_services:
        logger.info(f"Camera {camera_name} (ID: {camera_id}) has no enabled AI services. Starting minimal process for future activation.")
        # Run minimal loop that just consumes Kafka messages without processing
        topic = camera_info["camera_name"]
        camera_queue = FrameQueue(consumer_config, topic)
        camera_queue.start()
        
        while True:
            if stop_event and stop_event.is_set():
                logger.info(f"Stopping minimal process for camera {camera_name}")
                camera_queue.stop()
                break
            # Just consume messages without processing to keep Kafka offset moving
            ret, (img, detections, ikey, timestamp) = camera_queue.get()
            if not ret:
                continue
            # Log periodically that camera is ready but has no services
            import time
            if int(time.time()) % 300 == 0:  # Every 5 minutes
                logger.info(f"Camera {camera_name} is ready. Waiting for AI services to be configured.")
        
        camera_queue.join()
        return

    # Normal processing with configured services
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
    lpr_tracker.start()

    # Handle license_plate service configuration safely
    view_transformer = None
    if "license_plate" in service_info_scaled and service_info_scaled["license_plate"].get("polygons"):
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
    
    logger.info(f"Camera {camera_name} (ID: {camera_id}) started with AI services: {list(enabled_services.keys())}")
    
    while True:
        if stop_event and stop_event.is_set():
            logger.info(f"Stopping process for camera {camera_name}")
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
            None,
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
    """Initialize camera consumers for existing cameras"""
    global global_producer_config, global_consumer_config, global_redis_client
    
    # Store global configs for dynamic camera management
    global_producer_config = producer_config
    global_consumer_config = consumer_config
    global_redis_client = redis_client

    client = MongoClient(MONGO_URI)
    db = client["nano"]
    camera_configs = fetch_camera_configs(db)

    with camera_lock:
        for config in camera_configs:
            camera_name = config["camera_name"]
            camera_id = config["camera_id"]
            
            # Only start processes for cameras with enabled services
            services = config.get("services", {})
            enabled_services = {name: info for name, info in services.items() if info.get("enable", False)}
            
            if not enabled_services:
                logger.info(f"Camera {camera_name} (ID: {camera_id}) has no enabled services. Skipping startup.")
                continue
            
            stop_event = multiprocessing.Event()
            process = multiprocessing.Process(
                target=start,
                args=(
                    config,
                    producer_config,
                    consumer_config,
                    redis_client,
                    stop_event,
                ),
            )
            
            camera_processes[camera_name] = {
                "process": process,
                "stop_event": stop_event,
                "camera_id": camera_id,
            }
            
            process.start()
            logger.info(f"Starting initial camera process: {camera_name} (ID: {camera_id}) with services: {list(enabled_services.keys())}")

    logger.info(f"Initialized {len(camera_processes)} camera processes with enabled AI services")


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

    # Start FastAPI server in background thread
    api_thread = threading.Thread(target=run_api, daemon=True)
    api_thread.start()
    logger.info("AI services FastAPI server started on port 8003")

    # Initialize camera consumers for existing cameras
    init_camera_consumer(producer_config, consumer_config, redis_client)
    
    try:
        logger.info("AI services main loop started. Camera processes are running.")
        while True:
            sleep(600)  # Check every 10 minutes
            # Clean up any dead processes
            cleanup_dead_processes()
    except KeyboardInterrupt:
        logger.info("Exiting...")

    # Cleanup all processes
    cleanup_all_processes()
    logger.info("All processes stopped")

def cleanup_dead_processes():
    """Remove any dead processes from the process map"""
    with camera_lock:
        dead_cameras = []
        for camera_name, process_info in camera_processes.items():
            if not process_info["process"].is_alive():
                dead_cameras.append(camera_name)
        
        for camera_name in dead_cameras:
            logger.warning(f"Removing dead camera process: {camera_name}")
            del camera_processes[camera_name]

def cleanup_all_processes():
    """Stop all camera processes gracefully"""
    with camera_lock:
        for camera_name, process_info in camera_processes.items():
            logger.info(f"Stopping camera process: {camera_name}")
            process_info["stop_event"].set()
            process_info["process"].join(timeout=5.0)
            
            if process_info["process"].is_alive():
                logger.warning(f"Force killing camera process: {camera_name}")
                kill_process(process_info["process"])
        
        camera_processes.clear()


if __name__ == "__main__":
    logger.info("Starting AI Services with dynamic camera management...")
    init_config_and_start()
