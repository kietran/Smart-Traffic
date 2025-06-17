"""events apis."""

from fastapi import (
    APIRouter,
    Request,
    Query,
    HTTPException,
    Body,
    WebSocket,
    WebSocketException,
)
from datetime import datetime, timedelta
from pymongo import MongoClient, DESCENDING
from config import MONGO_URI
from functools import reduce
import uuid
from modules.websocket_manager import WebsocketManager
from rich import inspect, print
from rich.console import Console
from utils.logger import logger
from bson.json_util import dumps
import json
from datetime import datetime, timezone
from pydantic import BaseModel
import requests
import time
import requests
import pytz
import io


from minio import Minio
from config import (
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET_EVENTS,
    MINIO_BUCKET_VIDEO,
    MINIO_SERVER,
)

minio_client = Minio(
    MINIO_SERVER,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False,
)

console = Console()

days = 1
router = APIRouter()
manager = WebsocketManager()

EVENTS_TYPE = [
    "crowd_detection",
    "vehicle_counting",
    "license_plate",
    "reidentify",
    "speed_estimate",
]
ALERT_TYPE = [
    "crowd_detection",
    "traffic_light",
    "wrong_lane",
    "wrong_direction",
    "accident_detection",
]

router = APIRouter()
client = MongoClient(MONGO_URI)
nano = client.get_database(name="nano")

Event = nano.event
Camera = nano.camera
Watchlist = nano.watchlist_license_plate


# item_data = {
#     "event_type": event_type,
#     "camera_id": camera_id,
#     "camera_name": camera_name,
#     "area_id": area_id,
#     "area_name": area_name,
#     "start_time": start_time,
#     "end_time": end_time,
#     "full_thumbnail_path": full_thumb_path,
#     "target_thumbnail_path": target_thumb_path,
#     "is_reviewed": False,
#     "has_snapshot": True,
#     "data": data,
# }

class EventQuery(BaseModel):
    event_type: str | None = None
    camera_id: str | None = None
    camera_name: str | None = None
    area_id: str | None = None
    area_name: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    full_thumbnail_path: str | None = None
    target_thumbnail_path: str | None = None
    is_reviewed: bool = False
    data: dict | None = None
    
    
@router.post("/events/create", tags=["events"])
async def create_event(
    payload: EventQuery
):
    start_time = payload.start_time
    end_time = payload.end_time
    try:
        if end_time is None:
            end_time = datetime.now().timestamp()
        if start_time is None:
            start_time = 0

        start_time_dt = datetime.fromtimestamp(start_time)
        end_time_dt = datetime.fromtimestamp(end_time)

    except (OSError, OverflowError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid timestamp format.")
    try:
        item_data = {
            "event_type": payload.event_type,
            "camera_id": payload.camera_id,
            "camera_name": payload.camera_name,
            "area_id": payload.area_id,
            "area_name": payload.area_name,
            "start_time": start_time_dt,
            "end_time": end_time_dt,
            "full_thumbnail_path": payload.full_thumbnail_path,
            "target_thumbnail_path": payload.target_thumbnail_path,
            "is_reviewed": payload.is_reviewed,
            "data": payload.data,
            "is_alert":False
        }
        result = Event.insert_one(item_data)
        item_data["start_time"] = item_data["start_time"].isoformat()
        item_data["end_time"] = item_data["end_time"].isoformat()
        item_data.pop("_id", None)
        if (payload.event_type in ["traffic_light", "accident_detection", "wrong_lane", "wrong_direction", "crowd_detection"]):
            item_data["is_alert"] = True
            
        await manager.broadcast(item_data)
        return {"success": True, "message": f"Event created with ID: {result.inserted_id}"}

    except Exception as e:
        import rich
        rich.console.Console().print_exception()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
    
    
@router.get("/events/summary", tags=["events"])
async def get_summary(
    cameras: str = Query(None, description="Comma separated list of camera ids"),
    before: float = Query(None, description="End time in unix timestamp"),
    after: float = Query(None, description="Start time in unix timestamp"),
):
    try:
        if before is None:
            before = datetime.now().timestamp()

        if after is None:
            after = 0

        before_dt = datetime.fromtimestamp(before)
        after_dt = datetime.fromtimestamp(after)
    except (OSError, OverflowError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Time must be a valid timestamp.")

    match_conditions = {
        "end_time": {"$lte": before_dt},
        "start_time": {"$gte": after_dt},
    }
    if cameras:
        camera_list = cameras.split(",")
        match_conditions["camera_id"] = {"$in": camera_list}


    pipeline = [
        {"$match": match_conditions},
        {
            "$group": {
                "_id": None,
                **{
                    f"total_{etype}": {
                        "$sum": {"$cond": [{"$eq": ["$event_type", etype]}, 1, 0]}
                    }
                    for etype in EVENTS_TYPE
                },
                **{
                    f"reviewed_{etype}": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$eq": ["$event_type", etype]},
                                        {"$eq": ["$is_reviewed", True]},
                                    ]
                                },
                                1,
                                0,
                            ]
                        }
                    }
                    for etype in EVENTS_TYPE
                },
            }
        },
        {"$project": {"_id": 0}},
    ]

    agg_result = list(Event.aggregate(pipeline))
    data = (
        agg_result[0]
        if agg_result
        else {
            **{f"total_{etype}": 0 for etype in EVENTS_TYPE},
            **{f"reviewed_{etype}": 0 for etype in EVENTS_TYPE},
        }
    )

    return {
        "data": data,
        "start_time": datetime.fromtimestamp(after).isoformat(),
        "end_time": datetime.fromtimestamp(before).isoformat(),
    }


