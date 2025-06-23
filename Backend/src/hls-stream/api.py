import uvicorn
import json
from fastapi import FastAPI, Response, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

from starlette.responses import RedirectResponse

import argparse
import os
from core import HLSManager

from contextlib import asynccontextmanager
from fastapi.templating import Jinja2Templates


@asynccontextmanager
async def lifespan(app: FastAPI):

    global manager
    manager = HLSManager("metadata/stream.json")
    await manager.start_all_streams()
    yield

    await manager.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def index():

    return RedirectResponse(url="/docs")


@app.get("/stream/ai/{id}/hls/live/{fileName}", include_in_schema=False)
async def video(response: Response, id: str, fileName: str):
    response.headers["Content-Type"] = "application/x-mpegURL"
    stream_path = os.path.join("stream", "ai", id, "hls", "live", fileName)
    return FileResponse(stream_path, filename=fileName)


@app.get("/streams")
async def get_streams():

    return JSONResponse(content=manager.config)


templates = Jinja2Templates(directory="templates")


@app.get("/live/{id}")
async def get_live_stream(request: Request, id: str):

    return templates.TemplateResponse(
        request=request,
        name="live.html",
        context={
            "server": f"{os.getenv('API_HOST', '192.168.101.4')}:{os.getenv('HLS_PORT', 7898)}",
            "id": id,
        },
    )


@app.post("/stream/add/")
async def add_stream(stream: dict):

    id, rtsp_url = stream["id"], stream["rtsp_url"]
    res = await manager.add_stream(id, rtsp_url)
    if res is not None:
        return JSONResponse(content={"status": "success"})
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add stream",
        )





def args_parser():
    parser = argparse.ArgumentParser(description="Stream HLS API")
    parser.add_argument("--watch", action="store_true", help="Enable live mode")
    return parser.parse_args()


if __name__ == "__main__":
    opt = args_parser()

    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=int(os.getenv("HLS_PORT", "7898")),
        reload=opt.watch if opt.watch else False,
    )
