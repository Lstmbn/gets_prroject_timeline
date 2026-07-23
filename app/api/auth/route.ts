import { NextRequest, NextResponse } from "next/server";

const admins = new Set(["LUS", "GRI", "JOSH"]);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const directory: Record<string, string> = JSON.parse(process.env.USER_ACCESS_TOKENS || "{}");
    const name = directory[String(token || "").trim()]?.trim();
    if (!name) return NextResponse.json({ ok: false, error: "Token tidak dikenali." }, { status: 401 });
    return NextResponse.json({ ok: true, user: { name, role: admins.has(name.toUpperCase()) ? "admin" : "member" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Konfigurasi token pengguna belum valid." }, { status: 500 });
  }
}
