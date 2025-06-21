build:
	@docker compose -f deployment/docker-compose.yml build

run:
	@docker compose -f deployment/docker-compose.yml up -d

stop:
	@docker compose -f deployment/docker-compose.yml down

run-rebuild:
	@docker compose -f deployment/docker-compose.yml up --build -d