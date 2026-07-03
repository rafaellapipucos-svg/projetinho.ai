-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 5 — Portal do Paciente: convite (invite_token), diário alimentar e
-- policies de Storage estendidas ao próprio paciente (is_patient_self).
-- ─────────────────────────────────────────────────────────────────────────────

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "invite_token" TEXT;

-- CreateTable
CREATE TABLE "food_diary_entries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "entry_at" TIMESTAMPTZ(6) NOT NULL,
    "meal_type_id" UUID,
    "description" TEXT NOT NULL,
    "photo_path" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_diary_entries_patient_id_entry_at_idx" ON "food_diary_entries"("patient_id", "entry_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_invite_token_key" ON "patients"("invite_token");

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "food_diary_entries" ENABLE ROW LEVEL SECURITY;

-- O usuário logado é o próprio paciente? (portal)
CREATE OR REPLACE FUNCTION public.is_patient_self(patient uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM patients p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = patient
      AND u.auth_id = auth.uid()
  );
$$;

-- Policies do bucket: membro da org OU o próprio paciente
-- (caminho: org/<org_id>/patients/<patient_id>/…)
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_select" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_select" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = ''attachments'' AND (
        public.is_org_member(((storage.foldername(name))[2])::uuid)
        OR public.is_patient_self(((storage.foldername(name))[4])::uuid)
      ))';

    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_insert" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''attachments'' AND (
        public.is_org_member(((storage.foldername(name))[2])::uuid)
        OR public.is_patient_self(((storage.foldername(name))[4])::uuid)
      ))';

    EXECUTE 'DROP POLICY IF EXISTS "attachments_org_delete" ON storage.objects';
    EXECUTE 'CREATE POLICY "attachments_org_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = ''attachments'' AND (
        public.is_org_member(((storage.foldername(name))[2])::uuid)
        OR public.is_patient_self(((storage.foldername(name))[4])::uuid)
      ))';
  END IF;
END
$outer$;
