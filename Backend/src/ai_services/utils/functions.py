import numpy as np
import cv2

from modules.kafka import pub_kafka, clean_message_producer, serialize_data
from utils.minio.upload_minio import upload_base64_image_to_minio
from utils.common import img_to_base64
import datetime
from time import sleep
import json
import uuid
from utils.logger import logger
import io
import cv2
from config import API_PORT, WS_ENDPOINT, API_HOST
import msgpack
import asyncio
import websockets
import time

def event_trigger(
    camera_info,
    event_type,
    annotated_frame,
    stop_event,
    producer,
    db,
    time_limit=15,
    annotation=None,
    service_params=None,
):
    try:
        camera_name = camera_info["camera_name"]
        camera_id = camera_info["camera_id"]
        area_id = camera_info["area_id"]
        area_name = camera_info["area_name"]

        current_time = time.time()
        event_item = None
        event_id = uuid.uuid4()
        if event_type == "license_plate":
            for i in range(len(service_params["lprs"])):

                plate_img = annotation["plate_imgs"][i]
                cropped_frame = annotation["cropped_frames"][i]
                full_frame = annotation["annotated_frames"][i]
                timestamp = service_params["timestamps"][i]
                obj_id = service_params["obj_ids"][i]
                attribute = service_params["attributes"][i]
                is_lost = service_params["is_losts"][i]
                lpr = service_params["lprs"][i]
                if plate_img is not None:

                    full_thumb_path = upload_image_to_minio(
                        full_frame, event_type, camera_name, dir_name="full"
                    )
                    target_thumb_path = upload_image_to_minio(
                        cropped_frame, event_type, camera_name, dir_name="target"
                    )
                    plate_thumb_path = upload_image_to_minio(
                        plate_img, event_type, camera_name, dir_name="plate"
                    )
                    if full_thumb_path is None or target_thumb_path is None or plate_thumb_path is None:
                        logger.error(
                            f"Error uploading image to minio for {event_type} {camera_name}"
                        )
                        continue
                    trigger_reid(
                        cropped_images=[cropped_frame],
                        annotated_frames=[full_frame],
                        metadatas=[
                            {
                                "lpr": lpr,
                                "timestamp": timestamp,
                                "tracker_id": str(obj_id),
                                "camera_id": camera_id,
                                "service_name": event_type,
                                "is_lost": is_lost,
                                "attribute": attribute,
                            }
                        ],
                        stop_event=stop_event,
                        producer=producer,
                        time_limit=0,
                    )
                    event_item = insert_db_event_item(
                        db,
                        event_type,
                        camera_name,
                        camera_id,
                        area_id,
                        area_name,
                        timestamp,
                        timestamp,
                        full_thumb_path,
                        target_thumb_path,
                        data={
                            "plate_thumb_path": plate_thumb_path,
                            "target_label": lpr,
                            "attribute": attribute,
                        },
                    )
            if event_item is None:
                return

        elif event_type == "vehicle_counting":
            full_thumb_path = upload_image_to_minio(
                annotated_frame, event_type, camera_name, dir_name="full"
            )
            
            target_in = []
            target_out = []

            for obj_id, crossed_in_data in service_params["crossed_in_all"].items():
                target_thumb_path = upload_image_to_minio(
                    crossed_in_data["annotated_frame"],
                    event_type,
                    camera_name,
                    dir_name="target",
                )

                class_name = crossed_in_data["class_name"]
                target_in.append(
                    {
                        "thumb_path": target_thumb_path,
                        "class_name": class_name,
                        "timestamp": crossed_in_data["timestamp"],
                    }
                )

            for obj_id, crossed_out_data in service_params["crossed_out_all"].items():
                target_thumb_path = upload_image_to_minio(
                    crossed_out_data["annotated_frame"],
                    event_type,
                    camera_name,
                    dir_name="target",
                )
                class_name = crossed_out_data["class_name"]
                target_out.append(
                    {
                        "thumb_path": target_thumb_path,
                        "class_name": class_name,
                        "timestamp": crossed_out_data["timestamp"],
                    }
                )

            start_time = service_params["start_time"]
            end_time = service_params["end_time"]
            event_item = insert_db_event_item(
                db,
                event_type,
                camera_name,
                camera_id,
                area_id,
                area_name,
                start_time,
                end_time,
                full_thumb_path,
                full_thumb_path,
                data={
                    "line_name": service_params["line_name"],
                    "counted_in": len(service_params["crossed_in_all"]),
                    "counted_out": len(service_params["crossed_out_all"]),
                    "metadata": {
                        "_in": target_in,
                        "_out": target_out,
                    },
                },
            )

            if event_item is None:
                return
        elif event_type == "crowd_detection":
            full_thumb_path = upload_image_to_minio(
                annotated_frame, event_type, camera_name, dir_name="full"
            )

            start_time = service_params["start_time"]
            end_time = service_params["end_time"]
            crowd_count = service_params["crowd_count"]
            event_item = insert_db_event_item(
                db,
                event_type,
                camera_name,
                camera_id,
                area_id,
                area_name,
                start_time,
                end_time,
                full_thumb_path,
                full_thumb_path,
                data={
                    "crowd_count": crowd_count,
                },
            )
        if event_item:
            logger.info(
                f"Success trigger: {event_type} for camera {camera_name}, EID={event_id}"
            )
        elif event_type == "speed_estimate":
            full_thumb_path = None
            speed_data = service_params["speed_data"]
            for data in speed_data:
                target_thumb_path = upload_image_to_minio(
                    data.pop("frame"), event_type, camera_name, dir_name="full"
                )
                data["target_thumb_path"] = target_thumb_path
            start_time = service_params["start_time"]
            end_time = service_params["end_time"]
            event_item = insert_db_event_item(
                db,
                event_type,
                camera_name,
                camera_id,
                area_id,
                area_name,
                start_time,
                end_time,
                full_thumb_path,
                full_thumb_path,
                data={
                    "speed_data": speed_data,
                },
            )
        elif event_type == "traffic_light":
            full_thumb_path = upload_image_to_minio(
                annotated_frame, event_type, camera_name, dir_name="full"
            )
            target_frame = service_params["target_frame"]
            target_thumb_path = upload_image_to_minio(
                target_frame, event_type, camera_name, dir_name="target"
            )
            event_item = insert_db_event_item(
                db,
                event_type,
                camera_name,
                camera_id,
                area_id,
                area_name,
                current_time,
                current_time,
                full_thumb_path,
                target_thumb_path,
                data={},
            )
        elif event_type == "wrong_direction":
            full_thumb_path = upload_image_to_minio(
                annotated_frame, event_type, camera_name, dir_name="full"
            )
            timestamp = service_params["timestamp"]
            event_item = insert_db_event_item(
                db,
                event_type,
                camera_name,
                camera_id,
                area_id,
                area_name,
                timestamp,
                timestamp,
                full_thumb_path,
                full_thumb_path,
                data={},
            )
        if event_item:
            logger.info(
                f"Success trigger: {event_type} for camera {camera_name}"
            )

        wait_for_stop_event(stop_event, time_limit)
    except cv2.error as e:
        pass
    except Exception as e:
        import rich
        rich.console.Console().print_exception()
        logger.error(f"Error in event_trigger: {e} {event_type} {camera_name}")
        sleep(2)


