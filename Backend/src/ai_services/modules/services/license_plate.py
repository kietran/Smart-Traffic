from utils.functions import event_trigger
from modules.kafka import publish_image_to_kafka
import threading
import numpy as np
from utils.draw import DrawerObject
import supervision as sv
import queue
import cv2


def handle_license_plate(
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
    try:
        annotated_frame = frame.copy()
        annotated_frame = vga_drawer.box_annotator.annotate(
            scene=annotated_frame, detections=detections
        )
        lprs = []
        obj_ids = []
        timestamps = []
        annotated_frames = []
        plate_imgs = []
        cropped_frames = []
        is_losts = []
        class_names = []
        attributes = []
        if vga_drawer.zone_bottom_center and vga_drawer.zone_annotator:
            for zone_center, zone_annotator in zip(
                vga_drawer.zone_bottom_center, vga_drawer.zone_annotator
            ):
                detections_filtered = detections[zone_center.trigger(detections=detections)]
                # annotated_frame = zone_annotator.annotate(scene=annotated_frame)
                
                try:
                    if tracker.input_queue.full():
                        tracker.input_queue.get_nowait()
                    tracker.input_queue.put_nowait((detections_filtered, ikey, timestamp))
                except queue.Empty:
                    pass
                k=0
                while not tracker.event_trigger_data.empty():
                    k+=1
                    if k > 5:
                        break
                    event = tracker.event_trigger_data.get()
                    obj_ids.append(event["obj_id"])
                    is_losts.append(event["is_lost"])
                    lprs.append(event["license_plate"])
                    cropped_frames.append(event["cropped_frame"])
                    annotated_frames.append(event["annotated_frame"])
                    plate_imgs.append(event["plate_img"])
                    timestamps.append(event["timestamp"])
                    attributes.append(event["attribute"])
                if not trigger_thread[0].is_alive() and lprs:
                    trigger_thread[0] = threading.Thread(
                        target=event_trigger,
                        args=(
                            camera_info,
                            "license_plate",
                            annotated_frame,
                            None,
                            kafka_producer,
                            db,
                            0,
                            {
                                "cropped_frames": cropped_frames,
                                "annotated_frames": annotated_frames,
                                "plate_imgs": plate_imgs,
                            },
                            {
                                "lprs": lprs,
                                "obj_ids": obj_ids,
                                "timestamps": timestamps,
                                "is_losts": is_losts,
                                "attributes": attributes,
                            },
                        ),
                    )
                    trigger_thread[0].start()
                    
        labels = []
        if detections.tracker_id is not None:
            for cls_id, id in zip(
                detections.class_id, detections.tracker_id
            ):
                if (
                    id in tracker.summary_objects
                    and "license_plate" in tracker.summary_objects[id]
                ):
                    license_plate = tracker.summary_objects[id]["license_plate"]
                    class_name = tracker.summary_objects[id]["class_name"]
                    color = tracker.summary_objects[id]["color"]
                    logo = tracker.summary_objects[id]["logo"]
                    
                    label = f"{license_plate}\n{class_name}\n{color}\n{logo}"
                else:
                    label = f""
                labels.append(label)

            annotated_frame = tracker.label_annotator.annotate(
                annotated_frame, detections, labels
            )
        publish_image_to_kafka(
            producer=kafka_producer,
            topic=f"license_plate.{kafka_topic}",
            img=annotated_frame,
        )
    except Exception as e:
        import rich
        rich.console.Console().print_exception()