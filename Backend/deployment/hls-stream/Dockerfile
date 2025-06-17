FROM wonderwall666/ffmpeg-nvenc

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-dev \
    libgl1-mesa-glx \
    liblz4-dev \
    libglib2.0-0 && \
    ln -s /usr/bin/python3.10 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

RUN pip install uv
ENV UV_HTTP_TIMEOUT=1000
ENV UV_LINK_MODE=copy

COPY ./deployment/hls-stream/requirements.txt .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install -r requirements.txt --system 
