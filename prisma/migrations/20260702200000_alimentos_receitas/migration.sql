-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 2 — Banco de Alimentos: foods, food_nutrients, food_measures,
-- recipes, recipe_ingredients + busca trigram sem acento + RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "food_base_unit" AS ENUM ('g', 'ml');

-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID,
    "food_source_id" UUID NOT NULL,
    "food_category_id" UUID,
    "source_code" TEXT,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "base_qty" DECIMAL(10,2) NOT NULL DEFAULT 100,
    "base_unit" "food_base_unit" NOT NULL DEFAULT 'g',
    "energy_kcal" DECIMAL(12,4),
    "protein_g" DECIMAL(12,4),
    "carbohydrate_g" DECIMAL(12,4),
    "lipid_g" DECIMAL(12,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_nutrients" (
    "food_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "food_nutrients_pkey" PRIMARY KEY ("food_id","nutrient_id")
);

-- CreateTable
CREATE TABLE "food_measures" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "food_id" UUID NOT NULL,
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "gram_weight" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "servings" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "yield_grams" DECIMAL(10,2),
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "recipe_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "measurement_unit_id" UUID,
    "food_measure_id" UUID,
    "resolved_grams" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "foods_organization_id_idx" ON "foods"("organization_id");

-- CreateIndex
CREATE INDEX "foods_food_category_id_idx" ON "foods"("food_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "foods_food_source_id_source_code_key" ON "foods"("food_source_id", "source_code");

-- CreateIndex
CREATE INDEX "food_measures_food_id_idx" ON "food_measures"("food_id");

-- CreateIndex
CREATE INDEX "recipes_organization_id_idx" ON "recipes"("organization_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_food_id_idx" ON "recipe_ingredients"("food_id");

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_food_source_id_fkey" FOREIGN KEY ("food_source_id") REFERENCES "food_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_food_category_id_fkey" FOREIGN KEY ("food_category_id") REFERENCES "food_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_nutrients" ADD CONSTRAINT "food_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_measures" ADD CONSTRAINT "food_measures_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_measures" ADD CONSTRAINT "food_measures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Busca type-ahead: índice trigram sobre o nome normalizado (só ativos)
CREATE INDEX "foods_name_normalized_trgm_idx" ON "foods" USING GIN ("name_normalized" gin_trgm_ops) WHERE "is_active";

-- Segunda muralha (§8): RLS deny-all nas tabelas novas
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_nutrients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_measures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;
