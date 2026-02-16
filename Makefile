.PHONY: build run dev migrate-up migrate-down migrate-create docker-up docker-down web-install web-dev web-build

BINARY_NAME=bingebeacon

build:
	go build -o ${BINARY_NAME} ./cmd/server/main.go

run: build
	./${BINARY_NAME}

dev:
	go run ./cmd/server/main.go

migrate-up:
	migrate -path migrations -database "postgres://postgres:password@localhost:5432/bingebeacon?sslmode=disable" up

migrate-down:
	migrate -path migrations -database "postgres://postgres:password@localhost:5432/bingebeacon?sslmode=disable" down

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

# ---------- Setup ----------

setup:
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@cd web && if [ ! -L .env.local ]; then ln -s ../.env .env.local; fi
	@echo "Environment setup complete. Please edit .env with your secrets."

web-install:
	cd web && bun install

web-dev:
	cd web && bun dev

web-build:
	cd web && bun run build
