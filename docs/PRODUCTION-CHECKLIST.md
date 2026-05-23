# Production deployment checklist

## DigitalOcean

- [ ] Managed PostgreSQL cluster created (same region as Droplet)
- [ ] Database `telegram_marketplace` exists
- [ ] Droplet IP added to DB **Trusted sources**
- [ ] `DATABASE_URL` uses `*.db.ondigitalocean.com:25060` and `sslmode=require`
- [ ] Migrations applied: `npm run deploy:migrate`

## Droplet

- [ ] Ubuntu 22.04+, SSH keys only
- [ ] `setup-server.sh` completed (Node 20, PM2, Nginx, UFW)
- [ ] App cloned to `/var/www/ms_back`
- [ ] `.env` from `.env.production.example` (no secrets in git)
- [ ] `HOST=127.0.0.1`, `TRUST_PROXY=true`, `NODE_ENV=production`
- [ ] `deploy.sh` succeeded; `pm2 startup` + `pm2 save`

## Nginx & TLS

- [ ] `deploy/nginx/ms-api.conf` installed, domain updated
- [ ] `nginx -t` passes
- [ ] Certbot certificate issued
- [ ] `https://api.YOUR_DOMAIN/health` returns `{"status":"ok"}`
- [ ] `https://api.YOUR_DOMAIN/health/ready` shows `database: connected`

## Application secrets

- [ ] `JWT_SECRET` ≥ 32 chars, not a placeholder
- [ ] `TELEGRAM_BOT_TOKEN` matches BotFather
- [ ] `CORS_ORIGINS` = WebApp HTTPS URL
- [ ] `INTERNAL_API_KEY` set; bot sends `X-Internal-Api-Key`
- [ ] `DOCS_ENABLED=false`

## Post-deploy

- [ ] Bot sync URL points to production domain
- [ ] No `docker compose` Postgres running on server
- [ ] PM2 `online`, memory stable
- [ ] Logs directory writable: `/var/www/ms_back/logs`
