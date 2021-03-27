FROM node:14-buster AS build-frontend

RUN mkdir -p /app
WORKDIR /app

COPY frontend/ ./

RUN ls -laR

RUN npm ci \
    && npm run build

FROM node:14-buster AS build-backend

RUN mkdir -p /app
WORKDIR /app

COPY backend/ ./

RUN ls -laR

RUN npm ci \
    && npm run build

FROM node:14-slim

RUN mkdir -p /app/public
WORKDIR /app

COPY --from=build-backend /app/package.json /app/package-lock.json ./

RUN npm ci --production

COPY --from=build-backend /app/build/ ./
COPY --from=build-frontend /app/build/ ./public/

CMD [ "node", "/app/index.js" ]