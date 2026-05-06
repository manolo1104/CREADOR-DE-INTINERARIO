import { NextResponse } from "next/server";
import { calcKPIs } from "@/lib/admin/kpis";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const kpis = await calcKPIs();
    return NextResponse.json(kpis);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
