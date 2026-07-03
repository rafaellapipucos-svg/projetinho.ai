import "server-only";
import { prisma } from "@/server/db";
import { operationsRepo } from "@/server/repositories/operations-repo";
import { patientRepo } from "@/server/repositories/patient-repo";
import { NotFoundError } from "@/server/errors";
import { renderMergeFields, type MergeContext } from "@/domain/documents/merge";
import { ageFrom, formatDate } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import type {
  AppointmentInput,
  DocumentIssueInput,
  DocumentTemplateInput,
  ServiceInput,
} from "@/lib/schemas/operations";

async function requirePatient(organizationId: string, patientId: string) {
  const patient = await patientRepo.findByIdForOrg(
    prisma,
    organizationId,
    patientId,
  );
  if (!patient) throw new NotFoundError(messages.errors.notFound);
  return patient;
}

function money(cents: number): number {
  return cents / 100;
}

export const operationsService = {
  services: {
    async list(organizationId: string) {
      const services = await operationsRepo.listServices(
        prisma,
        organizationId,
      );
      return services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceReais: money(service.priceCents),
      }));
    },
    create(organizationId: string, input: ServiceInput) {
      return operationsRepo.createService(prisma, { organizationId, ...input });
    },
    async update(organizationId: string, id: string, input: ServiceInput) {
      const result = await operationsRepo.updateService(
        prisma,
        organizationId,
        id,
        input,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
    async remove(organizationId: string, id: string) {
      const result = await operationsRepo.deactivateService(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  appointments: {
    async listRange(organizationId: string, from: Date, to: Date) {
      const appointments = await operationsRepo.listAppointmentsInRange(
        prisma,
        organizationId,
        from,
        to,
      );
      return appointments.map((appointment) => ({
        id: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patient.name,
        professionalName: appointment.professional.name,
        serviceId: appointment.serviceId,
        serviceName: appointment.service?.name ?? null,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        status: appointment.status,
        notes: appointment.notes,
      }));
    },

    async create(
      organizationId: string,
      userId: string,
      input: AppointmentInput,
    ) {
      await requirePatient(organizationId, input.patientId);
      if (input.serviceId) {
        const service = await operationsRepo.findServiceForOrg(
          prisma,
          organizationId,
          input.serviceId,
        );
        if (!service) throw new NotFoundError(messages.errors.notFound);
      }
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(
        startsAt.getTime() + input.durationMinutes * 60_000,
      );
      const appointment = await operationsRepo.createAppointment(prisma, {
        organizationId,
        patientId: input.patientId,
        professionalId: userId,
        serviceId: input.serviceId,
        startsAt,
        endsAt,
        notes: input.notes,
        createdBy: userId,
      });
      return { id: appointment.id };
    },

    async update(organizationId: string, id: string, input: AppointmentInput) {
      await requirePatient(organizationId, input.patientId);
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(
        startsAt.getTime() + input.durationMinutes * 60_000,
      );
      const result = await operationsRepo.updateAppointment(
        prisma,
        organizationId,
        id,
        {
          patientId: input.patientId,
          serviceId: input.serviceId,
          startsAt,
          endsAt,
          notes: input.notes,
        },
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },

    async setStatus(
      organizationId: string,
      id: string,
      status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show",
    ) {
      const result = await operationsRepo.setAppointmentStatus(
        prisma,
        organizationId,
        id,
        status,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  documents: {
    templates(organizationId: string) {
      return operationsRepo.listDocumentTemplates(prisma, organizationId);
    },

    async saveTemplate(organizationId: string, input: DocumentTemplateInput) {
      if (input.id) {
        const result = await operationsRepo.updateTemplate(
          prisma,
          organizationId,
          input.id,
          {
            name: input.name,
            body: input.body,
          },
        );
        if (result.count === 0)
          throw new NotFoundError(messages.errors.notFound);
        return { id: input.id };
      }
      const template = await operationsRepo.createTemplate(
        prisma,
        organizationId,
        {
          name: input.name,
          body: input.body,
        },
      );
      return { id: template.id };
    },

    async deactivateTemplate(organizationId: string, id: string) {
      const result = await operationsRepo.deactivateTemplate(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },

    /** Contexto de merge para um paciente (usado no preview e na emissão). */
    async mergeContext(
      organizationId: string,
      patientId: string,
      professionalName: string,
    ): Promise<MergeContext> {
      const patient = await requirePatient(organizationId, patientId);
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });
      return {
        "paciente.nome": patient.name,
        "paciente.cpf": patient.cpf ?? "",
        "paciente.email": patient.email ?? "",
        "paciente.telefone": patient.phone ?? "",
        "paciente.nascimento": patient.birthDate
          ? formatDate(patient.birthDate)
          : "",
        "paciente.idade": patient.birthDate
          ? String(ageFrom(patient.birthDate))
          : "",
        "clinica.nome": org?.name ?? "",
        "profissional.nome": professionalName,
        "data.hoje": formatDate(new Date()),
      };
    },

    list(organizationId: string, patientId: string) {
      return operationsRepo.listDocuments(prisma, organizationId, patientId);
    },

    async byId(organizationId: string, id: string) {
      const document = await operationsRepo.findDocumentForOrg(
        prisma,
        organizationId,
        id,
      );
      if (!document) throw new NotFoundError(messages.errors.notFound);
      return document;
    },

    async issue(
      organizationId: string,
      userId: string,
      professionalName: string,
      input: DocumentIssueInput,
    ) {
      await requirePatient(organizationId, input.patientId);
      if (input.templateId) {
        const template = await operationsRepo.findTemplateVisible(
          prisma,
          organizationId,
          input.templateId,
        );
        if (!template) throw new NotFoundError(messages.errors.notFound);
      }
      // Renderiza os merge-fields no servidor (fonte da verdade §3.3)
      const context = await this.mergeContext(
        organizationId,
        input.patientId,
        professionalName,
      );
      const body = renderMergeFields(input.body, context);
      const document = await operationsRepo.createDocument(prisma, {
        organizationId,
        patientId: input.patientId,
        templateId: input.templateId,
        title: input.title,
        body,
        issuedAt: new Date(`${input.issuedAt}T00:00:00Z`),
        createdBy: userId,
      });
      return { id: document.id };
    },

    async remove(organizationId: string, id: string) {
      const result = await operationsRepo.softDeleteDocument(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  messages: {
    async list(
      organizationId: string,
      patientId: string,
      currentUserId: string,
    ) {
      await requirePatient(organizationId, patientId);
      await operationsRepo.markMessagesRead(prisma, patientId, currentUserId);
      const rows = await operationsRepo.listMessages(
        prisma,
        organizationId,
        patientId,
        200,
      );
      return rows.map((message) => ({
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        senderName: message.sender.name,
        createdAt: message.createdAt,
        mine: message.senderId === currentUserId,
      }));
    },

    async send(
      organizationId: string,
      patientId: string,
      senderId: string,
      body: string,
    ) {
      await requirePatient(organizationId, patientId);
      const message = await operationsRepo.createMessage(prisma, {
        organizationId,
        patientId,
        senderId,
        body,
      });
      return { id: message.id };
    },
  },
};
