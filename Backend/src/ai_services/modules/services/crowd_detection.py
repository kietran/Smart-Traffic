import supervision as sv
from config import CROWD_MINIMUM_NUMBER, CROWD_MINIMUM_DISTANCE
from sklearn.cluster import DBSCAN
import cv2
from utils.functions import event_trigger
import threading
import numpy as np
from modules.kafka import publish_image_to_kafka
from collections import defaultdict
import time

tmp_crowd_start = 0
tmp_crowd_count = 0



def handle_crowd_detection(
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
    global tmp_crowd_count, tmp_crowd_start
    annotated_frame = frame
    if vga_drawer.zone_center and vga_drawer.zone_annotator:
        for zone_center, zone_annotator in zip(
            vga_drawer.zone_center, vga_drawer.zone_annotator
        ):
            mask = zone_center.trigger(detections=detections)
            detections = detections[mask]
            annotated_frame = zone_annotator.annotate(scene=annotated_frame)

        annotated_frame = vga_drawer.box_annotator.annotate(
            scene=annotated_frame, detections=detections
        )

    crowds = detect_crowd(detections, CROWD_MINIMUM_DISTANCE, CROWD_MINIMUM_NUMBER)
    annotated_frame = draw_crowd(annotated_frame, crowds)
    if crowds:
        if not trigger_thread[0].is_alive():
            if tmp_crowd_count == 0:
                tmp_crowd_start = time.time()
            tmp_crowd_count += 1

            if (time.time() - tmp_crowd_start) > 3 and tmp_crowd_count > 10:
                trigger_thread[0] = threading.Thread(
                    target=event_trigger,
                    args=(
                        camera_info,
                        "crowd_detection",
                        annotated_frame,
                        stop_event,
                        kafka_producer,
                        db,
                        15,
                        None,
                        {
                            "crowd_count": tmp_crowd_count,
                            "start_time": tmp_crowd_start,
                            "end_time": time.time(),
                        },
                    ),
                )
                trigger_thread[0].start()
                tmp_crowd_count = 0

    else:
        tmp_crowd_count = max(tmp_crowd_count - 1, 0)

    # publish_image_to_kafka(
    #     producer=kafka_producer,
    #     topic=f"crowd_detection.{kafka_topic}",
    #     img=annotated_frame,
    # )


def detect_crowd(result, eps=200, min_samples=5):
    # Calculate the centroids of the bounding boxes
    points = result.xyxy
    centroids = points[:, 0:2] + (points[:, 2:4] - points[:, 0:2]) / 2
    try:
        clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(centroids)
    except:
        return []
    unique_group = set(clustering.labels_)
    # Visualize the centroids and draw the line to connect centroids in the same group
    crowds = []
    for group in unique_group:
        if group == -1:
            continue
        group_mask = clustering.labels_ == group
        group_centroids = points[group_mask]
        group_centroids = group_centroids.reshape(-1, 2)
        group_centroids = group_centroids.astype(int)
        # group_centroids = group_centroids.reshape(-1, 2)

        # Calculate the minimum enclosing circle
        (x, y), radius = cv2.minEnclosingCircle(group_centroids)
        crowds.append((int(x), int(y), int(radius)))
    return crowds


def draw_crowd(frame, crowds, color="#fbdd00"):
    color = sv.Color.from_hex(color).as_bgr()
    for crowd in crowds:
        cv2.circle(frame, (crowd[0], crowd[1]), crowd[2], color, 2)
    return frame
