import { NextResponse } from "next/server";
import { createDemoWorkspace } from "@/lib/demo/seed";
import { WS_COOKIE } from "@/lib/workspace";

// "Try the live demo": every visitor gets their own freshly seeded workspace.
export async function GET(req: Request) {
  const id = createDemoWorkspace();
  const res = NextResponse.redirect(new URL("/app", req.url));
  res.cookies.set(WS_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return res;
}
