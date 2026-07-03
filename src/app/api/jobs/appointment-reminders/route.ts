import { NextResponse } from "next/server";
import { authorizeJobRequest } from "@/lib/jobs-auth";
import { sendAppointmentReminders } from "@/server/services/reminder-service";
import { logger } from "@/lib/logger";

/**
 * Job de lembretes de consulta (Cloud Scheduler, diário).
 * Protegido por OIDC do Google ou segredo compartilhado (jobs-auth).
 */
export async function POST(request: Request) {
  const authorized = await authorizeJobRequest(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendAppointmentReminders();
    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error: (error as Error).message },
      "appointment_reminders_error",
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
