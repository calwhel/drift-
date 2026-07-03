import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    if (token?.twoFactorEnabled && !token.twoFactorVerified) {
      return NextResponse.redirect(new URL("/auth/verify-2fa", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/admin") && !token?.isAdmin) {
      const url = new URL("/dashboard/overview", req.url);
      url.searchParams.set("admin_denied", "1");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
