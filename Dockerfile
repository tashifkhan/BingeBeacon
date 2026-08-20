# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------
# BingeBeacon API — Go 1.24
# Multi-stage: cached module + build cache, static binary, distroless-ish
# alpine runtime running as an unprivileged user.
# ---------------------------------------------------------------

# ---------- build ----------
FROM golang:1.24-alpine AS builder

WORKDIR /src

# Module download is its own layer so source edits don't re-download deps.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Static build: no libc dependency, stripped, reproducible paths.
ARG VERSION=dev
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" \
        -o /out/bingebeacon ./cmd/server

# ---------- runtime ----------
FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app -h /app app

WORKDIR /app

COPY --from=builder --chown=app:app /out/bingebeacon ./bingebeacon
# Migrations are applied by the binary on startup from this relative path.
COPY --chown=app:app migrations ./migrations

USER app

ENV SERVER_PORT=8080 \
    TZ=UTC

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD wget -qO- "http://127.0.0.1:${SERVER_PORT}/api/internal/health" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["./bingebeacon"]
