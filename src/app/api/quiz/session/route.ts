import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/quiz/session - Create a new quiz session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { examId, mode = "PRACTICE", totalQuestions = 10 } = body;

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    // Get exam info for time limit
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Create quiz session
    const quizSession = await prisma.quizSession.create({
      data: {
        userId: user.id,
        examId,
        type: mode === "TIMED" ? "TIMED_EXAM" : "PRACTICE",
        totalQuestions,
        timeRemaining: mode === "TIMED" && exam.timeLimit ? exam.timeLimit * 60 : null,
        status: "IN_PROGRESS",
      },
    });

    // Update resume state
    await prisma.userResumeState.upsert({
      where: {
        userId_examId_activityType: {
          userId: user.id,
          examId,
          activityType: "QUIZ",
        },
      },
      update: {
        referenceId: quizSession.id,
        lastPosition: { questionIndex: 0 },
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        examId,
        activityType: "QUIZ",
        referenceId: quizSession.id,
        lastPosition: { questionIndex: 0 },
      },
    });

    return NextResponse.json({ session: quizSession });
  } catch (error) {
    console.error("Error creating quiz session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// GET /api/quiz/session?id=xxx - Get session details or resume active session
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    const examId = searchParams.get("examId");

    if (sessionId) {
      // Get specific session
      const quizSession = await prisma.quizSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
        include: {
          exam: true,
          responses: {
            include: {
              question: {
                include: {
                  answerOptions: true,
                },
              },
            },
          },
        },
      });

      if (!quizSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      return NextResponse.json({ session: quizSession });
    }

    if (examId) {
      // Find active session for this exam
      const activeSession = await prisma.quizSession.findFirst({
        where: {
          userId: user.id,
          examId,
          status: "IN_PROGRESS",
        },
        include: {
          exam: true,
        },
        orderBy: { startedAt: "desc" },
      });

      return NextResponse.json({ session: activeSession });
    }

    return NextResponse.json({ error: "id or examId required" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

// PATCH /api/quiz/session - Update session (pause, complete, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { sessionId, action, timeRemaining, questionIndex } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "sessionId and action are required" },
        { status: 400 }
      );
    }

    const quizSession = await prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!quizSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case "pause":
        updateData.status = "PAUSED";
        updateData.pausedAt = new Date();
        if (timeRemaining !== undefined) {
          updateData.timeRemaining = timeRemaining;
        }
        break;
      case "resume":
        updateData.status = "IN_PROGRESS";
        updateData.pausedAt = null;
        break;
      case "complete":
        updateData.status = "COMPLETED";
        updateData.completedAt = new Date();
        // Calculate score
        const score = quizSession.totalQuestions > 0
          ? Math.round((quizSession.correctAnswers / quizSession.totalQuestions) * 100)
          : 0;
        updateData.score = score;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.quizSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Update resume state with current position
    if (questionIndex !== undefined) {
      await prisma.userResumeState.updateMany({
        where: {
          userId: user.id,
          referenceId: sessionId,
        },
        data: {
          lastPosition: { questionIndex },
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
