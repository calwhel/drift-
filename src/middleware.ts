import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/admin") && !req.nextauth.token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard/overview", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        if (!token) return false;
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token.isAdmin === true;
        }
        return true;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
