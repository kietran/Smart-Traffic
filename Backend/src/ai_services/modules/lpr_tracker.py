import asyncio
import queue
import aiohttp
import cv2
import numpy as np
import re
import time
from collections import defaultdict, Counter
from scipy.spatial import distance
from utils.logger import logger
from utils.grpc.gprc_client import gRPCClient
from config import LPR_HOST, LPR_PORT, LPR_GRPC_PORT, REDIS_HOST, REDIS_PORT
import multiprocessing
import supervision as sv
import os
import contextlib
from utils.common import base64_to_cv2_image
from utils.lpr.api import process_license_plate, process_license_plate_batch
from utils.common import get_full_hd_image
from utils.draw import CustomLabelAnnotator
from utils.draw import get_box_annotator
import redis


@contextlib.contextmanager
def suppress_opencv_stderr():
    devnull = os.open(os.devnull, os.O_WRONLY)
    old_stderr_fd = os.dup(2)
    os.dup2(devnull, 2)
    try:
        yield
    finally:
        os.dup2(old_stderr_fd, 2)


def safe_video_capture(rtsp_url):
    with suppress_opencv_stderr():
        try:
            cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        except Exception:
            cap = None
    return cap


class LPRTracker(multiprocessing.Process):
    def __init__(
        self,
        
        interval_track=10,
        iterval_summary=1,
        iterval_lpr_update=1,
        use_grpc=False,
    ):
        super(LPRTracker, self).__init__()
        self.interval_track = interval_track
        self.iterval_summary = iterval_summary
        self.iterval_lpr_update = iterval_lpr_update
        self.triggered_ids = {}
        self.triggered_lpr = {}
        self.box_annotator = get_box_annotator()
        self.label_annotator = CustomLabelAnnotator(
            color=sv.Color(r=105, g=105, b=104),
            text_position=sv.Position.TOP_RIGHT,
            text_scale=0.4,
        )


        self.vehicle_buffer = defaultdict(default_vehicle_buffer)
        self.vehicle_position_tracker = defaultdict(default_vehicle_position_tracker)
        self.vehicle_tracked = defaultdict(default_vehicle_tracked)
        self.summary_lpr = defaultdict(dict)
        self.vehicle_summary_attribute = defaultdict(default_vehicle_summary_attribute)
        self.violation_ids = defaultdict(dict)
        self.use_grpc = use_grpc
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        self.img_queue = multiprocessing.Queue(maxsize=20)
        self.input_queue = multiprocessing.Queue(maxsize=20)
        self.event_trigger_data = multiprocessing.Queue()
        self.summary_objects = multiprocessing.Manager().dict()       
        self.is_running = True
        self.distance_threshold_track = 200
        self.idle_start = 3
        self.idle_loop = 5
        self.vehicle_lost_timeout = 5
        self.lpr_batch_size = 4


    def run(self):
        self.grpc_client = (
            gRPCClient(LPR_HOST, LPR_GRPC_PORT) if self.use_grpc else None
        )
        self.redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

        asyncio.run(self.loop())


    async def loop(self):
        async with aiohttp.ClientSession() as session:
            self.session = session
            while True:
                try:
                    detections, ikey, timestamp = self.input_queue.get(timeout=1)
                    frame_full, full_bbox, is_org = get_full_hd_image(
                        self.redis_client, detections, None, ikey
                    )
          
                    if (
                        detections.tracker_id is None
                        or detections.xyxy is None
                        or not is_org
                    ):
                        continue
                    await self._update_track_dict(detections, frame_full, full_bbox, timestamp)
                    await asyncio.sleep(0.02)
                except queue.Empty:
                    continue
                except TimeoutError:
                    self._handle_lost_objects(set())
                except Exception as e:
                    import rich

                    rich.console.Console().print_exception()
                    logger.error(f"Error in loop: {e}")
                    continue

    async def _update_track_dict(self, detections, frame_full, full_bbox, timestamp):
        tasks = []
        for idx, (obj_id, bbox) in enumerate(
            zip(detections.tracker_id, full_bbox)
        ):
            obj_id = int(obj_id)
            if obj_id not in self.triggered_ids:

                self.vehicle_tracked[obj_id]
                detection = detections[idx]
                detection.xyxy = np.array([bbox], dtype=np.float32)
                await self._process_object(obj_id, frame_full, detection, timestamp)

                if obj_id in self.vehicle_buffer:
                    tasks.append(self._check_and_update_lpr(obj_id))
                    tasks.append(self._check_and_summary(obj_id))

        if tasks:
            await asyncio.gather(*tasks)

        self._handle_lost_objects(set(detections.tracker_id))
        del frame_full
        return self.vehicle_tracked

    async def _check_and_summary(self, obj_id):
        if (
            time.time() - self.vehicle_tracked[obj_id]["summary_start"]
            > self.iterval_summary
        ):
            self.update_summary_trigger(obj_id)

    async def _check_and_update_lpr(self, obj_id):
        if obj_id not in self.triggered_ids:
            if (
                time.time() - self.vehicle_tracked[obj_id]["lpr_start"]
                > self.iterval_lpr_update
            ):
                await self.trigger_update_lpr(obj_id=obj_id)

    async def trigger_update_lpr(self, obj_id):
        import math

        self.vehicle_tracked[obj_id]["lpr_start"] = time.time()
        if obj_id in self.vehicle_buffer:
            buffer = self.vehicle_buffer[obj_id]
            step = math.ceil(len(buffer["cropped_frame"]) / self.lpr_batch_size)
            indices = []
            buffer_frames = []
            try:
                index = len(buffer["license_plate"])
                if buffer["license_plate"]:
                    if None not in buffer["license_plate"]:
                        self.update_summary_trigger(obj_id)
                        if len(buffer["license_plate"]) > 6:
                            self.add_event_trigger(obj_id, False)
                    else:
                        index = buffer["license_plate"].index(None)
                    for idx in range(index, len(buffer["cropped_frame"]), step):
                        if buffer["cropped_frame"][idx] is None:
                            continue
                        buffer_frames.append(buffer["cropped_frame"][idx])
                        indices.append(idx)
                        buffer["cropped_frame"][idx] = None

                if buffer_frames:
                    if self.grpc_client is not None:
                        results = self.grpc_client.send_batch(buffer_frames)
                        if results is None:
                            logger.warning("gRPC response is None")
                            return
                        for idx, license_number, plate, color, logo in zip(
                            indices, results.license_number, results.plate, results.color, results.logo
                        ):
                            if not plate:
                                continue
                            plate_img = base64_to_cv2_image(plate)
                            if idx < len(buffer["license_plate"]):
                                buffer["license_plate"][idx] = license_number
                                buffer["plate_img"][idx] = plate_img
                                buffer["v_color"][idx] = color
                                buffer["logo"][idx] = logo
                    else:
                        results = await process_license_plate_batch(
                            buffer_frames, self.session
                        )
                        
                        if results is None:
                            logger.warning("process_license_plate_batch response is None")
                            return
                        for idx, result in zip(
                            indices, results
                        ):
                            license_number = result["license_number"]
                            color = result["color"]
                            if not result['plate']:
                                continue
                            plate_img = base64_to_cv2_image(result['plate'])
                            if idx < len(buffer["license_plate"]):
                                buffer["license_plate"][idx] = license_number
                                buffer["plate_img"][idx] = plate_img
                                buffer["v_color"][idx] = color
                                buffer["logo"][idx] = ""
                    self.update_summary_trigger(obj_id)

            except Exception as e:
                import rich

                rich.console.Console().print_exception()
                logger.error(f"Error in trigger_update_lpr: {e}")

    async def _process_object(self, obj_id, frame_full, detection, timestamp):
        full_bbox = list(map(int, detection.xyxy[0]))
        center_points = (full_bbox[0] + full_bbox[2]) / 2, (
            full_bbox[1] + full_bbox[3]
        ) / 2
        is_trigger = self.trigger_tracking(obj_id, *center_points)
        cropped_frame = frame_full[
            full_bbox[1] : full_bbox[3], full_bbox[0] : full_bbox[2]
        ]
        class_name = detection.data["class_name"][0]
        if is_trigger:
            if obj_id not in self.summary_lpr:
                self.vehicle_tracked[obj_id]["present_start"] = time.time()
                start_1 = time.perf_counter()
                logo = None
                if self.grpc_client is not None:
                    try:
                        response = self.grpc_client.send_one(cropped_frame)
                        if response is None:
                            logger.warning("gRPC response is None")
                            return
                        license_plate = response.license_number
                        v_color = response.color
                        logo = response.logo
                        if not response.plate:
                            logger.warning(f"gRPC response plate is None {license_plate} {v_color} { logo}")
                            return
                        
                        plate_img = base64_to_cv2_image(response.plate)
                    except Exception as e:
                        logger.error(f"An unexpected error occurred: {e}")
                        return
                else:
                    license_plate, plate_img, v_color = await process_license_plate(
                        cropped_frame, self.session
                    )
                if not license_plate or len(license_plate) < 3:
                    return
                else:
                    self._update_buffer(    
                        obj_id,
                        timestamp,
                        detection,
                        frame_full,
                        cropped_frame,
                        class_name=class_name,
                        license_plate=license_plate,
                        plate_img=plate_img,
                        v_color=v_color,
                        logo=logo,
                    )
                    self.update_summary_trigger(obj_id)

            else:
                self._update_buffer(
                    obj_id,
                    timestamp,
                    detection,
                    frame_full,
                    cropped_frame,
                    class_name=class_name,
                )
        else:
            self.vehicle_tracked[obj_id]["present_start"] = time.time()
        if (
            time.time() - self.vehicle_tracked[obj_id]["present_start"]
            > self.interval_track
        ):
            self.add_event_trigger(obj_id, False)

    def update_best_lpr(self, buffer, obj_id, license_plate, is_valid):
        idx = buffer["license_plate"].index(license_plate)
        summary_lpr = {
            "license_plate": license_plate,
            "plate_img": buffer["plate_img"][idx],
            "frame": buffer["frame"][idx],
            "timestamp": buffer["timestamp"][idx],
            "cropped_frame": buffer["cropped_frame"][idx],
            "detection": buffer["detection"][idx],
            "is_valid": is_valid,
        }
        self.summary_lpr[obj_id] = summary_lpr

    def update_summary_trigger(self, obj_id):
        buffer = self.vehicle_buffer[obj_id]
        buffer["summary_start"] = time.time()
        if not buffer["license_plate"]:
            return
        lpr_buffer = buffer["license_plate"]
        if lpr_buffer:
            lpr_valid, lpr_invalid = filter_license_plate(lpr_buffer)
            final_lpr = None
            is_valid = True
            if lpr_valid:
                final_lpr = lpr_valid.most_common(1)[0][0]
            elif lpr_invalid:
                final_lpr = lpr_invalid.most_common(1)[0][0]
                is_valid = False
            else:
                return
            self.update_best_lpr(buffer, obj_id, final_lpr, is_valid)
            v_colors = buffer["v_color"]
            
            class_names = buffer["class_name"]
            self.vehicle_summary_attribute[obj_id] = {
                "v_colors": self.vehicle_summary_attribute[obj_id]["v_colors"]
                + v_colors,
                "class_names": self.vehicle_summary_attribute[obj_id]["class_names"]
                + class_names,
                "logos": self.vehicle_summary_attribute[obj_id]["logos"]
                + buffer["logo"],
            }
            cls_name = buffer["class_name"][-1]
            color_results = self.vehicle_summary_attribute[obj_id]["v_colors"]
            logo_results = self.vehicle_summary_attribute[obj_id]["logos"]
            v_color = Counter(color_results).most_common(1)[0][0]
            logo = Counter(logo_results).most_common(1)[0][0]
            self.summary_objects[obj_id] = {
                    "license_plate": final_lpr, "class_name": cls_name, "color": v_color, "logo": logo
            }
     

    def _update_buffer(
        self,
        obj_id,
        timestamp,
        detection,
        frame,
        cropped_frame,
        class_name,
        license_plate=None,
        plate_img=None,
        v_color=None,
        logo=None,
        
    ):
        buffer = self.vehicle_buffer[obj_id]
        if len(buffer["frame"]) > 20:
            return
        if len(buffer["frame"]) > 0 and len(buffer["frame"]) % 20 != 0:
            buffer["frame"].append(buffer["frame"][-1])
            buffer["detection"].append(buffer["detection"][-1])
            buffer["timestamp"].append(buffer["timestamp"][-1])
        else:
            buffer["frame"].append(frame)
            buffer["detection"].append(detection)
            buffer["timestamp"].append(timestamp)

        buffer["cropped_frame"].append(cropped_frame)
        buffer["license_plate"].append(license_plate)
        buffer["plate_img"].append(plate_img)
        buffer["v_color"].append(v_color)
        buffer["logo"].append(logo)
        buffer["class_name"].append(class_name)

    def _handle_lost_objects(self, active_object_ids):
        for obj_id in (
            set(self.vehicle_tracked)
            - active_object_ids
            - set(self.triggered_ids.keys())
        ):
            asyncio.create_task(self._check_and_summary(obj_id))
            if (
                time.time() - self.vehicle_tracked[obj_id]["present_start"]
                > self.interval_track
            ):
                self.add_event_trigger(obj_id, True)
        to_delete = [
            obj_id
            for obj_id, last_time in self.triggered_ids.items()
            if time.time() - last_time > self.vehicle_lost_timeout
        ]
        for obj_id in to_delete:
            self.delete_data(obj_id)

    def delete_data(self, obj_id, remove_summary=True):
        self.vehicle_buffer.pop(obj_id, None)
        self.vehicle_tracked.pop(obj_id, None)
        self.summary_lpr.pop(obj_id, None)
        self.vehicle_summary_attribute.pop(obj_id, None)
        if remove_summary:
            self.triggered_ids.pop(obj_id, None)
            self.triggered_lpr.pop(obj_id, None)
            self.summary_objects.pop(obj_id, None)

    def add_event_trigger(self, obj_id, is_lost):
        if obj_id not in self.summary_lpr:
            if is_lost:
                self.delete_data(obj_id, remove_summary=True)
            else:
                self.delete_data(obj_id, remove_summary=False)
            return
            
        summary_lpr = self.summary_lpr[obj_id]
        if summary_lpr["is_valid"] == False:
            if is_lost:
                self.delete_data(obj_id, remove_summary=True)
            else:
                self.delete_data(obj_id, remove_summary=False)
            return

        color_results = self.vehicle_summary_attribute[obj_id]["v_colors"]
        logo_results = self.vehicle_summary_attribute[obj_id]["logos"]
        color_results = [x for x in color_results if x is not None]
        class_name_results = self.vehicle_summary_attribute[obj_id]["class_names"]
        license_plate = summary_lpr["license_plate"]

        if license_plate in self.triggered_lpr.values():
            self.triggered_lpr[obj_id] = license_plate
            self.triggered_ids[obj_id] = time.time()
            self.delete_data(obj_id, remove_summary=False)
            return

        v_color = Counter(color_results).most_common(1)[0][0]
        logo = Counter(logo_results).most_common(1)[0][0]
        class_name = Counter(class_name_results).most_common(1)[0][0]

        plate_img = summary_lpr["plate_img"]

        label = f"{license_plate}\n" f"{class_name}\n" 
        frame = summary_lpr["frame"]
        detection = summary_lpr["detection"]
        annotated_frame = frame.copy()

        self.label_annotator.annotate(annotated_frame, detection, [label])
        self.box_annotator.annotate(annotated_frame, detection)
        timestamp = summary_lpr["timestamp"]
        cropped_frame = summary_lpr["cropped_frame"]
        
        self.event_trigger_data.put_nowait(
            {
                "obj_id": obj_id,
                "cropped_frame": cropped_frame,
                "is_lost": is_lost,
                "annotated_frame": annotated_frame,
                "plate_img": plate_img,
                "license_plate": license_plate,
                "timestamp": timestamp,
                "attribute": {
                    "v_color": v_color,
                    "logo": logo,
                    "class_name": class_name,
                }
            }
        )
        self.triggered_lpr[obj_id] = license_plate
        self.triggered_ids[obj_id] = time.time()
        self.delete_data(obj_id, remove_summary=False)

    def trigger_tracking(self, obj_id, x, y):

        prev_fixed_point = self.vehicle_position_tracker[obj_id]["prev_fixed_point"]
        if prev_fixed_point is None:
            prev_fixed_point = np.array([x, y])
            self.vehicle_position_tracker[obj_id]["prev_fixed_point"] = prev_fixed_point
            self.vehicle_position_tracker[obj_id]["idle_start"] = time.time()
        else:
            distance_fixed = distance.euclidean([x, y], prev_fixed_point)
            self.vehicle_position_tracker[obj_id]["prev_fixed_point"] = prev_fixed_point

            if distance_fixed > self.distance_threshold_track:
                prev_fixed_point = np.array([x, y])
                self.vehicle_position_tracker[obj_id][
                    "prev_fixed_point"
                ] = prev_fixed_point
                self.vehicle_position_tracker[obj_id]["idle_start"] = time.time()
            elif (
                time.time() - self.vehicle_position_tracker[obj_id]["idle_start"]
                > self.idle_start
            ):
                if (
                    time.time() - self.vehicle_position_tracker[obj_id]["idle_loop"]
                    > self.idle_loop
                ):
                    self.vehicle_position_tracker[obj_id]["idle_loop"] = time.time()
                    return True
                return False
        self.vehicle_position_tracker[obj_id]["idle_loop"] = time.time()
        return True


