# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bingebeacon ./cmd/server/main.go

# Run stage
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /app/bingebeacon .
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/config.yaml .
# Also copy .env.example if we want, but environment vars are usually injected

EXPOSE 8080

CMD ["./bingebeacon"]
