-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 3 — Pacientes e anexos: patients, attachments + bucket privado no
-- Storage com policies por organização (via is_org_member) + RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "attachment_owner" AS ENUM ('patient');

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "assigned_to_id" UUID,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "birth_date" DATE,
    "sex" "sex",
    "gender_identity" TEXT,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "occupation" TEXT,
    "notes" TEXT,
    "consent_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "owner_type" "attachment_owner" NOT NULL,
    "owner_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patients_organization_id_name_normalized_idx" ON "patients"("organization_id", "name_normalized");

-- CreateIndex
CREATE INDEX "patients_assigned_to_id_idx" ON "patients"("assigned_to_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_organization_id_user_id_key" ON "patients"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_path_key" ON "attachments"("storage_path");

-- CreateIndex
CREATE INDEX "attachments_organization_id_owner_type_owner_id_idx" ON "attachments"("organization_id", "owner_type", "owner_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- RLS deny-all (Data API) nas tabelas novas
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;

-- Checagem de vínculo do usuário logado (auth.uid) com a organização.
-- SECURITY DEFINER: as policies de Storage rodam como o papel authenticated,
-- que não enxerga as tabelas do app (RLS deny-all) — esta função é a ponte.
CREATE OR REPLACE FUNCTION public.is_org_member(org uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE u.auth_id = auth.uid()
      AND om.organization_id = org
      AND om.status = 'active'
  );
$$;

-- Bucket privado de anexos + policies por organização.
-- Caminho convencionado: org/<organization_id>/... (1º segmento = org).
-- Guardado por DO: bancos sem os schemas do Supabase (shadow db) ignoram.
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('attachments', 'attachments', false)
    ON CONFLICT (id) DO NOTHING;

    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_select" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_select" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = ''attachments'' AND public.is_org_member(((storage.foldername(name))[2])::uuid))';

    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_insert" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''attachments'' AND public.is_org_member(((storage.foldername(name))[2])::uuid))';

    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_delete" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = ''attachments'' AND public.is_org_member(((storage.foldername(name))[2])::uuid))';
  END IF;
END
$outer$;
