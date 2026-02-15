.PHONY: build run dev migrate-up migrate-down migrate-create docker-up docker-down

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
