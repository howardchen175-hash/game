FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Optional build-only CA for corporate/cloud HTTPS proxies. TLS verification stays enabled.
RUN --mount=type=secret,id=build_ca set -eu; \
    if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci --cache /tmp/npm-cache; rm -rf /tmp/npm-cache
COPY . .
RUN npm run build && chown -R node:node /app
USER node
ENV PORT=3001
EXPOSE 3001
CMD ["sh", "-c", "npm run db:migrate && npm start"]
