import asyncio
import aiohttp
import base64
import cv2
from utils.logger import logger
from config import LPR_HOST, LPR_PORT, LPR_GRPC_PORT
from utils.common import base64_to_cv2_image, img_to_base64

async def find_license_plate(img_base64, session):

    url = f"http://{LPR_HOST}:{LPR_PORT}/predict/base64/"
    try:
        async with session.post(
            url, json={"image": img_base64, "type": "car"}, timeout=20
        ) as response:
            if response.status == 200:
                data = await response.json()
                return data
            else:
                logger.error(f"find_license_plate: Response status {response.status}")
                return {}
    except Exception as e:
        logger.error(f"Error finding license plate asynchronously: {e}")
        return {}


async def process_license_plate(cropped_frame, session):

    try:
        img_b64 = img_to_base64(cropped_frame)

        data = await find_license_plate(img_b64, session)

        license_number = data.get("license_number")
        plate_img = base64_to_cv2_image(data.get("plate"))
        color = data.get("color")
        
        return license_number, plate_img, color

    except Exception as e:
        import rich
        return None, None, None


async def process_license_plate_batch(cropped_frames, session):
    try:
        cropped_frames = [
            cv2.imencode(".jpg", cropped_frame)[1] for cropped_frame in cropped_frames
        ]
        files = [
            (f"test_pic_{i}.jpg", cropped_frame.tobytes())
            for i, cropped_frame in enumerate(cropped_frames)
        ]
        data = {"type": "car", "detect_color": False, "shape": "128x128"}
        url = f"http://{LPR_HOST}:{LPR_PORT}/predict/bytes_image/"

        form_data = aiohttp.FormData()
        for key, value in data.items():
            form_data.add_field(key, str(value))
        for idx, (filename, file_byte) in enumerate(files):
            form_data.add_field(
                "image", file_byte, filename=filename, content_type="image/jpeg"
            )

        async with session.post(url, data=form_data) as response:
            response.raise_for_status()
            response_data = await response.json()

        return response_data

    except Exception as e:
        logger.error(f"Error finding license plate asynchronously: {e}")
        return None
    
    