FROM node:22-bookworm AS build-frontend

RUN mkdir -p /app/frontend
WORKDIR /app/frontend

# copy package(-lock).json first and install (so it's only done when dependencies change)
COPY frontend/*.json ./
RUN npm ci

# copy all source files and build
COPY frontend/public/ ./public/
COPY frontend/src/ ./src/
COPY backend/src/global/*.d.ts ../backend/src/global/
RUN npm run build



FROM node:22-bookworm AS build-backend

RUN mkdir -p /app
WORKDIR /app

# copy package(-lock).json first and install (so it's only done when dependencies change)
COPY backend/*.json ./
RUN npm ci

# copy all source files and build
COPY backend/src/ ./src/
RUN npm run build



FROM node:22-bookworm-slim

RUN apt update && apt install -y git

RUN mkdir -p /app/public
WORKDIR /app

# copy package(-lock).json first and install (so it's only done when dependencies change)
COPY --from=build-backend /app/*.json ./
RUN npm ci --production

COPY --from=build-backend /app/build/ ./
COPY --from=build-frontend /app/frontend/build/ ./public/

CMD [ "node", "/app/index.js" ]
