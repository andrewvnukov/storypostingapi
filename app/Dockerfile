# better-sqlite3 is a native module, so it is built in a stage that carries the
# toolchain, and only the finished node_modules are copied into the runtime.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
# ffmpeg and ffprobe do the composition; the app shells out to both.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
