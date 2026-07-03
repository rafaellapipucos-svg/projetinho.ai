import { NextResponse } from "next/server";

/** Health check do Cloud Run — leve, sem tocar o banco. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
