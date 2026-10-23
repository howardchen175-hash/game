#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "${DATABASE_URL:-}" ]; then
  echo 'Using the externally configured DATABASE_URL; no local container changes.'
  exit 0
fi
mkdir -p .local
if [ ! -f .env ]; then
  node --input-type=module <<'JS'
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const password=randomBytes(24).toString('hex');
writeFileSync('.env', `DATABASE_URL=postgres://colony:${password}@127.0.0.1:54329/colony\nBETTER_AUTH_SECRET=${randomBytes(48).toString('hex')}\nAPP_ORIGIN=http://localhost:5173\nPORT=3001\nNODE_ENV=development\n`, {mode:0o600,flag:'wx'});
writeFileSync('.local/postgres.env', `POSTGRES_USER=colony\nPOSTGRES_PASSWORD=${password}\nPOSTGRES_DB=colony\n`, {mode:0o600,flag:'wx'});
JS
fi
if [ ! -f .local/postgres.env ]; then
  echo 'Existing .env detected; using your DATABASE_URL. No local container configuration was generated.'
  exit 0
fi
if docker container inspect cosmic-colony-db >/dev/null 2>&1; then
  docker start cosmic-colony-db >/dev/null
else
  docker run -d --name cosmic-colony-db --env-file .local/postgres.env -p 127.0.0.1:54329:5432 -v cosmic-colony-pg:/var/lib/postgresql/data postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb >/dev/null
fi
for attempt in {1..30}; do
  if docker exec cosmic-colony-db pg_isready -U colony -d colony >/dev/null 2>&1; then
    echo 'PostgreSQL ready on 127.0.0.1:54329'; exit 0
  fi
  sleep 1
done
echo 'PostgreSQL did not become ready' >&2
exit 1
