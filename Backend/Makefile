MONGO_CONTAINER_NAME=nano-mongo-1
MONGO_INITDB_DATABASE=nano
MIGRATE_DOWN_SCRIPT=mongo-drop.js
MIGRATE_UP_SCRIPT=mongo-up.js
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=anh123

# Install package dependencies
install-dependencies:
	@pip install -r deployment/ai-streaming/requirements.txt 
	@pip uninstall opencv-python-headless opencv-python -y         
	@pip install opencv-python
	
format:
	@black .


migrate-down:
	docker exec -i $(MONGO_CONTAINER_NAME) mongosh --username $(MONGO_INITDB_ROOT_USERNAME) --password $(MONGO_INITDB_ROOT_PASSWORD) /docker-entrypoint-initdb.d/$(MIGRATE_DOWN_SCRIPT)

migrate-up:
	docker exec -i $(MONGO_CONTAINER_NAME) mongosh --username $(MONGO_INITDB_ROOT_USERNAME) --password $(MONGO_INITDB_ROOT_PASSWORD) /docker-entrypoint-initdb.d/$(MIGRATE_UP_SCRIPT)

run-dev:
	@docker compose  --env-file .env -f ./deployment/docker-compose.yml up -d --build 
	@echo "Application started."
run-ai-streaming:
	@docker compose  --env-file .env -f ./deployment/docker-compose.yml up ai-streaming -d --build 
	@echo "Application started."
run-ai-services:
	@docker compose  --env-file .env -f ./deployment/docker-compose.yml up ai-services -d --build 
	@echo "Application started."
dev-api:
	@python src/api/app.py --debug

deploy-api:
	@docker compose -f ./deployment/docker-compose.yml --env-file .env up api -d --build

build-all:
	@docker compose -f ./deployment/docker-compose.yml --env-file .env up -d --build

run-hls-stream:
	@docker compose -f ./deployment/docker-compose.yml --env-file .env up hls-stream -d --build 
	@echo "Application started."

run-reid:
	@docker compose -f ./deployment/docker-compose.yml --env-file .env up reid -d --build 
	@echo "Application started."

run-kafka-ui:
	@docker compose -f ./deployment/docker-compose.yml --env-file .env up kafka-ui -d --build 
	@echo "Application started."