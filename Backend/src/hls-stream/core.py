from typing import Callable, Any
import ffmpeg
import enum
import numpy as np
import time
import os
import cv2
from logger import logger
import threading
from pathlib import Path
import json
import shutil
import asyncio
from aiokafka import AIOKafkaConsumer
import msgpack

CONFIG_GPU = {
    "vcodec": "h264_nvenc",
    "preset": "p1",  
    "tune": "ull",
    "zerolatency": 1,
    "video_bitrate": "1M",
    "maxrate": "2M",
    "bufsize": "2M",
}
def deserialize_data(packed_data):
    unpacked_data = msgpack.unpackb(packed_data, raw=False, strict_map_key=False)
    frame_bytes = unpacked_data["frame"]
    metadata = unpacked_data["metadata"]
    return frame_bytes, metadata


class HLSEncoder:
    def __init__(
        self,
        out_path: Path,
        shape: tuple[int, int] = (1080, 1920),
        input_fps: int = 30,
        use_wallclock_pts: bool = False,
        config: dict = CONFIG_GPU,
        **hls_kwargs,
    ) -> None:
        self.out_path = out_path
        self.shape = shape

        self.inp_settings = {
            "format": "rawvideo",
            "pix_fmt": "rgb24",
            "s": "{}x{}".format(shape[1], shape[0]),
            "r": input_fps,
            "use_wallclock_as_timestamps": use_wallclock_pts,
        }
        self.enc_settings = {
            "format": "hls",
            "pix_fmt": "yuv420p",
            "hls_time": 4,
            "hls_list_size": 5,
            "hls_flags": "delete_segments+independent_segments",
            "start_number": 0,
            # "vsync": "cfr",  # Constant frame rate
            "fps_mode": "cfr",
            "r": input_fps,  # Force output fps
            "g": input_fps * 2,  # GOP size (2 seconds)
            "keyint_min": input_fps,  # Minimum GOP size (1 second)
            "sc_threshold": 0,  # Disable scene change detection
            "strict": "experimental",  # Strict timing
            **config,
            **hls_kwargs,
        }
        # Compute keyframe interval for most precise segment duration
        # Note, -g (GOP) and keyint_min is necessary to get exact duration segments.
        # https://sites.google.com/site/linuxencoding/x264-ffmpeg-mapping#:~:text=%2Dg%20(FFmpeg,Recommended%20default%3A%20250
        nkey = self.enc_settings["hls_time"] * self.inp_settings["r"]
        self.enc_settings["g"] = nkey
        self.enc_settings["keyint_min"] = nkey

        self.proc: Callable[[np.ndarray[np.uint8, Any]]] = None
        self.time: float = 0.0

    def __enter__(self) -> "HLSEncoder":
        self.time = 0.0
        self.proc = (
            ffmpeg.input("pipe:", **self.inp_settings)
            .output(str(self.out_path), **self.enc_settings, loglevel="info")
            .overwrite_output()
            .run_async(pipe_stdin=True)
        )
        return self

    def __exit__(self, type, value, traceback):
        self.proc.stdin.close()
        self.proc = None

    def __call__(self, rgb24: np.ndarray[np.uint8, Any], timestamp: float) -> float:
        try:
            if self.proc is None:
                raise RuntimeError("Encoder not initialized")
            self.proc.stdin.write(rgb24.tobytes())
            logger.debug(f"Wrote frame at time {self.time:.2f}s")
            if self.inp_settings["use_wallclock_as_timestamps"]:
                return time.time()
            self.time = timestamp
            return self.time
        except Exception as e:
            logger.error(f"Error writing frame: {e}")
            raise


