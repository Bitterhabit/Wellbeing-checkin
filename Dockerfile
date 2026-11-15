FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY checkins-v2.js ./
COPY public ./public
RUN mkdir -p /app/data/vault/Daily
ENV NODE_ENV=production PORT=3000 VAULT_PATH=/app/data/vault
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
VOLUME ["/app/data/vault"]
CMD ["npm","start"]