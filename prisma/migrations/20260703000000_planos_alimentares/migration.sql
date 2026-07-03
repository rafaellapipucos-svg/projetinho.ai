-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 4 — Planos alimentares: meal_plans → plan_days → plan_meals →
-- meal_options → meal_items (+ metas por nutriente) + CHECK XOR + RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('draft', 'active', 'archived');

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "organization_id" UUID NOT NULL,
    "patient_id" UUID,
    "name" TEXT NOT NULL,
    "status" "plan_status" NOT NULL DEFAULT 'draft',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "nutritional_snapshot" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_nutrient_targets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "meal_plan_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "target_min" DECIMAL(12,4),
    "target_max" DECIMAL(12,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_nutrient_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_days" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "meal_plan_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_meals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "plan_day_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "custom_name" TEXT,
    "scheduled_time" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plan_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_options" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "plan_meal_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "meal_option_id" UUID NOT NULL,
    "food_id" UUID,
    "recipe_id" UUID,
    "quantity" DECIMAL(10,2) NOT NULL,
    "measurement_unit_id" UUID,
    "food_measure_id" UUID,
    "resolved_grams" DECIMAL(10,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_plans_organization_id_status_idx" ON "meal_plans"("organization_id", "status");

-- CreateIndex
CREATE INDEX "meal_plans_patient_id_idx" ON "meal_plans"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_nutrient_targets_meal_plan_id_nutrient_id_key" ON "plan_nutrient_targets"("meal_plan_id", "nutrient_id");

-- CreateIndex
CREATE INDEX "plan_days_meal_plan_id_idx" ON "plan_days"("meal_plan_id");

-- CreateIndex
CREATE INDEX "plan_meals_plan_day_id_idx" ON "plan_meals"("plan_day_id");

-- CreateIndex
CREATE INDEX "meal_options_plan_meal_id_idx" ON "meal_options"("plan_meal_id");

-- CreateIndex
CREATE INDEX "meal_items_meal_option_id_idx" ON "meal_items"("meal_option_id");

-- CreateIndex
CREATE INDEX "meal_items_food_id_idx" ON "meal_items"("food_id");

-- CreateIndex
CREATE INDEX "meal_items_recipe_id_idx" ON "meal_items"("recipe_id");

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_nutrient_targets" ADD CONSTRAINT "plan_nutrient_targets_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_nutrient_targets" ADD CONSTRAINT "plan_nutrient_targets_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_meals" ADD CONSTRAINT "plan_meals_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_meals" ADD CONSTRAINT "plan_meals_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_options" ADD CONSTRAINT "meal_options_plan_meal_id_fkey" FOREIGN KEY ("plan_meal_id") REFERENCES "plan_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_option_id_fkey" FOREIGN KEY ("meal_option_id") REFERENCES "meal_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Item referencia exatamente UM entre alimento e receita
ALTER TABLE "meal_items"
  ADD CONSTRAINT "meal_items_food_xor_recipe"
  CHECK (("food_id" IS NULL) <> ("recipe_id" IS NULL));

-- Segunda muralha (§8): RLS deny-all nas tabelas novas
ALTER TABLE "meal_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_nutrient_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_meals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_items" ENABLE ROW LEVEL SECURITY;
