import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, error: "No token provided" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        inviteExpiry: true,
      },
    });

    if (!user) {
      return NextResponse.json({ valid: false, error: "Invalid token" });
    }

    if (user.status !== "PENDING") {
      return NextResponse.json({ valid: false, error: "Account already activated" });
    }

    if (user.inviteExpiry && new Date() > user.inviteExpiry) {
      return NextResponse.json({ valid: false, expired: true, error: "Invite expired" });
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json({ valid: false, error: "Server error" });
  }
}
