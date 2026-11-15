FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY public ./public
RUN mkdir -p /app/data/vault/Daily
ENV NODE_ENV=production PORT=3000 VAULT_PATH=/app/data/vault
EXPOSE 3000
VOLUME ["/app/data/vault"]
CMD ["npm","start"]