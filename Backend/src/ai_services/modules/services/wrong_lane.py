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

from collections import defaultdict
from collections import Counter


buffer_frams = defaultdict(
    lambda: {
        "frame": [],
        "timestamp": [],
        "class_name": [],
    }
)

def handle_wrong_lane(
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
    global buffer_frams
    if detections.data.get("class_name", None) is None:
        return
    annotated_frame = frame.copy()
    mask = detections.data["class_name"].isin(service_info["no_allow"])
    detections = detections[mask]
    if len(detections) != 0:

        for idx, (tracker_id, class_name) in enumerate(
            zip(detections.tracker_id, detections.data["class_name"])
        ):
            if len(buffer_frams[tracker_id]) > 10:
                continue
            violation_frame = vga_drawer.box_annotator.annotate(
                scene=annotated_frame, detections=detections[idx]
            )
            buffer_frams[tracker_id]["frame"].append(violation_frame)
            buffer_frams[tracker_id]["timestamp"].append(timestamp)
            buffer_frams[tracker_id]["class_name"].append(class_name)
        for tracker_id in buffer_frams.keys():
            if buffer_frams[tracker_id]["timestamp"][0] + 5 < timestamp:
                if len(buffer_frams[tracker_id]["frame"]) > 2:
                    violation_data = buffer_frams.pop(tracker_id, None)
                    if violation_data is not None:
                        filtered_class_name = [
                            cls
                            for cls in violation_data["class_name"]
                            if cls is not None
                        ]
                        violation_class_name = Counter(filtered_class_name).most_common(
                            1
                        )[0][0]
                        if violation_class_name not in service_info["no_allow"]:
                            continue
                        idx = len(violation_data["timestamp"]) // 2
                        violation_frame = violation_data["frame"][idx]
                        violation_timestamp = violation_data["timestamp"][idx]
                        event_trigger(
                            camera_info,
                            "wrong_lane",
                            annotated_frame,
                            None,
                            kafka_producer,
                            db,
                            15,
                            None,
                            {
                                "violation_frame": violation_frame,
                                "timestamp": violation_timestamp,
                                "class_name": violation_class_name,
                            },
                        )
