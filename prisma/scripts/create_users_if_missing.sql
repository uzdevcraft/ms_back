-- Idempotent: safe when DB already has other tables (e.g. telegram_users).
-- Run: npx prisma db execute --file prisma/scripts/create_users_if_missing.sql --schema prisma/schema.prisma

DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "telegram_id" BIGINT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT,
  "username" TEXT,
  "language_code" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER'::"Role",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_key" ON "users" ("telegram_id");
