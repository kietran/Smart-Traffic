"""Client and server classes corresponding to protobuf-defined services."""
import grpc
import warnings
from . import lpr_pb2 as lpr__pb2
GRPC_GENERATED_VERSION = '1.71.0'
GRPC_VERSION = grpc.__version__
_version_not_supported = False
try:
    from grpc._utilities import first_version_is_lower
    _version_not_supported = first_version_is_lower(GRPC_VERSION, GRPC_GENERATED_VERSION)
except ImportError:
    _version_not_supported = True
if _version_not_supported:
    raise RuntimeError(f'The grpc package installed is at version {GRPC_VERSION},' + f' but the generated code in lpr_pb2_grpc.py depends on' + f' grpcio>={GRPC_GENERATED_VERSION}.' + f' Please upgrade your grpc module to grpcio>={GRPC_GENERATED_VERSION}' + f' or downgrade your generated code using grpcio-tools<={GRPC_VERSION}.')

class LPRServiceBase64Stub(object):
    """Missing associated documentation comment in .proto file."""

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.PredictBase64 = channel.unary_unary('/lpr.LPRServiceBase64/PredictBase64', request_serializer=lpr__pb2.PredictBase64Request.SerializeToString, response_deserializer=lpr__pb2.PredictBase64Response.FromString, _registered_method=True)

class LPRServiceBase64Servicer(object):
    """Missing associated documentation comment in .proto file."""

    def PredictBase64(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

def add_LPRServiceBase64Servicer_to_server(servicer, server):
    rpc_method_handlers = {'PredictBase64': grpc.unary_unary_rpc_method_handler(servicer.PredictBase64, request_deserializer=lpr__pb2.PredictBase64Request.FromString, response_serializer=lpr__pb2.PredictBase64Response.SerializeToString)}
    generic_handler = grpc.method_handlers_generic_handler('lpr.LPRServiceBase64', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))
    server.add_registered_method_handlers('lpr.LPRServiceBase64', rpc_method_handlers)

class LPRServiceBase64(object):
    """Missing associated documentation comment in .proto file."""

    @staticmethod
    def PredictBase64(request, target, options=(), channel_credentials=None, call_credentials=None, insecure=False, compression=None, wait_for_ready=None, timeout=None, metadata=None):
        return grpc.experimental.unary_unary(request, target, '/lpr.LPRServiceBase64/PredictBase64', lpr__pb2.PredictBase64Request.SerializeToString, lpr__pb2.PredictBase64Response.FromString, options, channel_credentials, insecure, call_credentials, compression, wait_for_ready, timeout, metadata, _registered_method=True)

class LPRServiceBatchBase64Stub(object):
    """Missing associated documentation comment in .proto file."""

    def __init__(self, channel):
        """Constructor.

        Args:
            channel: A grpc.Channel.
        """
        self.PredictBatchBase64 = channel.unary_unary('/lpr.LPRServiceBatchBase64/PredictBatchBase64', request_serializer=lpr__pb2.PredictBatchBase64Request.SerializeToString, response_deserializer=lpr__pb2.PredictBatchBase64Response.FromString, _registered_method=True)

class LPRServiceBatchBase64Servicer(object):
    """Missing associated documentation comment in .proto file."""

    def PredictBatchBase64(self, request, context):
        """Missing associated documentation comment in .proto file."""
        context.set_code(grpc.StatusCode.UNIMPLEMENTED)
        context.set_details('Method not implemented!')
        raise NotImplementedError('Method not implemented!')

def add_LPRServiceBatchBase64Servicer_to_server(servicer, server):
    rpc_method_handlers = {'PredictBatchBase64': grpc.unary_unary_rpc_method_handler(servicer.PredictBatchBase64, request_deserializer=lpr__pb2.PredictBatchBase64Request.FromString, response_serializer=lpr__pb2.PredictBatchBase64Response.SerializeToString)}
    generic_handler = grpc.method_handlers_generic_handler('lpr.LPRServiceBatchBase64', rpc_method_handlers)
    server.add_generic_rpc_handlers((generic_handler,))
    server.add_registered_method_handlers('lpr.LPRServiceBatchBase64', rpc_method_handlers)

class LPRServiceBatchBase64(object):
    """Missing associated documentation comment in .proto file."""

    @staticmethod
    def PredictBatchBase64(request, target, options=(), channel_credentials=None, call_credentials=None, insecure=False, compression=None, wait_for_ready=None, timeout=None, metadata=None):
        return grpc.experimental.unary_unary(request, target, '/lpr.LPRServiceBatchBase64/PredictBatchBase64', lpr__pb2.PredictBatchBase64Request.SerializeToString, lpr__pb2.PredictBatchBase64Response.FromString, options, channel_credentials, insecure, call_credentials, compression, wait_for_ready, timeout, metadata, _registered_method=True)