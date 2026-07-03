import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Aceite da Fase 5: o paciente vê só o que é dele.
 * Convite → vínculo → diário, com o token consumido no primeiro uso e
 * revogação limpando o acesso — services de produção contra o banco real.
 */
const hasDatabase = Boolean(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

describe.runIf(hasDatabase)("portal do paciente — convite e isolamento", () => {
  let prisma: typeof import("../db").prisma;
  let patientService: typeof import("./patient-service").patientService;
  let portalService: typeof import("./portal-service").portalService;
  let patientRepo: typeof import("../repositories/patient-repo").patientRepo;

  let orgId: string;
  let proUserId: string;
  let patientUserId: string;
  let strangerUserId: string;
  let patientId: string;
  let token: string;

  beforeAll(async () => {
    ({ prisma } = await import("../db"));
    ({ patientService } = await import("./patient-service"));
    ({ portalService } = await import("./portal-service"));
    ({ patientRepo } = await import("../repositories/patient-repo"));

    const stamp = Date.now().toString(36);
    const [pro, patientUser, stranger] = await Promise.all([
      prisma.user.create({
        data: {
          authId: crypto.randomUUID(),
          email: `pro-${stamp}@example.com`,
          name: "Nutri Teste",
        },
      }),
      prisma.user.create({
        data: {
          authId: crypto.randomUUID(),
          email: `paciente-${stamp}@example.com`,
          name: "Paciente Portal",
        },
      }),
      prisma.user.create({
        data: {
          authId: crypto.randomUUID(),
          email: `estranho-${stamp}@example.com`,
          name: "Estranho",
        },
      }),
    ]);
    proUserId = pro.id;
    patientUserId = patientUser.id;
    strangerUserId = stranger.id;

    const org = await prisma.organization.create({
      data: { name: "Org Portal Teste", slug: `org-portal-${stamp}` },
    });
    orgId = org.id;

    const patient = await patientService.create(orgId, proUserId, {
      name: "Paciente Portal",
      birthDate: null,
      sex: null,
      genderIdentity: null,
      cpf: null,
      email: null,
      phone: null,
      occupation: null,
      notes: null,
      consent: true,
    });
    patientId = patient.id;

    const invite = await patientService.portalAccess.generateInvite(
      orgId,
      patientId,
    );
    token = invite.token;
  });

  afterAll(async () => {
    await prisma.foodDiaryEntry.deleteMany({
      where: { organizationId: orgId },
    });
    await prisma.patient.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.user.deleteMany({
      where: { id: { in: [proUserId, patientUserId, strangerUserId] } },
    });
    await prisma.$disconnect();
  });

  it("convite vincula a conta ao prontuário e consome o token", async () => {
    const result = await portalService.claimInvite(patientUserId, token);
    expect(result.patientName).toBe("Paciente Portal");

    const profiles = await patientRepo.findProfilesByUser(
      prisma,
      patientUserId,
    );
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.id).toBe(patientId);

    // Token de uso único: um estranho não consegue reutilizá-lo
    await expect(
      portalService.claimInvite(strangerUserId, token),
    ).rejects.toThrow();
  });

  it("conta sem vínculo não tem perfil de paciente", async () => {
    const profiles = await patientRepo.findProfilesByUser(
      prisma,
      strangerUserId,
    );
    expect(profiles).toHaveLength(0);
  });

  it("diário: registrar, listar e remover apenas no próprio prontuário", async () => {
    const profile = {
      patientId,
      patientName: "Paciente Portal",
      organizationId: orgId,
      organizationName: "Org Portal Teste",
    };
    await portalService.diary.add(profile, patientUserId, {
      entryAt: new Date().toISOString(),
      mealTypeId: null,
      description: "Tapioca com ovo",
      photoPath: null,
    });
    const entries = await portalService.diary.list(profile);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.description).toBe("Tapioca com ovo");

    // Sem plano ativo, o portal responde null (não erro)
    await expect(portalService.activePlan(profile)).resolves.toBeNull();

    const entryId = entries[0]?.id ?? "";
    await portalService.diary.remove(profile, entryId);
    await expect(portalService.diary.list(profile)).resolves.toHaveLength(0);
  });

  it("revogar acesso desfaz o vínculo", async () => {
    await patientService.portalAccess.revoke(orgId, patientId);
    const profiles = await patientRepo.findProfilesByUser(
      prisma,
      patientUserId,
    );
    expect(profiles).toHaveLength(0);
  });
});
