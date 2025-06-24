import msgpack

import pathlib

dir = pathlib.Path(__file__).parent.resolve()
from utils.logger import logger


def deserialize_data(packed_data):
    unpacker = msgpack.Unpacker(raw=False)
    unpacker.feed(packed_data)
    unpacked_data = next(unpacker)

    logger.info("DEBUG unpacked_data: %s", unpacked_data)
    frame_bytes = unpacked_data["frame"]
    metadata = unpacked_data["metadata"]
    return frame_bytes, metadata