def filter_license_plate(lpr_buffer):
    pattern = r"^[1-9][0-9][A-Z][A-Z0-9]\d{3}\d{0,3}$"
    invalid_lpr = []
    valid_lpr = []
    for lpr in lpr_buffer:
        if lpr:
            if re.match(pattern, lpr):
                valid_lpr.append(lpr)
            else:
                invalid_lpr.append(lpr)
    valid_lpr = Counter(valid_lpr)
    invalid_lpr = Counter(invalid_lpr)
    return valid_lpr, invalid_lpr


def default_vehicle_buffer():
    return {
        "license_plate": [],
        "plate_img": [],
        "frame": [],
        "cropped_frame": [],
        "v_color": [],
        "logo": [],
        "class_name": [],
        "detection": [],
        "timestamp": [],
    }


def default_vehicle_summary_attribute():
    return {
        "v_colors": [],
        "logos": [],
        "class_names": [],
    }


def default_vehicle_position_tracker():
    return {
        "prev_fixed_point": None,
        "idle_start": time.time(),
        "idle_loop": time.time(),
    }


def default_vehicle_tracked(iterval_lpr_update=1):
    return {
        "present_start": time.time(),
        "summary_start": time.time(),
        "lpr_start": time.time() - iterval_lpr_update,
    }


