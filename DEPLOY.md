# Production deployment — DigitalOcean Droplet + Managed PostgreSQL

Target architecture:

```
Client → Nginx (HTTPS) → Node.js API (PM2) → DigitalOcean Managed PostgreSQL
```

PostgreSQL **does not** run in Docker on the server. Docker Compose in this repo is **local development only**.

---

## Why this architecture?

| Decision | Why |
|----------|-----|
| **Managed PostgreSQL** | Backups, patches, HA, and ops handled by DigitalOcean. Your API server can be replaced without losing data. |
| **No Postgres on Droplet** | Avoids disk/memory contention with the API and duplicate backup responsibility. |
| **PM2 on Droplet** | Simple process supervision, auto-restart, logs, zero container overhead for a single API. |
| **Nginx in front** | TLS termination, HTTP/2, security headers, rate-friendly proxying; Node listens on `127.0.0.1` only. |
| **`HOST=127.0.0.1` in prod** | API not exposed directly to the internet; only Nginx is public. |
| **Migrations in `deploy.sh`** | Schema changes run once per deploy, not on every PM2 restart (faster, safer restarts). |
| **`/health` vs `/health/ready`** | Nginx/load checks liveness without DB; readiness verifies Managed Postgres connectivity. |
| **`localhost` forbidden in prod** | On the server, `localhost` is the Droplet itself, not your Mac and not Managed DB — a common production misconfiguration. |

---

## Development vs production

| | Development (Mac) | Production (Droplet) |
|--|-------------------|----------------------|
| Database | Docker Postgres `localhost:5433` | DigitalOcean Managed PG (`*.db.ondigitalocean.com:25060`) |
| API run | `pnpm dev` | PM2 → `node dist/server.js` |
| Env file | `.env` from `.env.development.example` | `.env` from `.env.production.example` |
| Docker Compose | `npm run compose:db` | **Do not run** on server |
| CORS | Open if `CORS_ORIGINS` empty | Must list WebApp origin(s) |
| Internal API | No key required | `X-Internal-Api-Key` header required |
| Docs (`/docs`) | Enabled by default | `DOCS_ENABLED=false` |

---

## Recommended folder structure

```
ms_back/
├── deploy/
│   ├── nginx/ms-api.conf      # Nginx site config
│   ├── pm2/ecosystem.config.cjs
│   └── scripts/
│       ├── setup-server.sh    # One-time Droplet bootstrap
│       └── deploy.sh          # git pull → build → migrate → pm2 reload
├── docs/PRODUCTION-CHECKLIST.md
├── docker-compose.yml         # LOCAL dev Postgres only
├── Dockerfile                 # Optional CI image; not used on Droplet deploy path
├── logs/                      # PM2 logs (gitignored contents)
├── prisma/
└── src/
```

---

## Step 1 — DigitalOcean Managed PostgreSQL

1. **Databases → Create Database Cluster** → PostgreSQL 16, same region as Droplet.
2. Create database: `telegram_marketplace`.
3. **Connection details** → copy URI (port **25060**, user `doadmin`).
4. **Trusted sources** → add your **Droplet IP** (or VPC if both in same VPC).
5. Build `DATABASE_URL`:

```text
postgresql://doadmin:PASSWORD@db-postgresql-fra1-xxxxx.db.ondigitalocean.com:25060/telegram_marketplace?sslmode=require
```

**Why `sslmode=require`?** DigitalOcean rejects non-SSL connections; Prisma must match.

### Migrations (first time, from Mac or Droplet)

```bash
export DATABASE_URL="postgresql://..."
npm ci
npm run deploy:migrate
```

---

## Step 2 — Create Droplet

- Ubuntu 22.04 LTS, min **1 GB RAM** (2 GB recommended).
- SSH key authentication.
- Same region as database when possible (lower latency).

---

## Step 3 — One-time server setup

SSH into Droplet:

```bash
git clone https://github.com/YOUR_USER/ms_back.git /var/www/ms_back
cd /var/www/ms_back
bash deploy/scripts/setup-server.sh
```

Installs: Node 20, PM2, Nginx, Certbot, UFW (SSH + Nginx allowed).

---

## Step 4 — Production environment

```bash
cd /var/www/ms_back
cp .env.production.example .env
nano .env
```

Required values:

- `DATABASE_URL` — Managed PG URI (not localhost)
- `TELEGRAM_BOT_TOKEN`, `JWT_SECRET` (32+ random chars)
- `CORS_ORIGINS` — WebApp HTTPS origin
- `INTERNAL_API_KEY` — random string; bot sends `X-Internal-Api-Key`
- `TRUST_PROXY=true`, `HOST=127.0.0.1`, `DOCS_ENABLED=false`

Generate secrets:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 24   # INTERNAL_API_KEY
```

---

## Step 5 — First deploy

```bash
cd /var/www/ms_back
bash deploy/scripts/deploy.sh
pm2 startup    # follow printed command, then:
pm2 save
```

---

## Step 6 — Nginx + SSL

```bash
sudo cp /var/www/ms_back/deploy/nginx/ms-api.conf /etc/nginx/sites-available/ms-api
sudo nano /etc/nginx/sites-available/ms-api   # replace api.example.com
sudo ln -sf /etc/nginx/sites-available/ms-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
```

Verify:

```bash
curl https://api.example.com/health
curl https://api.example.com/health/ready
```

---

## Step 7 — Bot configuration

- URL: `https://api.example.com/api/v1/internal/users/sync`
- Header: `X-Internal-Api-Key: <INTERNAL_API_KEY from .env>`

---

## Git pull / update workflow

On the Droplet after every merge to `main`:

```bash
cd /var/www/ms_back
bash deploy/scripts/deploy.sh
```

This runs: `git pull` → `npm ci --omit=dev` → `npm run build` → `prisma migrate deploy` → `pm2 reload`.

---

## Security summary

- Env validation fails on startup if production uses localhost DB or missing CORS/SSL/internal key.
- Helmet + HSTS (production), rate limiting (`RATE_LIMIT_MAX`), CORS allowlist.
- Internal routes protected by `INTERNAL_API_KEY` in production.
- `.env` never committed; secrets only on server.
- UFW: only SSH (22) and Nginx (80/443).

---

## Monitoring & debugging

| Task | Command |
|------|---------|
| PM2 status | `pm2 status` |
| Live logs | `pm2 logs telegram-marketplace-api` |
| Log files | `tail -f /var/www/ms_back/logs/out.log` |
| Nginx access | `sudo tail -f /var/log/nginx/access.log` |
| Readiness | `curl -s http://127.0.0.1:3000/health/ready` |
| DB firewall | DO dashboard → DB → Trusted sources |

**Why PM2?** Restarts crashed processes, survives reboots (with `pm2 startup`), centralizes logs.

---

## Docker on the server?

- **Do not** run `docker compose up` for production (dev Postgres only).
- Old `api` containers: `docker ps` → `docker stop` if port 3000 is taken.
- `Dockerfile` is for optional container CI/smoke tests, not the recommended Droplet path.

---

## Optional: production smoke test via Docker

```bash
docker build -t ms-api .
docker run --rm -p 3000:3000 --env-file .env ms-api
```

Use only with a valid production `DATABASE_URL` pointing at Managed PG.

---

See also: [docs/PRODUCTION-CHECKLIST.md](docs/PRODUCTION-CHECKLIST.md)
