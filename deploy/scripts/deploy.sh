#!/usr/bin/env bash
# Zero-downtime-ish deploy on Droplet: pull, build, migrate, PM2 reload.
# Usage (from repo root on server): bash deploy/scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.production.example and fill in production values."
  exit 1
fi

export NODE_ENV=production

echo "==> Git pull"
git pull --ff-only

echo "==> Install dependencies (production only)"
npm ci --omit=dev

echo "==> Build"
npm run build

echo "==> Database migrations"
npm run deploy:migrate

echo "==> PM2"
mkdir -p logs
if pm2 describe telegram-marketplace-api >/dev/null 2>&1; then
  pm2 reload deploy/pm2/ecosystem.config.cjs --env production --update-env
else
  pm2 start deploy/pm2/ecosystem.config.cjs --env production
fi
pm2 save

echo "==> Health"
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-3000}/health" || { echo "Health check failed"; exit 1; }
curl -fsS "http://127.0.0.1:${PORT:-3000}/health/ready" || { echo "Readiness check failed"; exit 1; }

echo "Deploy complete."
