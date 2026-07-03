import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Aceite da Fase 6: resultados clínicos conferem com o motor e snapshots
 * são IMUTÁVEIS — alterar coeficientes do catálogo ou o texto de perguntas
 * do modelo não reescreve registros históricos (Regra do Snapshot §3.3).
 */
// Gate por DIRECT_URL (só o .env local o define). O CI de qualidade injeta
// um DATABASE_URL sintético para o build, mas nunca DIRECT_URL — então a
// suíte de integração roda no local (Supabase real) e pula no CI.
const hasDatabase = Boolean(process.env.DIRECT_URL);

describe.runIf(hasDatabase)("ferramentas clínicas — cálculo e snapshot", () => {
  let prisma: typeof import("../db").prisma;
  let clinicalService: typeof import("./clinical-service").clinicalService;
  let patientService: typeof import("./patient-service").patientService;

  let orgId: string;
  let userId: string;
  let patientId: string;
  let jp3OriginalParams: unknown;
  let templateId: string;
  let firstQuestionId: string;
  let firstQuestionPrompt: string;

  beforeAll(async () => {
    ({ prisma } = await import("../db"));
    ({ clinicalService } = await import("./clinical-service"));
    ({ patientService } = await import("./patient-service"));

    const stamp = Date.now().toString(36);
    const user = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        email: `clinico-${stamp}@example.com`,
        name: "Nutri Clínica",
      },
    });
    userId = user.id;
    const org = await prisma.organization.create({
      data: { name: "Org Clínica Teste", slug: `org-clinica-${stamp}` },
    });
    orgId = org.id;

    const patient = await patientService.create(orgId, userId, {
      name: "Paciente Clínico",
      birthDate: "1990-05-10",
      sex: "female",
      genderIdentity: null,
      cpf: null,
      email: null,
      phone: null,
      occupation: null,
      notes: null,
      consent: true,
    });
    patientId = patient.id;

    const jp3 = await prisma.calculationMethod.findUnique({
      where: { key: "jackson_pollock_3" },
    });
    jp3OriginalParams = jp3?.params;

    const template = await prisma.anamnesisTemplate.findFirstOrThrow({
      where: { organizationId: null, name: "Anamnese padrão" },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    templateId = template.id;
    firstQuestionId = template.questions[0]?.id ?? "";
    firstQuestionPrompt = template.questions[0]?.prompt ?? "";
  });

  afterAll(async () => {
    // Restaura os coeficientes originais do catálogo
    if (jp3OriginalParams) {
      await prisma.calculationMethod.update({
        where: { key: "jackson_pollock_3" },
        data: { params: jp3OriginalParams as object },
      });
    }
    await prisma.anamnesisResponse.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.energyCalculation.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.assessment.deleteMany({ where: { organizationId: orgId } });
    await prisma.patient.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("avaliação JP3 calcula com os params do catálogo e congela o resultado", async () => {
    const types = await prisma.measurementType.findMany();
    const idByKey = new Map(types.map((type) => [type.key, type.id]));
    const valueFor = (key: string, value: number) => ({
      measurementTypeId: idByKey.get(key) ?? "",
      value,
    });

    const created = await clinicalService.assessments.create(orgId, userId, {
      patientId,
      assessedAt: "2026-07-01",
      methodKey: "jackson_pollock_3",
      conversion: "siri",
      values: [
        valueFor("weight", 62),
        valueFor("height", 165),
        valueFor("sf_triceps", 20),
        valueFor("sf_suprailiac", 18),
        valueFor("sf_thigh", 22),
      ],
      notes: null,
    });

    expect(created.results.bmi).toBeCloseTo(22.77, 1);
    expect(created.results.bodyFatPct).toBeGreaterThan(15);
    expect(created.results.bodyFatPct).toBeLessThan(40);
    const frozenBodyFat = created.results.bodyFatPct;

    // Sabota os coeficientes do catálogo…
    await prisma.calculationMethod.update({
      where: { key: "jackson_pollock_3" },
      data: {
        params: {
          male: { c0: 1, c1: 0, c2: 0, cAge: 0 },
          female: { c0: 1, c1: 0, c2: 0, cAge: 0 },
        },
      },
    });

    // …e o registro histórico permanece intacto (snapshot)
    const list = await clinicalService.assessments.list(orgId, patientId);
    expect(list[0]?.results.bodyFatPct).toBe(frozenBodyFat);
  });

  it("GET Mifflin confere com o motor (mulher, 36 anos, 62 kg, 165 cm)", async () => {
    const created = await clinicalService.energy.create(orgId, userId, {
      patientId,
      calculatedAt: "2026-07-01",
      methodKey: "mifflin_1990",
      weightKg: 62,
      heightCm: 165,
      leanMassKg: null,
      activityFactorKey: "af_moderate",
      adjustmentKcal: -300,
      notes: null,
    });
    // TMB = 10×62 + 6,25×165 − 5×36 − 161 = 1310,25 · GET = ×1,55 · meta −300
    expect(created.finalKcal).toBeCloseTo(1310.25 * 1.55 - 300, 1);
  });

  it("anamnese guarda CÓPIA das perguntas — editar o modelo não muda respostas", async () => {
    await clinicalService.anamnesis.respond(orgId, userId, {
      patientId,
      templateId,
      answeredAt: "2026-07-01",
      answers: [
        { questionId: firstQuestionId, answer: "Emagrecimento saudável" },
      ],
    });

    await prisma.anamnesisQuestion.update({
      where: { id: firstQuestionId },
      data: { prompt: "PERGUNTA ALTERADA DEPOIS" },
    });

    const responses = await clinicalService.anamnesis.listResponses(
      orgId,
      patientId,
    );
    expect(responses[0]?.answers[0]?.prompt).toBe(firstQuestionPrompt);

    await prisma.anamnesisQuestion.update({
      where: { id: firstQuestionId },
      data: { prompt: firstQuestionPrompt },
    });
  });
});
