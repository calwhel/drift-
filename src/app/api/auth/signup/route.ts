import { NextResponse } from "next/server";
import { GET as healthGET } from "@/app/api/health/route";
export { POST } from "@/lib/auth/register-handler";

/** Quick check that auth API routes are mounted */
export async function GET() {
  return NextResponse.json({
    ok: true,
    routes: {
      signup: "POST /api/auth/signup",
      register: "POST /api/auth/register",
      nextauth: "GET|POST /api/auth/[...nextauth]",
    },
    env: {
      database_url: process.env.DATABASE_URL ? "set" : "missing",
      nextauth_secret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
      nextauth_url: process.env.NEXTAUTH_URL ? "set" : "missing",
    },
  });
}

export async function HEAD() {
  const health = await healthGET();
  return new NextResponse(null, { status: health.status });
}
