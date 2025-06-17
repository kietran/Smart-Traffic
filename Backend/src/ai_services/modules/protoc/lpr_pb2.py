"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
_runtime_version.ValidateProtobufRuntimeVersion(_runtime_version.Domain.PUBLIC, 5, 29, 0, '', 'lpr.proto')
_sym_db = _symbol_database.Default()
DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\tlpr.proto\x12\x03lpr"U\n\x19PredictBatchBase64Request\x12\r\n\x05image\x18\x01 \x03(\t\x12\x14\n\x0cdetect_color\x18\x02 \x01(\x08\x12\x13\n\x0bdetect_logo\x18\x03 \x01(\x08"`\n\x1aPredictBatchBase64Response\x12\r\n\x05plate\x18\x01 \x03(\t\x12\x16\n\x0elicense_number\x18\x02 \x03(\t\x12\r\n\x05color\x18\x03 \x03(\t\x12\x0c\n\x04logo\x18\x04 \x03(\t"P\n\x14PredictBase64Request\x12\r\n\x05image\x18\x01 \x01(\t\x12\x14\n\x0cdetect_color\x18\x02 \x01(\x08\x12\x13\n\x0bdetect_logo\x18\x03 \x01(\x08"[\n\x15PredictBase64Response\x12\r\n\x05plate\x18\x01 \x01(\t\x12\x16\n\x0elicense_number\x18\x02 \x01(\t\x12\r\n\x05color\x18\x03 \x01(\t\x12\x0c\n\x04logo\x18\x04 \x01(\t2Z\n\x10LPRServiceBase64\x12F\n\rPredictBase64\x12\x19.lpr.PredictBase64Request\x1a\x1a.lpr.PredictBase64Response2n\n\x15LPRServiceBatchBase64\x12U\n\x12PredictBatchBase64\x12\x1e.lpr.PredictBatchBase64Request\x1a\x1f.lpr.PredictBatchBase64Responseb\x06proto3')
_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'lpr_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
    DESCRIPTOR._loaded_options = None
    _globals['_PREDICTBATCHBASE64REQUEST']._serialized_start = 18
    _globals['_PREDICTBATCHBASE64REQUEST']._serialized_end = 103
    _globals['_PREDICTBATCHBASE64RESPONSE']._serialized_start = 105
    _globals['_PREDICTBATCHBASE64RESPONSE']._serialized_end = 201
    _globals['_PREDICTBASE64REQUEST']._serialized_start = 203
    _globals['_PREDICTBASE64REQUEST']._serialized_end = 283
    _globals['_PREDICTBASE64RESPONSE']._serialized_start = 285
    _globals['_PREDICTBASE64RESPONSE']._serialized_end = 376
    _globals['_LPRSERVICEBASE64']._serialized_start = 378
    _globals['_LPRSERVICEBASE64']._serialized_end = 468
    _globals['_LPRSERVICEBATCHBASE64']._serialized_start = 470
    _globals['_LPRSERVICEBATCHBASE64']._serialized_end = 580