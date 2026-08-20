.PHONY: setup build run dev test \
        migrate-up migrate-down migrate-create \
        docker-dev docker-dev-down docker-prod docker-build docker-logs docker-down docker-nuke \
        health web-install web-dev web-build

BINARY_NAME=bingebeacon
DEV_COMPOSE=docker compose -f docker-compose.dev.yml
PROD_COMPOSE=docker compose -f docker-compose.yml

# Read DB settings from .env when present, else fall back to dev defaults.
-include .env
DATABASE_USER?=postgres
DATABASE_PASSWORD?=password
DATABASE_HOST?=localhost
DATABASE_PORT?=5432
DATABASE_DBNAME?=bingebeacon
DATABASE_SSLMODE?=disable
DB_URL=postgres://$(DATABASE_USER):$(DATABASE_PASSWORD)@$(DATABASE_HOST):$(DATABASE_PORT)/$(DATABASE_DBNAME)?sslmode=$(DATABASE_SSLMODE)

# ---------- Setup ----------

setup:
	@if [ ! -f .env ]; then cp .env.example .env; echo "created .env from .env.example"; fi
	@mkdir -p secrets
	@ln -sfn ../.env web/.env.local
	@echo "Setup complete. Edit .env — see docs/environment.md for every value."

# ---------- Backend ----------

build:
	go build -o ${BINARY_NAME} ./cmd/server

run: build
	./${BINARY_NAME}

dev:
	go run ./cmd/server

test:
	go test ./...

# ---------- Migrations (the API also applies these on startup) ----------

migrate-up:
	migrate -path migrations -database "$(DB_URL)" up

migrate-down:
	migrate -path migrations -database "$(DB_URL)" down 1

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

# ---------- Frontend ----------

web-install:
	cd web && bun install

web-dev:
	cd web && bun dev

web-build:
	cd web && bun run build

# ---------- Docker ----------

# Postgres + Redis only, for running the API and PWA natively.
docker-dev:
	$(DEV_COMPOSE) up -d

docker-dev-down:
	$(DEV_COMPOSE) down

# Full stack behind Caddy on :80.
docker-prod:
	$(PROD_COMPOSE) up -d --build

docker-build:
	$(PROD_COMPOSE) build

docker-logs:
	$(PROD_COMPOSE) logs -f --tail=100

docker-down:
	$(PROD_COMPOSE) down

# Also drops the Postgres/Redis volumes — destroys all local data.
docker-nuke:
	$(PROD_COMPOSE) down -v
	rm -rf data/postgres data/redis

health:
	@curl -fsS http://localhost/api/internal/health || curl -fsS http://localhost:8080/api/internal/health
