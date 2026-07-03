import type { PrismaClient } from "../../src/generated/prisma/client";

/**
 * Modelo de anamnese do sistema. As perguntas são geridas pelo seed
 * (replace-all): respostas antigas não são afetadas porque carregam
 * CÓPIA das perguntas (Regra do Snapshot §3.3).
 */
const questions = [
  { prompt: "Objetivo principal da consulta", type: "text", required: true },
  { prompt: "Histórico de doenças (pessoais e familiares)", type: "text" },
  { prompt: "Medicamentos e suplementos em uso", type: "text" },
  { prompt: "Alergias ou intolerâncias alimentares", type: "text" },
  {
    prompt: "Funcionamento intestinal",
    type: "select",
    options: [
      "Diário",
      "Dias alternados",
      "A cada 3 dias ou mais",
      "Irregular",
    ],
  },
  {
    prompt: "Qualidade do sono",
    type: "select",
    options: ["Boa", "Regular", "Ruim"],
  },
  { prompt: "Consumo de água por dia (litros)", type: "number" },
  {
    prompt: "Pratica atividade física? Quais e com que frequência?",
    type: "text",
  },
  {
    prompt: "Consumo de bebida alcoólica",
    type: "select",
    options: ["Não consome", "Socialmente", "Frequentemente"],
  },
  { prompt: "Fuma?", type: "boolean" },
  { prompt: "Nível de estresse (0 a 10)", type: "scale" },
  { prompt: "Alimentos preferidos", type: "text" },
  { prompt: "Alimentos que evita ou não gosta", type: "text" },
] as const;

export async function seedAnamnesis(prisma: PrismaClient) {
  const name = "Anamnese padrão";
  let template = await prisma.anamnesisTemplate.findFirst({
    where: { organizationId: null, name },
  });
  if (!template) {
    template = await prisma.anamnesisTemplate.create({
      data: { name, isSystem: true },
    });
  }

  await prisma.anamnesisQuestion.deleteMany({
    where: { templateId: template.id },
  });
  await prisma.anamnesisQuestion.createMany({
    data: questions.map((question, index) => ({
      templateId: template.id,
      prompt: question.prompt,
      type: question.type,
      options: "options" in question ? [...question.options] : [],
      required: "required" in question ? question.required : false,
      sortOrder: index,
    })),
  });

  console.info(
    `Seed de anamnese: modelo "${name}" com ${questions.length} perguntas.`,
  );
}