class HLSStream:
    def __init__(
        self, encoder: HLSEncoder, id: str, kafka_config: dict, topic: str,
        max_last_frame_time: int = 300
    ) -> None:
        self.encoder = encoder
        self.id = id
        self.running = True
        self.topic = topic
        self.kafka_config = kafka_config
        self.last_frame_time = time.time()
        self.max_last_frame_time = max_last_frame_time
        self.cleared_segments = False
        self.task = []

    async def start(self):
        self.task = asyncio.create_task(self.run())
        return self.task

    async def run(self) -> None:
        try:
            consumer = AIOKafkaConsumer(
                "license_plate." + self.topic,
                # "stream." + self.topic,
                **self.kafka_config,
            )
            await consumer.start()

            # Seek to the end of the topic to avoid processing old messages
            for partition in consumer.assignment():
                await consumer.seek_to_end(partition)

            with self.encoder:
                while self.running:
                    # Check for inactivity
                    current_time = time.time()
                    inactive_time = current_time - self.last_frame_time

                    # Clear segments once if inactive for too long
                    if inactive_time > self.max_last_frame_time and not self.cleared_segments:
                        logger.warning(f"Stream {self.id} inactive for {inactive_time:.1f}s, clearing segments")
                        await self._clear_segments()
                        self.cleared_segments = True

                    try:
                        msg = await asyncio.wait_for(consumer.getone(), 0.1)
                        # frame, metadata = deserialize_data(msg.value)
                        # if frame is None:
                        #     continue

                        # frame = cv2.imdecode(np.frombuffer(frame, dtype=np.uint8), cv2.IMREAD_COLOR)
                        
                        frame_bytes = np.frombuffer(msg.value, dtype=np.uint8)
                        frame = cv2.imdecode(frame_bytes, cv2.IMREAD_COLOR)

                        if frame is not None:
                            # logger.info(f"Recieved frame from {self.topic}")

                            frame_timestamp = msg.timestamp / 1000
                            self.last_frame_time = frame_timestamp
                            self.cleared_segments = False

                            def process_frame():
                                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                                return self.encoder(rgb_frame, frame_timestamp)
                            
                            await asyncio.to_thread(process_frame)

                            if inactive_time > self.max_last_frame_time:
                                logger.info(f"Stream {self.id} reconnected after {inactive_time:.1f}s of inactivity")
                        else:
                            logger.error(f"Failed to decode frame")
                    except asyncio.TimeoutError:
                        await asyncio.sleep(0.01) 
                    except Exception as e:
                        import rich
                        rich.console.Console().print_exception()    
                        await asyncio.sleep(0.1)
                    await asyncio.sleep(0.01)  
        except Exception as e:
            import rich
            rich.console.Console().print_exception()
            logger.error(f"Stream {self.id} error: {e}")
        finally:
            await consumer.stop()

    async def stop(self) -> None:
        self.running = False
        if self.task:
            await self.task

    async def _clear_segments(self):
        try:
            m3u8_path = str(self.encoder.out_path)
            directory = os.path.dirname(m3u8_path)
                    
            # Create a playlist that indicates offline status but allows reconnection
            async def write_empty_playlist():
                with open(m3u8_path, 'w') as f:
                    f.write("#EXTM3U\n")
                    f.write("#EXT-X-VERSION:3\n")
                    f.write("#EXT-X-TARGETDURATION:4\n")
                    f.write("#EXT-X-MEDIA-SEQUENCE:0\n")
            
            await asyncio.to_thread(write_empty_playlist)

            async def delete_ts_files():
                for file in os.listdir(directory):
                    if file.endswith('.ts'):
                        try:
                            os.remove(os.path.join(directory, file))
                        except FileNotFoundError:
                            # Ignore if already deleted
                            pass
            
            await asyncio.to_thread(delete_ts_files)
                
            logger.info(f"Cleared stale HLS segments for stream {self.id}")
            
            self.last_frame_time = time.time()
        except Exception as e:
            logger.error(f"Error clearing HLS segments: {e}")
class HLSManager:
    def __init__(self, path) -> None:
        self.config_path = path
        self.config = json.load(open(path, "r"))
        self.encoders = {}
        self.streams = {}
        self.kafka_config = {
            "bootstrap_servers": os.getenv("KAFKA_SERVER", ""),
            "group_id": "hls_stream_group",
            "auto_offset_reset": "latest",
            "enable_auto_commit": False,
      
        }

        os.makedirs("stream", exist_ok=True)

        self.event_loop = asyncio.get_event_loop()
        self.event_loop.create_task(self.start_all_streams())

    async def start_all_streams(self):
        tasks = []
        for stream_id in self.config:
            rtsp_url = self.config[stream_id]["rtsp_url"]
            task = self.start_stream(stream_id, rtsp_url)
            tasks.append(task)
            
        await asyncio.gather(*tasks)

    async def start_stream(self, id: str, rtsp_url: str):
        logger.info(f"Creating HLS encoder for stream {id}")
        try:
            stream_path = os.path.join("stream", "ai", id, "hls", "live")
            os.makedirs(stream_path, exist_ok=True)
            out_path = os.path.join(stream_path, "index.m3u8")
            logger.info(f"Output path set to: {out_path}")

            self.encoders[id] = HLSEncoder(
                out_path,
                shape=(640, 640),
                input_fps=8,
                use_wallclock_pts=False,
                config=CONFIG_GPU,
            )
            
            self.streams[id] = HLSStream(
                encoder=self.encoders[id],
                id=id,
                kafka_config=self.kafka_config,
                topic=id,
            )

            await self.streams[id].start()
            return self.encoders[id]
        except Exception as e:
            logger.error(f"Failed to create HLS encoder for stream {id}: {e}")
            return None

    async def add_stream(self, id: str, rtsp_url: str):
        if id in self.config:
            logger.error(f"Stream {id} already exists")
            return

        res = await self.start_stream(id, rtsp_url)
        if res is not None:
            self.config[id] = {
                "rtsp_url": rtsp_url,
                "hls_postfix": f"/stream/ai/{id}/hls/live/index.m3u8",
            }
            json.dump(self.config, open(self.config_path, "w"), indent=4)

        return res



    async def stop(self):
        tasks = []
        for id in self.streams:
            tasks.append(self.streams[id].stop())
            
        await asyncio.gather(*tasks)
        
        # Clean up stream directories
        for id in list(self.streams.keys()):
            try:
                shutil.rmtree(os.path.join("stream", "ai", id))
            except Exception as e:
                logger.error(f"Failed to remove stream {id}: {e}")
