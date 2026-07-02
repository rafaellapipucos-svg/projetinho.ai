-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 1 — Catálogos globais (Regra Enum vs Catálogo, docs/ARQUITETURA.md §3.1)
-- nutrient_groups, nutrients, measurement_units, food_categories, food_sources,
-- meal_types, calculation_methods, measurement_types, exam_types
-- + RLS deny-all em TODAS as tabelas do app (segunda muralha, §8).
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('mass', 'volume', 'unit');

-- CreateEnum
CREATE TYPE "calculation_kind" AS ENUM ('energy_expenditure', 'body_composition', 'activity_factor');

-- CreateEnum
CREATE TYPE "measurement_group" AS ENUM ('basic', 'skinfold', 'circumference', 'bioimpedance');

-- CreateTable
CREATE TABLE "nutrient_groups" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nutrient_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "nutrient_group_id" UUID NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "is_core" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "nutrients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "type" "unit_type" NOT NULL,
    "grams_per_unit" DECIMAL(12,4),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_sources" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "license_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "default_time" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_methods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "kind" "calculation_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "params" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calculation_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "group" "measurement_group" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "measurement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "reference_range" JSONB NOT NULL DEFAULT '{}',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nutrient_groups_name_key" ON "nutrient_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "nutrients_key_key" ON "nutrients"("key");

-- CreateIndex
CREATE INDEX "nutrients_nutrient_group_id_idx" ON "nutrients"("nutrient_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_key_key" ON "measurement_units"("key");

-- CreateIndex
CREATE UNIQUE INDEX "food_categories_organization_id_name_key" ON "food_categories"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "food_sources_key_key" ON "food_sources"("key");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_organization_id_name_key" ON "meal_types"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_methods_key_key" ON "calculation_methods"("key");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_types_key_key" ON "measurement_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "exam_types_organization_id_name_key" ON "exam_types"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "nutrients" ADD CONSTRAINT "nutrients_nutrient_group_id_fkey" FOREIGN KEY ("nutrient_group_id") REFERENCES "nutrient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_categories" ADD CONSTRAINT "food_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_types" ADD CONSTRAINT "meal_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_types" ADD CONSTRAINT "exam_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Segunda muralha (§8): RLS ligado SEM policies = nega tudo para os papéis
-- anon/authenticated do Data API (PostgREST) do Supabase. O app conecta como
-- dono das tabelas (postgres), que não é afetado por RLS sem FORCE.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nutrient_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nutrients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculation_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "measurement_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_types" ENABLE ROW LEVEL SECURITY;
