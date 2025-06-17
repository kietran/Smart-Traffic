FROM python:3.12.4-slim-bullseye

WORKDIR /app

RUN pip install --upgrade pip

COPY ./deployment/api/requirements.txt .
RUN pip install -r requirements.txt --timeout=1000 --no-cache-dir

COPY ./deployment/api/requirements-2.txt .
RUN pip install -r requirements-2.txt --timeout=1000 --no-cache-dir