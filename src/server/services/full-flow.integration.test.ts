import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Verificação end-to-end de TODAS as funcionalidades contra o banco real:
 * um fluxo completo de clínica (alimento → receita → paciente → plano →
 * clínico → agenda/documentos → financeiro → portal → export), passando
 * pelos services de producao. Garante que nada estoura em uso combinado.
 *
 * Gate por DIRECT_URL (só o .env local o define): roda no local, pula no CI.
 */
const hasDatabase = Boolean(process.env.DIRECT_URL);

describe.runIf(hasDatabase)("fluxo completo — todas as funcionalidades", () => {
  let prisma: typeof import("../db").prisma;
  let foodService: typeof import("./food-service").foodService;
  let recipeService: typeof import("./recipe-service").recipeService;
  let patientService: typeof import("./patient-service").patientService;
  let planService: typeof import("./plan-service").planService;
  let clinicalService: typeof import("./clinical-service").clinicalService;
  let operationsService: typeof import("./operations-service").operationsService;
  let equivalenceService: typeof import("./equivalence-service").equivalenceService;
  let financeService: typeof import("./finance-service").financeService;
  let dashboardService: typeof import("./dashboard-service").dashboardService;
  let exportService: typeof import("./export-service").exportService;
  let portalService: typeof import("./portal-service").portalService;

  let orgId: string;
  let userId: string;
  let patientUserId: string;
  let patientId: string;
  let gramUnitId: string;

  beforeAll(async () => {
    ({ prisma } = await import("../db"));
    ({ foodService } = await import("./food-service"));
    ({ recipeService } = await import("./recipe-service"));
    ({ patientService } = await import("./patient-service"));
    ({ planService } = await import("./plan-service"));
    ({ clinicalService } = await import("./clinical-service"));
    ({ operationsService } = await import("./operations-service"));
    ({ equivalenceService } = await import("./equivalence-service"));
    ({ financeService } = await import("./finance-service"));
    ({ dashboardService } = await import("./dashboard-service"));
    ({ exportService } = await import("./export-service"));
    ({ portalService } = await import("./portal-service"));

    const stamp = Date.now().toString(36);
    const [pro, patientUser] = await Promise.all([
      prisma.user.create({
        data: {
          authId: crypto.randomUUID(),
          email: `flow-pro-${stamp}@example.com`,
          name: "Nutri Fluxo",
        },
      }),
      prisma.user.create({
        data: {
          authId: crypto.randomUUID(),
          email: `flow-paciente-${stamp}@example.com`,
          name: "Paciente Fluxo",
        },
      }),
    ]);
    userId = pro.id;
    patientUserId = patientUser.id;
    const org = await prisma.organization.create({
      data: { name: "Org Fluxo Teste", slug: `org-fluxo-${stamp}` },
    });
    orgId = org.id;
    const gram = await prisma.measurementUnit.findUniqueOrThrow({
      where: { key: "g" },
    });
    gramUnitId = gram.id;
  });

  afterAll(async () => {
    // Limpeza em ordem segura de dependências (FKs restrict)
    await prisma.message.deleteMany({ where: { organizationId: orgId } });
    await prisma.document.deleteMany({ where: { organizationId: orgId } });
    await prisma.payment.deleteMany({ where: { organizationId: orgId } });
    await prisma.appointment.deleteMany({ where: { organizationId: orgId } });
    await prisma.service.deleteMany({ where: { organizationId: orgId } });
    await prisma.anamnesisResponse.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.patientExam.deleteMany({ where: { organizationId: orgId } });
    await prisma.energyCalculation.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.assessment.deleteMany({ where: { organizationId: orgId } });
    await prisma.foodDiaryEntry.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.mealPlan.deleteMany({ where: { organizationId: orgId } });
    await prisma.equivalenceGroup.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.recipe.deleteMany({ where: { organizationId: orgId } });
    await prisma.food.deleteMany({ where: { organizationId: orgId } });
    await prisma.patient.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, patientUserId] } },
    });
    await prisma.$disconnect();
  });

  it("Alimentos: cria alimento próprio com nutrientes e o encontra na busca", async () => {
    const created = await foodService.create(orgId, userId, {
      name: "Shake Proteico Fluxo",
      foodCategoryId: null,
      baseUnit: "g",
      nutrients: [
        { key: "energy_kcal", amount: 380 },
        { key: "protein_g", amount: 70 },
        { key: "carbohydrate_g", amount: 10 },
        { key: "lipid_g", amount: 5 },
      ],
    });
    expect(created.id).toBeTruthy();

    const results = await foodService.search(orgId, "shake proteico");
    expect(results.some((food) => food.id === created.id)).toBe(true);

    const detail = await foodService.byId(orgId, created.id);
    expect(detail.nutrients.find((n) => n.key === "protein_g")?.amount).toBe(
      70,
    );
  });

  it("Receitas: cria receita e calcula nutrição agregada por porção", async () => {
    const [arroz] = await foodService.search(orgId, "arroz");
    expect(arroz).toBeTruthy();
    const recipe = await recipeService.create(orgId, userId, {
      name: "Prato Fluxo",
      servings: 2,
      yieldGrams: null,
      instructions: "Misturar tudo.",
      ingredients: [
        {
          foodId: arroz!.id,
          quantity: 200,
          measurementUnitId: gramUnitId,
          foodMeasureId: null,
        },
      ],
    });
    const detail = await recipeService.byId(orgId, recipe.id);
    expect(detail.nutrition.perServing.energy_kcal).toBeGreaterThan(0);
  });

  it("Pacientes: cria paciente com consentimento", async () => {
    const patient = await patientService.create(orgId, userId, {
      name: "Paciente Fluxo",
      birthDate: "1992-03-15",
      sex: "male",
      genderIdentity: null,
      cpf: null,
      email: `flow-paciente-contato@example.com`,
      phone: "11999990000",
      occupation: "Analista",
      notes: null,
      consent: true,
    });
    patientId = patient.id;
    const detail = await patientService.byId(orgId, patientId);
    expect(detail.consentAt).not.toBeNull();
  });

  it("Planos: cria, adiciona item, define meta, ativa (snapshot) e imprime", async () => {
    const plan = await planService.create(orgId, userId, {
      name: "Plano Fluxo",
      patientId,
      isTemplate: false,
      fromTemplateId: null,
    });
    let graph = await planService.get(orgId, plan.id);
    const firstOption = graph.options[0];
    const arroz = (await foodService.search(orgId, "arroz"))[0]!;
    expect(firstOption).toBeTruthy();

    const applied = await planService.applyChanges(orgId, {
      planId: plan.id,
      version: graph.plan.version,
      changes: [
        {
          type: "item_add",
          id: crypto.randomUUID(),
          optionId: firstOption!.id,
          foodId: arroz.id,
          recipeId: null,
          quantity: 150,
          measurementUnitId: gramUnitId,
          foodMeasureId: null,
          sortOrder: 0,
          notes: null,
        },
      ],
    });
    expect(applied.version).toBe(graph.plan.version + 1);
    // O total do dia foi recalculado no servidor com o motor
    const dayId = graph.days[0]!.id;
    expect(applied.dayTotals[dayId]?.energy_kcal).toBeGreaterThan(0);

    // Meta de energia + ativação com snapshot congelado
    await planService.applyEnergyTarget(orgId, plan.id, 2000);
    const activated = await planService.activate(orgId, plan.id);
    expect(activated.version).toBeGreaterThan(0);

    graph = await planService.get(orgId, plan.id);
    expect(graph.plan.status).toBe("active");
    const snapshotPlan = await prisma.mealPlan.findUniqueOrThrow({
      where: { id: plan.id },
    });
    expect(snapshotPlan.nutritionalSnapshot).not.toBeNull();
  });

  it("Clínico: antropometria, GET→meta, anamnese e exame", async () => {
    const types = await prisma.measurementType.findMany();
    const idByKey = new Map(types.map((t) => [t.key, t.id]));
    const assessment = await clinicalService.assessments.create(orgId, userId, {
      patientId,
      assessedAt: "2026-07-01",
      methodKey: "jackson_pollock_7",
      conversion: "siri",
      values: [
        { measurementTypeId: idByKey.get("weight")!, value: 80 },
        { measurementTypeId: idByKey.get("height")!, value: 178 },
        { measurementTypeId: idByKey.get("sf_chest")!, value: 12 },
        { measurementTypeId: idByKey.get("sf_midaxillary")!, value: 12 },
        { measurementTypeId: idByKey.get("sf_triceps")!, value: 10 },
        { measurementTypeId: idByKey.get("sf_subscapular")!, value: 14 },
        { measurementTypeId: idByKey.get("sf_abdominal")!, value: 20 },
        { measurementTypeId: idByKey.get("sf_suprailiac")!, value: 16 },
        { measurementTypeId: idByKey.get("sf_thigh")!, value: 12 },
      ],
      notes: null,
    });
    expect(assessment.results.bmi).toBeCloseTo(25.25, 1);
    expect(assessment.results.bodyFatPct).toBeGreaterThan(0);

    const energy = await clinicalService.energy.create(orgId, userId, {
      patientId,
      calculatedAt: "2026-07-01",
      methodKey: "mifflin_1990",
      weightKg: 80,
      heightCm: 178,
      leanMassKg: null,
      activityFactorKey: "af_moderate",
      adjustmentKcal: 0,
      notes: null,
    });
    expect(energy.finalKcal).toBeGreaterThan(1500);

    const template = await prisma.anamnesisTemplate.findFirstOrThrow({
      where: { organizationId: null },
      include: { questions: true },
    });
    const anamnesis = await clinicalService.anamnesis.respond(orgId, userId, {
      patientId,
      templateId: template.id,
      answeredAt: "2026-07-01",
      answers: [
        { questionId: template.questions[0]!.id, answer: "Ganho de massa" },
      ],
    });
    expect(anamnesis.id).toBeTruthy();

    const examType = await prisma.examType.findFirstOrThrow({
      where: { organizationId: null },
    });
    const exam = await clinicalService.exams.create(orgId, userId, {
      patientId,
      collectedAt: "2026-07-01",
      labName: "Lab Fluxo",
      notes: null,
      results: [{ examTypeId: examType.id, value: 95 }],
    });
    expect(exam.id).toBeTruthy();
  });

  it("Operação: serviço, consulta, documento com merge-fields e chat", async () => {
    const service = await operationsService.services.create(orgId, {
      name: "Consulta Fluxo",
      durationMinutes: 60,
      priceCents: 20000,
    });
    expect(service.id).toBeTruthy();

    const appointment = await operationsService.appointments.create(
      orgId,
      userId,
      {
        patientId,
        serviceId: service.id,
        startsAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        durationMinutes: 60,
        notes: null,
      },
    );
    expect(appointment.id).toBeTruthy();

    const doc = await operationsService.documents.issue(
      orgId,
      userId,
      "Nutri Fluxo",
      {
        patientId,
        templateId: null,
        title: "Orientação",
        body: "Paciente: {{paciente.nome}} — Clínica: {{clinica.nome}}",
        issuedAt: "2026-07-01",
      },
    );
    const stored = await operationsService.documents.byId(orgId, doc.id);
    // merge-fields renderizados no servidor (sem placeholder cru)
    expect(stored.body).toContain("Paciente Fluxo");
    expect(stored.body).not.toContain("{{");

    await operationsService.messages.send(orgId, patientId, userId, "Olá!");
    const chat = await operationsService.messages.list(
      orgId,
      patientId,
      userId,
    );
    expect(chat.at(-1)?.body).toBe("Olá!");
  });

  it("Substituições: lista de equivalência com gramas resolvidos", async () => {
    const arroz = (await foodService.search(orgId, "arroz"))[0]!;
    const group = await equivalenceService.save(orgId, {
      id: null,
      name: "Trocas de carboidrato",
      items: [
        {
          foodId: arroz.id,
          quantity: 100,
          measurementUnitId: gramUnitId,
          foodMeasureId: null,
        },
      ],
    });
    const list = await equivalenceService.list(orgId);
    expect(list.find((g) => g.id === group.id)?.items[0]?.resolvedGrams).toBe(
      100,
    );
  });

  it("Financeiro + Dashboard: pagamento pago soma nos totais e no resumo", async () => {
    await financeService.create(orgId, userId, {
      patientId,
      appointmentId: null,
      description: "Consulta Fluxo",
      amountReais: 200,
      method: "pix",
      status: "paid",
      dueAt: null,
      paidAt: "2026-07-01",
    });
    const totals = await financeService.totals(orgId);
    expect(totals.paidReais).toBeGreaterThanOrEqual(200);

    const summary = await dashboardService.summary(orgId);
    expect(summary.patientCount).toBeGreaterThanOrEqual(1);
    expect(summary.activePlanCount).toBeGreaterThanOrEqual(1);
    expect(summary.paidReais).toBeGreaterThanOrEqual(200);
  });

  it("Portal + LGPD: convite vincula, diário registra, plano ativo aparece, export coleta tudo", async () => {
    const invite = await patientService.portalAccess.generateInvite(
      orgId,
      patientId,
    );
    const claim = await portalService.claimInvite(patientUserId, invite.token);
    expect(claim.patientName).toBe("Paciente Fluxo");

    const profile = {
      patientId,
      patientName: "Paciente Fluxo",
      organizationId: orgId,
      organizationName: "Org Fluxo Teste",
    };
    await portalService.diary.add(profile, patientUserId, {
      entryAt: new Date().toISOString(),
      mealTypeId: null,
      description: "Almoço do fluxo",
      photoPath: null,
    });
    const active = await portalService.activePlan(profile);
    expect(active?.plan.status).toBe("active");

    const exported = await exportService.patientData(orgId, patientId);
    expect(exported.patient.id).toBe(patientId);
    expect(exported.mealPlans.length).toBeGreaterThanOrEqual(1);
    expect(exported.documents.length).toBeGreaterThanOrEqual(1);
    expect(exported.payments.length).toBeGreaterThanOrEqual(1);
  });
});
