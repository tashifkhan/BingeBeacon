# BingeBeacon Deployment Guide

This guide covers the setup and deployment of BingeBeacon, a PWA-enabled TV/Movie show tracking and alert system.

## Stack Overview
- **Backend**: Go (Golang) 1.24+
- **Database**: PostgreSQL 16+ (with JSONB support)
- **Cache/Rate Limiting**: Redis 7+
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind v4
- **PWA**: Serwist (Service Workers)
- **Package Manager**: Bun

---

## 1. Prerequisites

Before starting, ensure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Go 1.24+](https://go.dev/dl/) (for local backend development)
- [Bun](https://bun.sh/) (for frontend development)
- [Golang Migrate](https://github.com/golang-migrate/migrate) (optional, for manual migrations)

---

## 2. Environment Configuration

BingeBeacon uses a **single master `.env` file** in the root directory for both the backend and frontend.

1.  Create the root `.env` by copying the example:
    ```bash
    cp .env.example .env
    ```
2.  Create the frontend env symlink so Next.js reads the same `.env`:
    ```bash
    ln -s ../.env web/.env.local
    ```
3.  Edit the root `.env` and populate it with your keys. If any value contains spaces, wrap it in quotes (for example, `MOVIEGLU_AUTHORIZATION="Basic <base64>"`).

### Root `.env` (Master)
```env
# --- Server ---
SERVER_PORT=8080
...
```

### Frontend Variables
The Next.js app in `web/` will automatically pick up variables from the root `.env` (via the symlink `.env.local -> ../.env`). Only variables prefixed with `NEXT_PUBLIC_` will be exposed to the client.

---

## 3. Firebase Setup (FCM)

BingeBeacon uses Firebase Cloud Messaging (FCM) to deliver real-time alerts. You need to configure both the Admin SDK (for the Go backend) and the Client SDK (for the Next.js frontend).

### 1. Create a Firebase Project
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project named `BingeBeacon`.
3.  Navigate to **Project Settings** (gear icon).

### 2. Backend Configuration (Go Admin SDK)
1.  Go to the **Service accounts** tab.
2.  Click **Generate new private key**.
3.  Save the downloaded JSON file as `firebase-credentials.json` in the root of the project.
4.  Ensure `FCM_CREDENTIALS_FILE=firebase-credentials.json` is set in your root `.env`.

### 3. Frontend Configuration (Web SDK)
1.  In **Project Settings > General**, click the **Web icon (`</>`)** to register a web app.
2.  Copy the `firebaseConfig` object values into your root `.env` (prefixed with `NEXT_PUBLIC_FIREBASE_`).
3.  Go to the **Cloud Messaging** tab.
4.  Under **Web Push certificates**, click **Generate key pair**. This is your **VAPID Key**.
5.  Add this key to `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in your `.env`.

### 4. Service Worker Activation
The Firebase service worker (`web/public/firebase-messaging-sw.js`) is **automatically generated** during the build process (`npm run build` or `npm run dev`). 

It pulls the configuration from your root `.env` file. You do not need to edit it manually. If you change your Firebase configuration, just restart the development server or rebuild the project.

---

## 4. Development Setup

### Option A: Local (Recommended for speed)

1. **Infrastructure**: Start PostgreSQL and Redis using Docker.
   ```bash
   docker-compose -f docker-compose.dev.yml up -d postgres redis
   ```

2. **Backend**:
   ```bash
   # Install dependencies
   go mod download

   # Run migrations (Dockerized migrate using compose)
   docker-compose -f docker-compose.dev.yml up migrate

   # Start server
   go run ./cmd/server/main.go
   ```

3. **Frontend**:
   ```bash
   cd web
   bun install
   bun dev
   ```
   Access the frontend at `http://localhost:3000`.

### Option B: Full Docker Development

```bash
docker-compose -f docker-compose.dev.yml up --build
```
*Note: Service worker (Serwist) is disabled in development mode by default.*

---

## 5. Production Setup

### Using Docker Compose (Recommended)

1. Ensure `.env` is fully populated with production secrets and TMDB keys.
2. Build and start the services:
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

This will:
- Start **PostgreSQL** (Port 5432)
- Start **Redis** (Port 6379)
- Build and start the **Go API** (Port 8080)
- Build the **Next.js PWA** using a multi-stage Bun build and serve it (Port 3000)

### Docker Compose File

Use this `docker-compose.yml` (already in the repo root):
```yaml
services:
  api:
    build: .
    restart: always
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      - SERVER_ENVIRONMENT=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DATABASE_USER:-postgres}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD:-password}
      POSTGRES_DB: ${DATABASE_DBNAME:-bingebeacon}
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data

  web:
    build: ./web
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - api
```

### Manual Production Build

**Backend (Dockerfile build)**:
```bash
# Build backend image
docker build -t bingebeacon-api:latest -f Dockerfile .

# Run backend container
docker run --rm -p 8080:8080 --env-file .env bingebeacon-api:latest
```

**Frontend (Dockerfile build)**:
```bash
# Build frontend image
docker build -t bingebeacon-web:latest -f web/Dockerfile ./web

# Run frontend container
docker run --rm -p 3000:3000 --env-file .env bingebeacon-web:latest
```

**Manual (non-Docker) Production Build**:
```bash
# Backend
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/bingebeacon ./cmd/server/main.go
./bin/bingebeacon

# Frontend
cd web
bun install
bun run build # Uses --webpack internally for Serwist compatibility
bun start
```

---

## 6. Migrations

Database migrations are located in `/migrations`.
- **Up**:
  ```bash
  migrate -path ./migrations -database "postgres://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:$DATABASE_PORT/$DATABASE_DBNAME?sslmode=$DATABASE_SSLMODE" up
  ```
- **Down**:
  ```bash
  migrate -path ./migrations -database "postgres://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:$DATABASE_PORT/$DATABASE_DBNAME?sslmode=$DATABASE_SSLMODE" down
  ```
- **New Migration**:
  ```bash
  migrate create -ext sql -dir ./migrations -seq description_here
  ```

If you use the dev compose file, you can also run migrations via Docker:
```bash
docker-compose -f docker-compose.dev.yml up migrate
```

---

## 7. Troubleshooting

### PWA Issues
- Serwist only generates the service worker in **production build**.
- If the service worker isn't registering, ensure you are using `HTTPS` (or `localhost`) as per PWA security requirements.
- Clear browser cache and service worker registrations in DevTools (Application tab) if updates are not reflecting.

### TMDB API Errors
- Ensure your `TMDB_API_KEY` is a "Read Access Token" (v4) or standard API Key (v3). BingeBeacon uses v3 keys by default.

### Firebase / Push Errors
- Ensure the `firebase-credentials.json` is in the root directory if running via Docker (it is volume-mounted).
- Browser notification permissions must be granted.
- Ensure the `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is the **Public Key** from the Firebase Cloud Messaging tab, not the private one.
- If notifications aren't appearing in the background, double-check that `web/public/firebase-messaging-sw.js` has the correct project credentials.
