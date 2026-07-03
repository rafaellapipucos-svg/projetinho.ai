import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Teste de isolamento de tenant (aceite da Fase 3): a org B jamais lê,
 * altera ou arquiva pacientes da org A — provado contra o banco real,
 * passando pelos services de produção.
 *
 * Roda apenas onde há credenciais (local); o CI de qualidade não tem
 * segredos de banco e pula a suíte inteira.
 */
// Gate por DIRECT_URL (só o .env local o define). O CI de qualidade injeta
// um DATABASE_URL sintético para o build, mas nunca DIRECT_URL — então a
// suíte de integração roda no local (Supabase real) e pula no CI.
const hasDatabase = Boolean(process.env.DIRECT_URL);

describe.runIf(hasDatabase)("isolamento de tenant — pacientes", () => {
  let patientService: typeof import("./patient-service").patientService;
  let prisma: typeof import("../db").prisma;
  let orgA: string;
  let orgB: string;
  let userA: string;
  let patientId: string;

  beforeAll(async () => {
    ({ patientService } = await import("./patient-service"));
    ({ prisma } = await import("../db"));

    const stamp = Date.now().toString(36);
    const user = await prisma.user.create({
      data: {
        authId: crypto.randomUUID(),
        email: `teste-isolamento-${stamp}@example.com`,
        name: "Teste Isolamento",
      },
    });
    userA = user.id;
    const [a, b] = await Promise.all([
      prisma.organization.create({
        data: { name: "Org A Teste", slug: `org-a-${stamp}` },
      }),
      prisma.organization.create({
        data: { name: "Org B Teste", slug: `org-b-${stamp}` },
      }),
    ]);
    orgA = a.id;
    orgB = b.id;

    const patient = await patientService.create(orgA, userA, {
      name: "Paciente Sigiloso",
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
  });

  afterAll(async () => {
    await prisma.patient.deleteMany({
      where: { organizationId: { in: [orgA, orgB] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA, orgB] } },
    });
    await prisma.user.delete({ where: { id: userA } });
    await prisma.$disconnect();
  });

  it("a própria org lê o paciente", async () => {
    const patient = await patientService.byId(orgA, patientId);
    expect(patient.name).toBe("Paciente Sigiloso");
    expect(patient.consentAt).not.toBeNull();
  });

  it("outra org não lê o paciente (NotFound)", async () => {
    await expect(patientService.byId(orgB, patientId)).rejects.toThrow();
  });

  it("outra org não lista o paciente", async () => {
    const list = await patientService.list(orgB, "sigiloso");
    expect(list).toHaveLength(0);
  });

  it("outra org não altera nem arquiva o paciente", async () => {
    await expect(
      patientService.update(orgB, patientId, {
        name: "Invadido",
        birthDate: null,
        sex: null,
        genderIdentity: null,
        cpf: null,
        email: null,
        phone: null,
        occupation: null,
        notes: null,
        consent: false,
      }),
    ).rejects.toThrow();
    await expect(patientService.archive(orgB, patientId)).rejects.toThrow();

    const intact = await patientService.byId(orgA, patientId);
    expect(intact.name).toBe("Paciente Sigiloso");
  });
});
