-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 6 — Ferramentas clínicas: avaliações antropométricas, gasto
-- energético, anamnese dinâmica e exames — resultados sempre em snapshot.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "anamnesis_question_type" AS ENUM ('text', 'number', 'boolean', 'select', 'multi', 'scale');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assessed_at" DATE NOT NULL,
    "calculation_method_id" UUID,
    "results" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_values" (
    "assessment_id" UUID NOT NULL,
    "measurement_type_id" UUID NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "assessment_values_pkey" PRIMARY KEY ("assessment_id","measurement_type_id")
);

-- CreateTable
CREATE TABLE "energy_calculations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "calculated_at" DATE NOT NULL,
    "calculation_method_id" UUID NOT NULL,
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "activity_factor" DECIMAL(4,3) NOT NULL,
    "tmb_kcal" DECIMAL(8,2) NOT NULL,
    "get_kcal" DECIMAL(8,2) NOT NULL,
    "adjustment_kcal" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "final_kcal" DECIMAL(8,2) NOT NULL,
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "energy_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnesis_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anamnesis_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnesis_questions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "template_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "anamnesis_question_type" NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anamnesis_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnesis_responses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "answered_at" DATE NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '[]',
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anamnesis_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_exams" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "collected_at" DATE NOT NULL,
    "lab_name" TEXT,
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "patient_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "patient_exam_id" UUID NOT NULL,
    "exam_type_id" UUID NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_patient_id_assessed_at_idx" ON "assessments"("patient_id", "assessed_at");

-- CreateIndex
CREATE INDEX "energy_calculations_patient_id_calculated_at_idx" ON "energy_calculations"("patient_id", "calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "anamnesis_templates_organization_id_name_key" ON "anamnesis_templates"("organization_id", "name");

-- CreateIndex
CREATE INDEX "anamnesis_questions_template_id_idx" ON "anamnesis_questions"("template_id");

-- CreateIndex
CREATE INDEX "anamnesis_responses_patient_id_answered_at_idx" ON "anamnesis_responses"("patient_id", "answered_at");

-- CreateIndex
CREATE INDEX "patient_exams_patient_id_collected_at_idx" ON "patient_exams"("patient_id", "collected_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_patient_exam_id_exam_type_id_key" ON "exam_results"("patient_exam_id", "exam_type_id");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_calculation_method_id_fkey" FOREIGN KEY ("calculation_method_id") REFERENCES "calculation_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_values" ADD CONSTRAINT "assessment_values_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_values" ADD CONSTRAINT "assessment_values_measurement_type_id_fkey" FOREIGN KEY ("measurement_type_id") REFERENCES "measurement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_calculation_method_id_fkey" FOREIGN KEY ("calculation_method_id") REFERENCES "calculation_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_templates" ADD CONSTRAINT "anamnesis_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_questions" ADD CONSTRAINT "anamnesis_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "anamnesis_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_responses" ADD CONSTRAINT "anamnesis_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_responses" ADD CONSTRAINT "anamnesis_responses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_responses" ADD CONSTRAINT "anamnesis_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "anamnesis_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_exams" ADD CONSTRAINT "patient_exams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_exams" ADD CONSTRAINT "patient_exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_patient_exam_id_fkey" FOREIGN KEY ("patient_exam_id") REFERENCES "patient_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Segunda muralha (§8): RLS deny-all nas tabelas novas
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "energy_calculations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anamnesis_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anamnesis_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anamnesis_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_results" ENABLE ROW LEVEL SECURITY;
