#!/usr/bin/env bash
# One-time Ubuntu 22.04+ bootstrap on a DigitalOcean Droplet.
# Run as root or with sudo: bash deploy/scripts/setup-server.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

echo "==> Node.js 20"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> PM2"
npm install -g pm2

echo "==> App directory"
APP_DIR="/var/www/ms_back"
mkdir -p "$APP_DIR/logs"
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$APP_DIR" 2>/dev/null || true

echo "==> Firewall (UFW)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Done. Next:"
echo "  1) Create DigitalOcean Managed PostgreSQL and add Droplet IP to Trusted Sources"
echo "  2) Clone repo into $APP_DIR and copy .env.production.example to .env"
echo "  3) bash deploy/scripts/deploy.sh"
