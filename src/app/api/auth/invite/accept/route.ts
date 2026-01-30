import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields" });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid token" });
    }

    if (user.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Account already activated" });
    }

    if (user.inviteExpiry && new Date() > user.inviteExpiry) {
      return NextResponse.json({ success: false, error: "Invite expired" });
    }

    // Hash password and activate account
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: "ACTIVE",
        inviteToken: null,
        inviteExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ success: false, error: "Server error" });
  }
}
