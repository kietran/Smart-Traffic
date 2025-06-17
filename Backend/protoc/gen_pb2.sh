echo "Generating Python gRPC code from .proto files..."

# make dir if not exists
mkdir -p src/ai_services/modules/protoc


python -m grpc_tools.protoc -I ./protoc \
    --python_out=src/ai_services/modules/protoc \
    --grpc_python_out=src/ai_services/modules/protoc \
    lpr.proto

protol \
  --create-package \
  --in-place \
  --python-out src/ai_services/modules/protoc \
  protoc --proto-path=./protoc lpr.proto