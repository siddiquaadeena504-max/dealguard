import { NextResponse } from "next/server";
import { createDemoWorkspace } from "@/lib/demo/seed";
import { WS_COOKIE } from "@/lib/workspace";

// "Try the live demo": every visitor gets their own freshly seeded workspace.
export async function GET(req: Request) {
  // Background prefetches must never create (and switch to) a new workspace.
  const h = req.headers;
  if (h.get("next-router-prefetch") || h.get("purpose") === "prefetch" || h.get("sec-purpose")?.includes("prefetch")) {
    return new NextResponse(null, { status: 204 });
  }
  const id = createDemoWorkspace();
  // Relative redirect: behind a proxy (Render) req.url is the internal localhost address.
  const res = new NextResponse(null, { status: 307, headers: { Location: "/app" } });
  res.cookies.set(WS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return res;
}
