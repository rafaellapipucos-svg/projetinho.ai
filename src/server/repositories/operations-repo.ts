import "server-only";
import type { Db } from "@/server/db";
import type { AppointmentStatus } from "@/generated/prisma/enums";

/** Operação da clínica (Fase 7) — sempre filtrado por organização (§3.4). */
export const operationsRepo = {
  // ── Serviços ─────────────────────────────────────────────────────────────
  listServices(db: Db, organizationId: string) {
    return db.service.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
  },
  findServiceForOrg(db: Db, organizationId: string, id: string) {
    return db.service.findFirst({
      where: { id, organizationId, isActive: true },
    });
  },
  createService(
    db: Db,
    data: {
      organizationId: string;
      name: string;
      durationMinutes: number;
      priceCents: number;
    },
  ) {
    return db.service.create({ data });
  },
  updateService(
    db: Db,
    organizationId: string,
    id: string,
    data: { name: string; durationMinutes: number; priceCents: number },
  ) {
    return db.service.updateMany({ where: { id, organizationId }, data });
  },
  deactivateService(db: Db, organizationId: string, id: string) {
    return db.service.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  // ── Agenda ───────────────────────────────────────────────────────────────
  listAppointmentsInRange(
    db: Db,
    organizationId: string,
    from: Date,
    to: Date,
  ) {
    return db.appointment.findMany({
      where: { organizationId, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: "asc" },
      include: {
        patient: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
      },
    });
  },
  listAppointmentsByPatient(db: Db, organizationId: string, patientId: string) {
    return db.appointment.findMany({
      where: { organizationId, patientId },
      orderBy: { startsAt: "desc" },
      include: { service: { select: { name: true } } },
    });
  },
  createAppointment(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      professionalId: string;
      serviceId: string | null;
      startsAt: Date;
      endsAt: Date;
      notes: string | null;
      createdBy: string;
    },
  ) {
    return db.appointment.create({ data });
  },
  updateAppointment(
    db: Db,
    organizationId: string,
    id: string,
    data: {
      patientId: string;
      serviceId: string | null;
      startsAt: Date;
      endsAt: Date;
      notes: string | null;
    },
  ) {
    return db.appointment.updateMany({ where: { id, organizationId }, data });
  },
  setAppointmentStatus(
    db: Db,
    organizationId: string,
    id: string,
    status: AppointmentStatus,
  ) {
    return db.appointment.updateMany({
      where: { id, organizationId },
      data: { status },
    });
  },

  // ── Modelos de documento ─────────────────────────────────────────────────
  listDocumentTemplates(db: Db, organizationId: string) {
    return db.documentTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  },
  findTemplateVisible(db: Db, organizationId: string, id: string) {
    return db.documentTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
  },
  createTemplate(
    db: Db,
    organizationId: string,
    data: { name: string; body: string },
  ) {
    return db.documentTemplate.create({ data: { ...data, organizationId } });
  },
  updateTemplate(
    db: Db,
    organizationId: string,
    id: string,
    data: { name: string; body: string },
  ) {
    return db.documentTemplate.updateMany({
      where: { id, organizationId },
      data,
    });
  },
  deactivateTemplate(db: Db, organizationId: string, id: string) {
    return db.documentTemplate.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  // ── Documentos emitidos ──────────────────────────────────────────────────
  listDocuments(db: Db, organizationId: string, patientId: string) {
    return db.document.findMany({
      where: { organizationId, patientId, deletedAt: null },
      orderBy: { issuedAt: "desc" },
    });
  },
  findDocumentForOrg(db: Db, organizationId: string, id: string) {
    return db.document.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { patient: { select: { name: true } } },
    });
  },
  createDocument(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      templateId: string | null;
      title: string;
      body: string;
      issuedAt: Date;
      createdBy: string;
    },
  ) {
    return db.document.create({ data });
  },
  softDeleteDocument(db: Db, organizationId: string, id: string) {
    return db.document.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  // ── Mensagens (chat) ─────────────────────────────────────────────────────
  listMessages(
    db: Db,
    organizationId: string,
    patientId: string,
    take: number,
  ) {
    return db.message.findMany({
      where: { organizationId, patientId },
      orderBy: { createdAt: "asc" },
      take,
      include: { sender: { select: { id: true, name: true } } },
    });
  },
  createMessage(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      senderId: string;
      body: string;
    },
  ) {
    return db.message.create({ data });
  },
  markMessagesRead(db: Db, patientId: string, exceptSenderId: string) {
    return db.message.updateMany({
      where: { patientId, senderId: { not: exceptSenderId }, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
