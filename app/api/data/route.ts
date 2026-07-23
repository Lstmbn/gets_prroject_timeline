import { NextRequest, NextResponse } from "next/server";

type Identity = { name: string; role: "admin" | "member" };
type TaskRecord = { id?: string; owner?: string; owners?: string; completed?: string; status?: string; done?: boolean };

const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
const scriptToken = process.env.GOOGLE_APPS_SCRIPT_TOKEN;
const adminNames = new Set(["LUS", "GRI", "JOSH"]);
const aliases: Record<string, string> = { LUS: "LUSIANA", GRI: "GRISELDA", JOSH: "JOSHUA" };
const canonical = (name: string) => aliases[name.trim().toUpperCase()] || name.trim().toUpperCase();

function tokenDirectory(): Record<string, string> {
  try {
    return JSON.parse(process.env.USER_ACCESS_TOKENS || "{}");
  } catch {
    return {};
  }
}

function identity(request: NextRequest): Identity | null {
  const supplied = request.headers.get("x-user-token")?.trim();
  if (!supplied) return null;
  const name = tokenDirectory()[supplied]?.trim();
  if (!name) return null;
  return { name, role: adminNames.has(name.toUpperCase()) ? "admin" : "member" };
}

function owners(record: TaskRecord) {
  return String(record.owners || record.owner || "")
    .split(/[,;|]/)
    .map(canonical)
    .filter(Boolean);
}

async function sheetRequest(method: "GET" | "POST", payload?: object) {
  if (!scriptUrl || !scriptToken) throw new Error("Google Sheets connection is not configured.");
  const target = new URL(scriptUrl);
  if (method === "GET") target.searchParams.set("token", scriptToken);
  const response = await fetch(target, {
    method,
    redirect: "follow",
    cache: "no-store",
    headers: method === "POST" ? { "Content-Type": "text/plain;charset=utf-8" } : undefined,
    body: method === "POST" ? JSON.stringify({ token: scriptToken, ...payload }) : undefined,
  });
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid response from Google Sheets.");
  }
  if (!response.ok || !data.ok) throw new Error(String(data.error || "Google Sheets request failed."));
  return data;
}

export async function GET() {
  try {
    return NextResponse.json(await sheetRequest("GET"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load data." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = identity(request);
    if (!actor) return NextResponse.json({ ok: false, error: "A valid user token is required." }, { status: 401 });

    const body = await request.json();
    const { action, type, record } = body as { action: "create" | "update"; type: "project" | "task"; record: TaskRecord };
    if (!record || !["create", "update"].includes(action) || !["project", "task"].includes(type)) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    if (type === "project" && actor.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only an administrator may change project data." }, { status: 403 });
    }

    if (type === "task") {
      const data = await sheetRequest("GET");
      const allTasks = (data.tasks || []) as TaskRecord[];
      const existing = allTasks.find((task) => String(task.id) === String(record.id));
      const ownsExisting = existing ? owners(existing).includes(canonical(actor.name)) : false;
      const alreadyOwnsTask = allTasks.some((task) => owners(task).includes(canonical(actor.name)));

      if (action === "update" && actor.role !== "admin" && !ownsExisting) {
        return NextResponse.json({ ok: false, error: "You may only edit a task assigned to you." }, { status: 403 });
      }
      if (action === "create" && actor.role !== "admin" && !alreadyOwnsTask) {
        return NextResponse.json({ ok: false, error: "Only administrators or current task owners may add a task." }, { status: 403 });
      }
      if (action === "create" && actor.role !== "admin" && !owners(record).includes(canonical(actor.name))) {
        return NextResponse.json({ ok: false, error: "Your name must remain one of the owners of a task you create." }, { status: 403 });
      }

      if (record.completed) {
        record.done = true;
        record.status = "Completed";
      } else if (record.status === "Completed" || record.done) {
        return NextResponse.json({ ok: false, error: "Completed Date is required before a task can be completed." }, { status: 400 });
      }
    }

    const audited = {
      ...record,
      updatedBy: actor.name,
      updatedAt: new Date().toISOString(),
    };
    await sheetRequest("POST", { action, type, record: audited });
    return NextResponse.json({ ok: true, actor });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save data." }, { status: 502 });
  }
}
