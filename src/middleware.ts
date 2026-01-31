import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Manager routes require MANAGER or ADMIN role
    if (path.startsWith("/manager")) {
      if (token?.role !== "MANAGER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Student routes - managers can also access (to preview)
    if (path.startsWith("/student")) {
      if (token?.role !== "STUDENT" && token?.role !== "MANAGER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/manager/:path*",
    "/student/:path*",
    "/courses",
    "/courses/:path*",
  ],
};
