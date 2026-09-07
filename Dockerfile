FROM node:20-bookworm-slim
WORKDIR /app
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node","server/src/index.js"]
