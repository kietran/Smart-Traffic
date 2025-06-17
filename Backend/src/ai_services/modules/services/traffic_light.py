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


caution = 0


def handle_traffic_light(
    kafka_topic,
    frame,
    detections,
    camera_info,
    service_info,
    tracker,
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
    global caution

    annotation_frame = frame.copy()
    line_zone_1, line_zone_2, light_bb = None, None, None

    for line_annotator, line in zip(vga_drawer.line_annotator, vga_drawer.line):
        if line.name == "SOURCE_TL_1":
            line_zone_1 = line
            annotation_frame = line_annotator.annotate(annotation_frame, line)
        if line.name == "SOURCE_TL_2":
            line_zone_2 = line
            annotation_frame = line_annotator.annotate(annotation_frame, line)
    for zone_annotator, zone_center in zip(
        vga_drawer.zone_annotator, vga_drawer.zone_center
    ):
        if zone_center.name == "TRAFFIC_LIGHT":
            bbox = zone_center.polygon
            x_min = int(np.min(bbox[:, 0]))
            x_max = int(np.max(bbox[:, 0]))
            y_min = int(np.min(bbox[:, 1]))
            y_max = int(np.max(bbox[:, 1]))

            bbox = [x_min, y_min, x_max, y_max]
            light_bb = frame[y_min:y_max, x_min:x_max]
            annotation_frame = zone_annotator.annotate(annotation_frame)
    if (line_zone_1 is None and line_zone_2 is None) or light_bb is None:
        return
    if line_zone_1 is None:
        line_zone_1 = line_zone_2
    elif line_zone_2 is None:
        line_zone_2 = line_zone_1

    annotation_frame, cropped_vehicle, track_id, caution = trigger_light_frame(
        frame, light_bb, detections, vga_drawer, line_zone_1, line_zone_2, caution
    )
    if annotation_frame is not None and not trigger_thread[0].is_alive():
        trigger_thread[0] = threading.Thread(
            target=event_trigger,
            args=(
                camera_info,
                "traffic_light",
                annotation_frame,
                stop_event,
                kafka_producer,
                db,
                0,
                None,
                {"caution": caution, "target_frame": cropped_vehicle},
            ),
        )
        trigger_thread[0].start()

    # publish_image_to_kafka(
    #     producer=kafka_producer,
    #     topic=f"speed_estimate.{kafka_topic}",
    #     img=annotated_frame,
    # )


def trigger_light_frame(
    frame, light_bb, detections, drawer, line_zone_1, line_zone_2, caution
):
    crossed_in_1, _ = line_zone_1.trigger(detections)
    crossed_in_2, _ = line_zone_2.trigger(detections)

    if detect_color_light(light_bb):
        caution += 1
    else:
        caution = 0

    crossed_in_detections_1 = detections[crossed_in_1]
    crossed_in_ids_1 = detections.tracker_id[crossed_in_1]

    crossed_in_detections_2 = detections[crossed_in_2]
    crossed_in_ids_2 = detections.tracker_id[crossed_in_2]

    crossed = [crossed_in_detections_1, crossed_in_detections_2]
    ids = [crossed_in_ids_1, crossed_in_ids_2]
    if caution >= 60:
        for crossed_in_detections, crossed_in_ids in zip(crossed, ids):
            for idx, (xyxy, track_id) in enumerate(
                zip(crossed_in_detections.xyxy, crossed_in_ids)
            ):
                x1, y1, x2, y2 = map(int, xyxy)
                annotated_frame = drawer.box_annotator.annotate(
                    scene=frame, detections=crossed_in_detections[idx]
                )
                cropped_vehicle = frame[y1:y2, x1:x2]
                if cropped_vehicle.size > 0:
                    return annotated_frame, cropped_vehicle, track_id, caution
    return None, None, None, caution


def detect_color_light(crop):
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    # Define HSV range for red color
    lower_red1 = np.array([0, 70, 50])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 70, 50])
    upper_red2 = np.array([180, 255, 255])

    # Mask for red color
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)

    # Check if red is detected
    return np.any(red_mask > 0)
