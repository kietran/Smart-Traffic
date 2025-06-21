FROM python:3.10.15-slim-bullseye

WORKDIR /app

RUN apt-get update && apt-get install ffmpeg libsm6 libxext6 protobuf-compiler  -y
RUN pip install uv

COPY uv.lock pyproject.toml .python-version ./

ENV UV_HTTP_TIMEOUT=1000
ENV UV_LINK_MODE=copy

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen