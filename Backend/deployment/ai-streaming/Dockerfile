FROM python:3.10.15-slim-bullseye

WORKDIR /app

RUN apt update && apt install -y libsm6 libxext6 ffmpeg libfontconfig1 libxrender1 libgl1-mesa-glx

RUN pip install uv
 
COPY uv.lock pyproject.toml .python-version ./
 
ENV UV_HTTP_TIMEOUT=1000
ENV UV_LINK_MODE=copy
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen
