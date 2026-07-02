-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 0 — Fundação: identidade e tenancy
-- users (espelho do Supabase Auth), roles (catálogo), organizations,
-- organization_members + função uuid_generate_v7 e trigger de espelho.
-- ─────────────────────────────────────────────────────────────────────────────

-- gen_random_bytes (usado pela geração de uuid v7)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- UUID v7 (ordenável por tempo — índices saudáveis; convenção do projeto §5.1)
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid
LANGUAGE plpgsql VOLATILE
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$;

-- CreateEnum
CREATE TYPE "member_status" AS ENUM ('active', 'invited', 'suspended');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "auth_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "member_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE INDEX "organization_members_role_id_idx" ON "organization_members"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Espelho automático auth.users → public.users.
-- Guardado por DO: em bancos sem o schema auth (ex.: shadow database do
-- Prisma), o bloco é ignorado sem erro.
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    EXECUTE $def$
      CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
      AS $body$
      BEGIN
        INSERT INTO public.users (id, auth_id, name, email, created_at, updated_at)
        VALUES (
          uuid_generate_v7(),
          NEW.id,
          COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
          COALESCE(NEW.email, ''),
          now(),
          now()
        )
        ON CONFLICT (auth_id) DO NOTHING;
        RETURN NEW;
      END
      $body$;
    $def$;
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()';
  END IF;
END
$outer$;