def trigger_reid(
    cropped_images,
    annotated_frames,
    metadatas,
    stop_event,
    producer,
    time_limit=15,
):
    try:
        for cropped_image, metadata, annotated_frame in zip(
            cropped_images, metadatas, annotated_frames
        ):
            cropped_frame_bytes = cv2.imencode(
                ".jpg", cropped_image, [int(cv2.IMWRITE_JPEG_QUALITY), 100]
            )[1].tobytes()
            annotated_frame_bytes = cv2.imencode(
                ".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70]
            )[1].tobytes()
            metadata["cropped_frame"] = cropped_frame_bytes
            buffer = serialize_data(annotated_frame_bytes, metadata)
            # size = len(buffer) / 1024 / 1024
            # print(size)
            pub_kafka(producer, "reid", None, buffer)
        wait_for_stop_event(stop_event, time_limit)

    except Exception as e:
        import rich
        rich.console.Console().print_exception()
        sleep(2)


def upload_image_to_minio(annotated_frame, event_type, camera_name, dir_name=None):
    return upload_base64_image_to_minio(
        img_to_base64(annotated_frame),
        event_type,
        camera_name,
        dir_name=dir_name,
    )

import requests
def insert_db_event_item(
    db,
    event_type,
    camera_name,
    camera_id,
    area_id,
    area_name,
    start_time,
    end_time,
    full_thumb_path,
    target_thumb_path,
    data,
):

    item_data = {
        "event_type": event_type,
        "camera_id": camera_id,
        "camera_name": camera_name,
        "area_id": area_id,
        "area_name": area_name,
        "start_time": start_time,
        "end_time": end_time,
        "full_thumbnail_path": full_thumb_path,
        "target_thumbnail_path": target_thumb_path,
        "is_reviewed": False,
        "data": data,
    }
    # request api events/create
    data = clean_message_producer(item_data)
    response = requests.post(
        f"http://{API_HOST}:{API_PORT}/api/events/create",
        headers={"Content-Type": "application/json"},
        data=json.dumps(data),
    )
    if response.status_code != 200:
        logger.error(f"Error in insert_db_event_item: {response.text}")
        print(data)
        return None
    item_data = response.json()
    # new_event = db["event"].insert_one(item_data)
    # asyncio.run(send_ws(item_data))
    return item_data


async def send_ws(event_item):
    data = clean_message_producer(event_item)
    try:
        async with websockets.connect(WS_ENDPOINT) as websocket:
            await websocket.send(json.dumps(data))
    except Exception as e:
        logger.error(f"Error in send_ws: {e}")


def wait_for_stop_event(stop_event, time_limit):
    for _ in range(time_limit):
        if stop_event and stop_event.is_set():
            break
        sleep(1)
