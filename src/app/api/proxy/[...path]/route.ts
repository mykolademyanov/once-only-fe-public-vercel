import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) return NextResponse.json({ error: "Missing NEXT_PUBLIC_API_BASE" }, { status: 500 });

  const url = new URL(req.url);

  // /api/proxy/<rest>
  const rest = url.pathname.replace(/^\/api\/proxy\/?/, ""); // e.g. "v1/me"
  const target = `${base}/${rest}${url.search}`;

  const auth = req.headers.get("authorization") || "";

  const r = await fetch(target, {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store",
  });

  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
  });
}
