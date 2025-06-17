from utils.functions import event_trigger
from modules.kafka import publish_image_to_kafka
import threading
import time
import redis
import cv2
import numpy as np
from collections import defaultdict

count_start_time = time.time()
crossed_in_all = defaultdict(lambda: defaultdict(dict))
crossed_out_all = defaultdict(lambda: defaultdict(dict))

wrong_direction_buffer = dict()

def handle_vehicle_counting(
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
    global count_start_time, crossed_in_all, crossed_out_all, wrong_direction_buffer
    if vga_drawer:
        annotated_frame = vga_drawer.box_annotator.annotate(
            scene=frame, detections=detections
        )
    else:
        annotated_frame = frame
    for line_annotator, line in zip(vga_drawer.line_annotator, vga_drawer.line):

        crossed_in, crossed_out = line.trigger(detections)
        # line_annotated_frame = line_annotator.annotate(annotated_frame, line)
        line_name = line.name
        if detections.tracker_id is None:
            break
        for idx, (obj_id, is_crossed) in enumerate(
            zip(detections.tracker_id, crossed_in)
        ):
            if is_crossed:
                crossed_in_all[line_name][obj_id] = {
                    "obj_id": obj_id,
                    "timestamp": time.time(),
                    "direction": "in",
                    "annotated_frame": annotated_frame,
                    "class_name": (
                        detections.data["class_name"][idx]
                        if "class_name" in detections.data
                        else None
                    ),
                }
           
        for idx, (obj_id, is_crossed) in enumerate(
            zip(detections.tracker_id, crossed_out)
        ):
            if is_crossed:
                
                crossed_out_all[line_name][obj_id] = {
                    "obj_id": obj_id,
                    "timestamp": timestamp,
                    "start_time": time.time(),
                    "direction": "out",
                    "annotated_frame": annotated_frame,
                    "class_name": (
                        detections.data["class_name"][idx]
                        if "class_name" in detections.data
                        else None
                    ),
                }
                violation_frame = vga_drawer.box_annotator_violation.annotate(
                    scene=annotated_frame,
                    detections=detections[idx],
                )
                wrong_direction_buffer[obj_id] = {
                    "violation_frame": violation_frame,
                    "start_time": time.time(),
                    "timestamp": timestamp,
                    "buffer": []
                }
               
            
        if (crossed_in_all or crossed_out_all) and not trigger_thread[0].is_alive():
            trigger_thread[0] = threading.Thread(
                target=event_trigger,
                args=(
                    camera_info,
                    "vehicle_counting",
                    annotated_frame,
                    None,
                    kafka_producer,
                    db,
                    60*2,
                    {},
                    {
                        "line_name": line_name,
                        "crossed_in_all": crossed_in_all[line_name],
                        "crossed_out_all": crossed_out_all[line_name],
                        "start_time": count_start_time,
                        "end_time": time.time(),
                    },
                ),
            )
            crossed_in_all.clear()
            crossed_out_all.clear()
            count_start_time = time.time()
            trigger_thread[0].start()
            
    tracker_violation(
        detections=detections,
        camera_info=camera_info,
        kafka_producer=kafka_producer,
        db=db,
        trigger_thread=trigger_thread[1],
    )
        
    # publish_image_to_kafka(
    #     producer=kafka_producer,
    #     topic=f"vehicle_counting.{kafka_topic}",
    #     img=annotated_frame,
    # )


def tracker_violation(detections, camera_info, kafka_producer, db, trigger_thread):
    global wrong_direction_buffer
    try:
        tracker_id = set(wrong_direction_buffer.keys())
        if detections.tracker_id is None:
            raise ValueError("No tracker_id found in detections")
        
        vio_mask = np.atleast_1d(np.isin(detections.tracker_id, list(tracker_id)))
        vio_detections = detections[vio_mask]
        to_delete = []
        for buff_obj_id, data in wrong_direction_buffer.items():
            if time.time() - data["start_time"] > 5:
                to_delete.append(buff_obj_id)
                if len(data["buffer"]) < 2:
                    continue
                y_center_points = data["buffer"]
                d = [curr - prev for prev, curr in zip(y_center_points[:-1], y_center_points[1:])]
                total_d = sum(d)
                avg_d = total_d / len(d)
                if avg_d > 1:
                    
                    violation_timestamp = data["timestamp"]
                    violation_frame = data["violation_frame"]
                    # put text on the frame
                    cv2.putText(
                        violation_frame,
                        f"total_d: {total_d} - avg_d: {avg_d}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2,
                    )
                    
                    if not trigger_thread.is_alive():
                        trigger_thread = threading.Thread(
                            target=event_trigger,
                            args=(  
                                camera_info,    
                                "wrong_direction",
                                violation_frame,
                                None,
                                kafka_producer,
                                db,
                                0,
                                None,
                                {
                                    "timestamp": violation_timestamp,
                                }
                            ),
                        )
                        trigger_thread.start()
                        
                continue
                    
            vio_detection = vio_detections[vio_detections.tracker_id == buff_obj_id]
            if len(vio_detection) == 0:
                continue
            bbox = vio_detection.xyxy[0]
            y_center_point = int((bbox[1] + bbox[3]) / 2)
            data["buffer"].append(y_center_point)
            
        for obj_id in to_delete:
            del wrong_direction_buffer[obj_id]
            
    except ValueError as e:
        pass
    except Exception as e:
        import rich
        rich.console.Console().print_exception()