import "server-only";
import { prisma } from "@/server/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { formatDateTime } from "@/lib/date";
import { messages } from "@/messages/pt-br";

/**
 * Lembretes de consulta: agendamentos que começam nas próximas 24–48h,
 * ainda não cancelados e sem lembrete enviado. Idempotente por
 * reminder_sent_at — reexecutar não duplica envios.
 */
export async function sendAppointmentReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: windowStart, lt: windowEnd },
      reminderSentAt: null,
      status: { in: ["scheduled", "confirmed"] },
    },
    include: {
      patient: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
  });

  let sent = 0;
  for (const appointment of appointments) {
    if (!appointment.patient.email) continue;
    try {
      await sendEmail({
        to: appointment.patient.email,
        subject: messages.email.reminderSubject(appointment.organization.name),
        html: messages.email.reminderBody({
          patientName: appointment.patient.name,
          clinicName: appointment.organization.name,
          when: formatDateTime(appointment.startsAt),
        }),
      });
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      logger.error(
        { appointmentId: appointment.id, error: (error as Error).message },
        "reminder_send_failed",
      );
    }
  }

  logger.info(
    { candidates: appointments.length, sent },
    "appointment_reminders_run",
  );
  return { sent };
}
