#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo 'Please install and open Docker Desktop first: https://www.docker.com/products/docker-desktop/' >&2
  exit 1
fi
if [ "${1:-}" = '--stop' ]; then
  if [ ! -f .env.play ]; then echo 'There is no local game to stop.'; exit 0; fi
  docker compose --project-name cosmic-colony-play --env-file .env.play -f compose.play.yml stop
  echo 'Game stopped. Your accounts and saves are kept.'
  exit 0
fi
if [ ! -f .env.play ]; then
  # Generate on the user's machine without requiring Node/Python on that machine.
  # Docker validates the official image layers before executing it.
  play_secret_tmp=$(mktemp .env.play.tmp.XXXXXX)
  trap 'rm -f "$play_secret_tmp"' EXIT
  docker run --rm node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 node --input-type=module -e 'import {randomBytes} from "node:crypto"; console.log(`PLAY_DB_PASSWORD=${randomBytes(48).toString("hex")}\nPLAY_AUTH_SECRET=${randomBytes(48).toString("hex")}`)' > "$play_secret_tmp"
  test -s "$play_secret_tmp"
  ln "$play_secret_tmp" .env.play
  rm -f "$play_secret_tmp"
  trap - EXIT
fi
if ! [ -s .env.play ]; then echo '.env.play is empty. Preserve any previous configuration and recreate this empty file before retrying.' >&2; exit 1; fi
printf '%s\n' 'Starting Cosmic Colony. The first run downloads and builds the game; please keep this window open.'
docker compose --project-name cosmic-colony-play --env-file .env.play -f compose.play.yml up --build --detach --wait --wait-timeout 180
printf '%s\n' 'Ready! On this computer, open http://localhost:8080 in your browser.' 'Register an account, create a save, then explore.' 'To stop without deleting saves: bash play.sh --stop'
if [ "$(uname -s)" = Darwin ] && command -v open >/dev/null 2>&1; then open 'http://localhost:8080' || true;
elif command -v xdg-open >/dev/null 2>&1; then xdg-open 'http://localhost:8080' >/dev/null 2>&1 || true; fi
