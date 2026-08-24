import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Context = {
  params: Promise<{ path: string[] }>;
};

function upstreamUrl(path: string[], search: string): URL {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${base}/${path.map((item) => encodeURIComponent(item)).join("/")}`);
  url.search = search;
  return url;
}

export async function GET(request: Request, { params }: Context) {
  const { path } = await params;

  if (!path.length) {
    return NextResponse.json({ detail: "Rota da API não informada." }, { status: 404 });
  }

  try {
    const response = await fetch(upstreamUrl(path, new URL(request.url).search), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": response.ok ? "public, max-age=60, s-maxage=300" : "no-store"
      }
    });
  } catch {
    return NextResponse.json({ detail: "API indisponível." }, { status: 502 });
  }
}
