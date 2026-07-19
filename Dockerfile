# Stage 1: Build & test
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Production runner
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app ./
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server.js"]
