# Build context is the repository root.
FROM node:22-alpine

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm install --omit=dev

COPY apps/api/src ./src

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "src/server.js"]
