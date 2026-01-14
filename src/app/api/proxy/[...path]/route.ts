import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.NEXT_PUBLIC_API_BASE;

async function proxy(req: Request) {
  if (!BASE) return NextResponse.json({ error: "Missing NEXT_PUBLIC_API_BASE" }, { status: 500 });

  const url = new URL(req.url);

  const rest = url.pathname.replace(/^\/api\/proxy\/?/, "");
  const target = `${BASE}/${rest}${url.search}`;
  const headers = new Headers();
  const auth = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");

  if (auth) headers.set("authorization", auth);
  if (contentType) headers.set("content-type", contentType);
  headers.set("accept", "application/json");

  const options: RequestInit = {
    method: req.method, // GET or POST
    headers: headers,
    cache: "no-store",
  };

  if (req.method === "POST") {
    options.body = await req.text();
  }

  try {
    const r = await fetch(target, options);
    const body = await r.text();

    return new NextResponse(body, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    console.error("Proxy error:", e);
    return NextResponse.json({ error: "Proxy connection failed" }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: Request) {
  return proxy(req);
}

export async function POST(req: Request) {
  return proxy(req);
}