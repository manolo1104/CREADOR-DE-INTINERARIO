import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — el agente puede tardar

// POST /api/cron/blog-post
// Protegido por BLOG_AGENT_SECRET en el header Authorization: Bearer <secret>
export async function POST(req: NextRequest) {
  const auth   = req.headers.get("authorization");
  const secret = process.env.BLOG_AGENT_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topic = new URL(req.url).searchParams.get("topic") ?? undefined;

  try {
    const blogAgentDir = path.join(process.cwd(), "blog-agent");

    // execFileSync NO usa shell: el topic se pasa como argumento, sin riesgo de
    // inyección de comandos ($(), backticks, ;, &&, etc.).
    const args = topic ? ["index.js", "--topic", topic] : ["index.js"];

    console.log(`[cron/blog-post] ejecutando: node ${args.join(" ")}`);
    const output = execFileSync("node", args, {
      cwd:      blogAgentDir,
      env:      { ...process.env },
      timeout:  270_000, // 4.5 min
      encoding: "utf-8",
    });

    return NextResponse.json({ ok: true, output: output.slice(-2000) });
  } catch (e: any) {
    const msg = e?.stdout || e?.stderr || e?.message || "Error desconocido";
    console.error("[cron/blog-post] error:", msg);
    return NextResponse.json({ error: String(msg).slice(0, 1000) }, { status: 500 });
  }
}
