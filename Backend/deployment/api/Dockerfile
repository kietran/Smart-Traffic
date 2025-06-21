FROM python:3.12.4-slim-bullseye

WORKDIR /app

COPY uv.lock pyproject.toml .python-version ./

RUN pip install uv

ENV UV_HTTP_TIMEOUT=1000
ENV UV_LINK_MODE=copy
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen