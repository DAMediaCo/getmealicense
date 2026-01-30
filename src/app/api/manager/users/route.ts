import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

// GET /api/manager/users - List all users (for managers)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== "MANAGER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // PENDING, ACTIVE, DISABLED

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    // Get users with their progress data
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        examAssignments: {
          include: {
            exam: { select: { id: true, code: true, name: true } },
          },
        },
        quizSessions: {
          where: { status: "COMPLETED" },
          select: { score: true, completedAt: true },
          orderBy: { completedAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            questionResponses: true,
            flashcardProgress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate progress for each user
    const usersWithProgress = await Promise.all(
      users.map(async (u) => {
        // Get correct answers count
        const correctAnswers = await prisma.questionResponse.count({
          where: { userId: u.id, isCorrect: true },
        });

        // Get total questions for assigned exams
        const examIds = u.examAssignments.map(a => a.examId);
        const totalQuestions = examIds.length > 0
          ? await prisma.question.count({
              where: { examId: { in: examIds }, isActive: true },
            })
          : 0;

        // Calculate readiness score (simplified)
        const recentSessions = u.quizSessions.filter(s => s.score !== null);
        const avgScore = recentSessions.length > 0
          ? recentSessions.reduce((sum, s) => sum + (s.score || 0), 0) / recentSessions.length
          : 0;

        const completionPct = totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          assignedExams: u.examAssignments.map(a => ({
            examId: a.exam.id,
            examCode: a.exam.code,
            examName: a.exam.name,
          })),
          progress: completionPct,
          readinessScore: Math.round(avgScore),
          questionsAnswered: u._count.questionResponses,
          flashcardsReviewed: u._count.flashcardProgress,
        };
      })
    );

    return NextResponse.json({ users: usersWithProgress });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/manager/users - Create a new user and send invite
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const manager = session.user as any;
    if (manager.role !== "MANAGER" && manager.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, examIds } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpiry = new Date();
    inviteExpiry.setDate(inviteExpiry.getDate() + 7); // 7 days to accept

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role: "STUDENT",
        status: "PENDING",
        inviteToken,
        inviteExpiry,
        createdBy: manager.id,
      },
    });

    // Assign exams if provided
    if (examIds && examIds.length > 0) {
      await prisma.userExamAssignment.createMany({
        data: examIds.map((examId: string) => ({
          userId: newUser.id,
          examId,
        })),
      });
    }

    // Generate invite URL
    const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${inviteToken}`;

    // Send invite email
    const emailResult = await sendInviteEmail({
      to: email,
      name,
      inviteUrl,
      managerName: manager.name || undefined,
    });

    if (!emailResult.success) {
      console.error(`Failed to send invite email to ${email}:`, emailResult.error);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        status: newUser.status,
      },
      inviteUrl, // In production, don't expose this - send via email
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// PATCH /api/manager/users - Update user (status, resend invite, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const manager = session.user as any;
    if (manager.role !== "MANAGER" && manager.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, action, examIds } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    switch (action) {
      case "disable":
        await prisma.user.update({
          where: { id: userId },
          data: { status: "DISABLED" },
        });
        return NextResponse.json({ success: true, status: "DISABLED" });

      case "enable":
        await prisma.user.update({
          where: { id: userId },
          data: { status: "ACTIVE" },
        });
        return NextResponse.json({ success: true, status: "ACTIVE" });

      case "resend-invite":
        if (targetUser.status !== "PENDING") {
          return NextResponse.json(
            { error: "Can only resend invite for pending users" },
            { status: 400 }
          );
        }

        const newToken = crypto.randomBytes(32).toString("hex");
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 7);

        await prisma.user.update({
          where: { id: userId },
          data: {
            inviteToken: newToken,
            inviteExpiry: newExpiry,
          },
        });

        const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${newToken}`;
        
        // Send the email
        await sendInviteEmail({
          to: targetUser.email,
          name: targetUser.name || "there",
          inviteUrl,
          managerName: manager.name || undefined,
        });

        return NextResponse.json({
          success: true,
          inviteUrl,
        });

      case "assign-exams":
        if (!examIds || examIds.length === 0) {
          return NextResponse.json(
            { error: "examIds are required for assign-exams action" },
            { status: 400 }
          );
        }

        // Remove existing assignments and add new ones
        await prisma.userExamAssignment.deleteMany({
          where: { userId },
        });

        await prisma.userExamAssignment.createMany({
          data: examIds.map((examId: string) => ({
            userId,
            examId,
          })),
        });

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
