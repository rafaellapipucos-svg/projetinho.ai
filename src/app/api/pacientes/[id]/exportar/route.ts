import { NextResponse } from "next/server";
import { getTenantContext } from "@/server/auth/tenant-context";
import { exportService } from "@/server/services/export-service";
import { NotFoundError } from "@/server/errors";

/**
 * Exportação LGPD dos dados do paciente (JSON para download).
 * Autorizada pelo TenantContext — a org do usuário logado deve conter o paciente.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getTenantContext();
  if (!ctx?.membership) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = await exportService.patientData(
      ctx.membership.organizationId,
      id,
    );
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="paciente-${id}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
