from fastapi import APIRouter, Body, HTTPException
from pymongo import MongoClient, DESCENDING
from config import MONGO_URI
from bson.json_util import dumps
import json
import re

router = APIRouter()
client = MongoClient(MONGO_URI)
db = client.get_database("nano")
Event = db.event
Camera = db.camera

@router.post("/reid_analysis/search_lpr", tags=["reid_analysis"])
async def search_lpr(
    data: dict = Body(...)
):
    license_number = data.get("license_number")
    if not license_number:
        raise HTTPException(status_code=400, detail="license_number is required")

    try:
        # Create a case-insensitive regex pattern for partial matching
        regex_pattern = re.compile(f".*{re.escape(license_number)}.*", re.IGNORECASE)
        
        # Find all events with the matching license plate (partial match)
        lpr_events = list(Event.find(
            {"data.target_label": regex_pattern, "event_type": "license_plate"}
        ).sort("start_time", DESCENDING))

        if not lpr_events:
            return []

        # Then, get the details for each event
        results = []
        for event in lpr_events:
            # Format the event data for the frontend
            results.append({
                "camera_id": event.get("camera_id"),
                "camera_name": event.get("camera_name"),
                "area_name": event.get("area_name"),
                "start_time": event.get("start_time"),
                "full_image": event.get("full_thumbnail_path"),
                "target_image": event.get("target_thumbnail_path"),
                "plate_image": event.get("data", {}).get("plate_thumb_path"),
                "lpr": event.get("data", {}).get("target_label"),
                "event_type": event.get("event_type"),
                "is_reviewed": event.get("is_reviewed", False),
                "metadata": {
                    "color": event.get("data", {}).get("attribute", {}).get("v_color"),
                    "logo": event.get("data", {}).get("attribute", {}).get("logo"),
                    "class_name": event.get("data", {}).get("attribute", {}).get("class_name")
                }
            })

        return json.loads(dumps(results))

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}\n{error_details}") 