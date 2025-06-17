from modules.protoc.lpr_pb2_grpc import LPRServiceBase64Stub, LPRServiceBatchBase64Stub
from modules.protoc.lpr_pb2 import PredictBase64Request, PredictBatchBase64Request
import grpc
from utils.logger import logger
from config import LPR_HOST, LPR_PORT, LPR_GRPC_PORT
from utils.common import img_to_base64, img_to_bytes


class gRPCClient:
    def __init__(self, host=LPR_HOST, port=LPR_GRPC_PORT):
        self.host = host
        self.port = port

        try:
            self.channel = grpc.insecure_channel(
                f"{host}:{port}",
                options=[
                    ("grpc.keepalive_time_ms", 60000),
                    ("grpc.keepalive_timeout_ms", 10000),
                    ("grpc.keepalive_permit_without_calls", 1),
                    ("grpc.http2.max_pings_without_data", 0),
                    ("grpc.http2.min_time_between_pings_ms", 30000),
                    ("grpc.http2.min_ping_interval_without_data_ms", 30000),
                ],
            )
            grpc.channel_ready_future(self.channel).result(timeout=5)
        except grpc.FutureTimeoutError:
            logger.error(f"gRPC connection to {host}:{port} timed out.")
        except grpc.RpcError as e:
            logger.error(f"gRPC connection error: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
        
        self.channel.subscribe(self.on_state_change, try_to_connect=True)
        self.stub = LPRServiceBase64Stub(self.channel)
        self.stub_batch = LPRServiceBatchBase64Stub(self.channel)

    def on_state_change(self, connectivity):
        logger.warning(f"Connect channel: {connectivity}")

    def close(self):
        self.channel.close()

    def create_grpc_request(
        self, image, detect_color=True, detect_logo=True
    ):
        base64_image = img_to_base64(image)
        return PredictBase64Request(
            image=base64_image, detect_color=detect_color, detect_logo=detect_logo
        )


    def create_grpc_batch_request(
        self, images, detect_color=True, detect_logo=True
    ):
        batch_base64_image = [img_to_base64(image) for image in images]
        return PredictBatchBase64Request(
            image=batch_base64_image,
            detect_color=detect_color,
            detect_logo=detect_logo,
        )

    def send_one(self, image):
        try:
            request = self.create_grpc_request(image)
            response = self.stub.PredictBase64(request)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error occurred: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            return None

    def send_batch(self, images):
        try:
            request = self.create_grpc_batch_request(images)
            response = self.stub_batch.PredictBatchBase64(request)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error occurred: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            return None

    def send_batch(self, images):
        try:
            request = self.create_grpc_batch_request(images)
            response = self.stub_batch.PredictBatchBase64(request)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error occurred: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            return None

    def send_batch(self, images):
        try:
            request = self.create_grpc_batch_request(images)
            response = self.stub_batch.PredictBatchBase64(request)
            return response
        except grpc.RpcError as e:
            logger.error(f"gRPC error occurred: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}")
            return None