@router.post("/events/overview", tags=["events"])
async def get_events_overview(
    event_type: str = Query(None, description="Event type"),
    start_time: float = Query(None, description="Start time in unix timestamp"),
    end_time: float = Query(None, description="End time in unix timestamp"),
    filter_data: dict = Body(None, description="Filter data"),
):
    try:
        if end_time is None:
            end_time = datetime.now().timestamp()
        if start_time is None:
            start_time = 0

        start_time_dt = datetime.fromtimestamp(start_time)
        end_time_dt = datetime.fromtimestamp(end_time)

    except (OSError, OverflowError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid timestamp format.")
    try:
        query = {
            "event_type": event_type,
            "start_time": {"$gte": start_time_dt},
            "end_time": {"$lte": end_time_dt},
        }
        
        camera_id = filter_data.get("camera_id", None)
        area_id = filter_data.get("area_id", None)
        if camera_id is not None:
            query["camera_id"] = camera_id
        if area_id is not None:
            query["area_id"] = area_id
    
        events_cursor = Event.find(query).sort("start_time", DESCENDING).limit(100)
        items = list(events_cursor)
        isWatchlist = filter_data.get("isWatchlist") if filter_data else None
        watchlist_dict = {}

            
        if event_type == "license_plate" and isWatchlist is not None:
            plates_cursor = Watchlist.find()
            for plate in plates_cursor:
                plate_number = plate.get("license_plate")
                plate_data = plate.get("data", {})
                plate_id = plate.get("_id")
                watchlist_dict[plate_number] = {**plate_data, "id": str(plate_id)}
        return {
            "totalCount": len(items),
            "items": json.loads(dumps(items)),
            "watchlist": watchlist_dict if watchlist_dict else None,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/alert/overview", tags=["events"])
async def get_alert_overview(
    event_type: str = Query(None, description="Event type"),
    start_time: float = Query(None, description="Start time in unix timestamp"),
    end_time: float = Query(None, description="End time in unix timestamp"),
    filter_data: dict = Body(None, description="Filter data"),
    limit: int = Query(0, description="Limit the number of events"),
):
    try:
        if end_time is None:
            end_time = datetime.now().timestamp()
        if start_time is None:
            start_time = 0

        start_time_dt = datetime.fromtimestamp(start_time)
        end_time_dt = datetime.fromtimestamp(end_time)

    except (OSError, OverflowError, ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid timestamp format.")

    try:
        camera_match = {}
        if filter_data.get("camera_id"):
            camera_match["camera_id"] = filter_data["camera_id"]

        pipeline = [
            {"$match": camera_match},
            {
                "$lookup": {
                    "from": "event",
                    "let": {"cid": "$camera_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {"$eq": ["$camera_id", "$$cid"]},
                                "start_time": {
                                    "$gte": start_time_dt,
                                    "$lte": end_time_dt,
                                },
                                **(
                                    {"event_type": {"$in": ALERT_TYPE}}
                                    if event_type == "all"
                                    else {
                                        "event_type": (
                                            event_type
                                            if isinstance(event_type, str)
                                            else {"$in": event_type}
                                        )
                                    }
                                ),
                            }
                        },
                        {"$sort": {"start_time": -1}},
                        *([{"$limit": limit}] if limit > 0 else []),
                    ],
                    "as": "events",
                }
            },
            {"$unwind": {"path": "$events", "preserveNullAndEmptyArrays": True}},
            {
                "$group": {
                    "_id": "$camera_id",
                    "camera_name": {"$first": "$camera_name"},
                    "url": {"$first": "$url"},
                    "area_id": {"$first": "$area_id"},
                    "area_name": {"$first": "$area_name"},
                    "history": {
                        "$push": {
                            "$cond": [
                                {"$ifNull": ["$events", False]},
                                {
                                    "date": {
                                        "$dateToString": {
                                            "format": "%Y-%m-%d %H:%M:%S",
                                            "date": "$events.start_time",
                                        }
                                    },
                                    "event_id": { "$toString": "$events._id" },
                                    "is_reviewed": "$events.is_reviewed",
                                    "timestamp": "$events.start_time",
                                    "event_type": "$events.event_type",
                                    "thumbnail": "$events.full_thumbnail_path",
                                    "license_plate": "$events.data.license_plate",
                                    "plate_img": "$events.data.plate_img",
                                    "target_img": "$events.target_thumbnail_path",
                                },
                                "$$REMOVE",
                            ]
                        }
                    },
                    "traffic_light": {
                        "$sum": {
                            "$cond": [
                                {
                                "$and": [
                                    { "$eq": ["$events.event_type", "traffic_light"] },
                                    { "$eq": ["$events.is_reviewed", False] }
                                ]},
                                1,
                                0,
                            ]
                        }
                    },
                    "reviewed": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$events.is_reviewed", True]},
                                1,
                                0,
                            ]
                        }
                    },
                    # "accident": {
                    #     "$sum": {
                    #         "$cond": [
                    #             {
                    #             "$and": [
                    #                 { "$eq": ["$events.event_type", "accident"] },
                    #                 { "$eq": ["$events.is_reviewed", False] }
                    #             ]},
                    #             1,
                    #             0,
                    #         ]
                    #     }
                    # },
                    "wrong_lane": {
                        "$sum": {
                            "$cond": [
                                {
                                "$and": [
                                    { "$eq": ["$events.event_type", "wrong_lane"] },
                                    { "$eq": ["$events.is_reviewed", False] }
                                ]},
                                1,
                                0,
                            ]
                        }
                    },
                    "wrong_direction": {
                        "$sum": {
                            "$cond": [
                                {
                                "$and": [
                                    { "$eq": ["$events.event_type", "wrong_direction"] },
                                    { "$eq": ["$events.is_reviewed", False] }
                                ]},
                                1,
                                0,
                            ]
                        }
                    },
                    "traffic_jam": {
                        "$sum": {
                            "$cond": [
                                {
                                "$and": [
                                    { "$eq": ["$events.event_type", "crowd_detection"] },
                                    { "$eq": ["$events.is_reviewed", False] }
                                ]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            },
        ]

        items = list(Camera.aggregate(pipeline))
        return {
            "totalCount": len(items),
            "items": json.loads(dumps(items)),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

from bson import ObjectId
@router.post("/events/viewed", tags=["events"])
async def mark_events_viewed(event_id: str):
    try:
        _event_id = ObjectId(event_id)
        result = Event.update_one(
            {"_id": _event_id},
            {"$set": {"is_reviewed": True}},
        )
        # return event item
        event_item = Event.find_one({"_id": _event_id})
        event_item["is_alert"] = True
        event_item.pop("start_time", None)
        event_item.pop("end_time", None)
        event_item["action"] = "reviewed"
        event_item.pop("_id", None)
        event_item["event_id"] = event_id
        await manager.broadcast(event_item) 
        return {
            "success": True,
            "message": f"Review update ok. Matched {result.matched_count} events.",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.delete("/events/{event_id}", tags=["events"])
async def delete_event(event_id: str):
    try:
        uuid.UUID(event_id)
        result = Event.delete_one({"event_id": event_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

        return {"success": True, "message": f"Event {event_id} deleted"}

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")



def extract_time(timestamp, segment_time):
    start_time = timestamp - segment_time // 2
    end_time = timestamp + segment_time // 2
    format = "%Y-%m-%d-%H%M%S-0000000Z"

    # Convert to UTC before formatting
    start_time_utc = (
        datetime.fromtimestamp(
            start_time, tz=pytz.timezone("Asia/Ho_Chi_Minh")
        )
        .astimezone(pytz.UTC)
        .strftime(format)
    )
    end_time_utc = (
        datetime.fromtimestamp(
            end_time, tz=pytz.timezone("Asia/Ho_Chi_Minh")
        )
        .astimezone(pytz.UTC)
        .strftime(format)
    )

    return start_time_utc, end_time_utc


@router.get("/events/video", tags=["events"])
async def get_video(cam_id: str, timestamp: str, segmentTime: int):
    try:
        timestamp = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ").timestamp()
        img_name = f"{cam_id}/{timestamp}.mp4"
        img_url = f"http://{MINIO_SERVER}/{MINIO_BUCKET_VIDEO}/{img_name}"
        data = json.load(open("src/api/config/cam.json", "r", encoding="utf-8"))
        cam_token = data[cam_id]["id"]
        try:
            minio_client.stat_object(MINIO_BUCKET_VIDEO, img_name)
            return {
                "success": True,
                "message": "Video already exists",
                "video_url": img_url,
            }
        except Exception as e:
            pass
        start_time_str, end_time_str = extract_time(timestamp, segmentTime)
        download_url = f"https://vntt:Becamex%402024@192.168.105.3:29204/Acs/Streaming/Video/Export/Mp4?camera={cam_token}&quality=high&start={start_time_str}&end={end_time_str}&audio=0"
        response = requests.get(download_url, stream=False, verify=False, timeout=20)
        response.raise_for_status()
        
        file_like_object = io.BytesIO(response.content)
        # 
        minio_client.put_object(
            MINIO_BUCKET_VIDEO,
            img_name,
            file_like_object,
            length=len(response.content),
            content_type="video/mp4",
        )
   

        return {
            "success": True,
            "message": f"Video downloaded from upstream: {len(response.content)} bytes",
            "video_url": img_url,
        }

    except Exception as e:
        import rich
        rich.console.Console().print_exception()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    # await websocket.accept()
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(data)
    except Exception as e:
        logger.error(e)
    finally:
        manager.disconnect(websocket)
        
        
