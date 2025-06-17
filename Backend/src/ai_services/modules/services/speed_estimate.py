from utils.functions import event_trigger
import threading
import time
import cv2
import numpy as np
from config import REDIS_HOST, REDIS_PORT
from utils.draw import DrawerObject
import redis
import supervision as sv
from modules.kafka import publish_image_to_kafka
from collections import defaultdict, deque

coordinates = defaultdict(lambda: deque(maxlen=10))
speed_buffer = defaultdict(
    lambda: {
        "speed": [],
        "timestamp": [],
        "frame": None,
        "max_at_timestamp": 0,
        "max_speed": -1,
    }
)

id_trigger = set()
start_time = time.time()


def handle_speed_estimate(
    kafka_topic,
    frame,
    detections,
    camera_info,
    service_info,
    view_transformer,
    vga_drawer,
    org_drawer,
    kafka_producer,
    trigger_thread,
    stop_event,
    ikey,
    timestamp,
    redis_client,
    db,

):
    global coordinates, speed_buffer, id_trigger, start_time
    if vga_drawer.zone_bottom_center and vga_drawer.zone_annotator:
        zone_bottom_center = vga_drawer.zone_bottom_center[0]
        zone_annotator = vga_drawer.zone_annotator[0]
        if detections.tracker_id is None or len(detections.tracker_id) == 0:
            return
        trigger_V_frame(
            detections,
            frame,
            timestamp,
            zone_bottom_center,
            vga_drawer,
            view_transformer,
        )

    if id_trigger and not trigger_thread[0].is_alive():
        speed_data = []
        for track_id in id_trigger:
            data = speed_buffer.pop(track_id)
            data["avg_speed"] = (
                sum(data["speed"]) / len(data["speed"]) if data["speed"] else 0
            )
            speed_data.append(data)
            coordinates.pop(track_id, None)
        id_trigger.clear()
        trigger_thread[0] = threading.Thread(
            target=event_trigger,
            args=(
                camera_info,
                "speed_estimate",
                frame,
                stop_event,
                kafka_producer,
                db,
                60*5,
                None,
                {
                    "speed_data": speed_data,
                    "start_time": start_time,
                    "end_time": time.time(),
                },
            ),
        )
        trigger_thread[0].start()
        start_time = time.time()
    # publish_image_to_kafka(
    #     producer=kafka_producer,
    #     topic=f"speed_estimate.{kafka_topic}",
    #     img=annotated_frame,
    # )


def trigger_V_frame(
    detections, frame, current_time, polygon_zone, drawer, view_transformer
):

    global coordinates, id_trigger, speed_buffer
    detections = detections[polygon_zone.trigger(detections)]
    points = detections.get_anchors_coordinates(anchor=sv.Position.BOTTOM_CENTER)
    points = view_transformer.transform_points(points=points).astype(int)
    if detections.tracker_id is None or len(detections.tracker_id) == 0:
        return
    for tracker_id, [_, y] in zip(detections.tracker_id, points):
        coordinates[tracker_id].append(
            (current_time, y)
        )  # current_time là thời gian đọc của đầu ghi cho frame đó
    speed = []
    for idx, tracker_id in enumerate(detections.tracker_id):
        if len(coordinates[tracker_id]) < 2:
            continue
        else:
            # Lấy vị trí đầu và cuối trong buffer
            (t0, y0), (t1, y1) = coordinates[tracker_id][0], coordinates[tracker_id][-1]
            distance = abs(y1 - y0)
            time_span = t1 - t0 if t1 > t0 else 1e-6  # Tránh chia cho 0

            # Tính vận tốc (px/s) -> đổi sang km/h
            speed = (distance / time_span) * 3.6

            speed_buffer[tracker_id]["speed"].append(speed)
            speed_buffer[tracker_id]["timestamp"].append(current_time)
            if speed_buffer[tracker_id]["max_speed"] < speed:
                speed_buffer[tracker_id]["max_speed"] = speed
                speed_buffer[tracker_id]["max_at_timestamp"] = current_time
                annotated_frame = drawer.box_annotator.annotate(
                    scene=frame, detections=detections[idx]
                )
                speed_buffer[tracker_id]["frame"] = annotated_frame
            if time.time() - speed_buffer[tracker_id]["timestamp"][-1] > 10:
                id_trigger.add(tracker_id)
