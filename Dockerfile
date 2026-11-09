# One Railway service: builds the React app, then runs the Second Life bridge that serves it.
FROM node:20-bookworm-slim AS web
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js tailwind.config.js postcss.config.js jsconfig.json components.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libopenjp2-tools git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY railway/package.json railway/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY railway/ ./
COPY --from=web /src/dist ./web
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
USER node
CMD ["node", "src/server.js"]
