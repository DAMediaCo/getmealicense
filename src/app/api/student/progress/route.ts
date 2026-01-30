import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/student/progress - Get student's progress across all assigned exams
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    // Get assigned exams with progress
    const assignments = await prisma.userExamAssignment.findMany({
      where: { userId: user.id },
      include: {
        exam: {
          include: {
            questions: {
              where: { isActive: true },
              select: { id: true },
            },
            flashcards: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    const examProgress = await Promise.all(
      assignments.map(async (assignment) => {
        const exam = assignment.exam;

        // Get questions answered correctly for this exam
        const correctResponses = await prisma.questionResponse.findMany({
          where: {
            userId: user.id,
            isCorrect: true,
            question: { examId: exam.id },
          },
          distinct: ["questionId"],
        });

        // Get recent quiz sessions
        const recentSession = await prisma.quizSession.findFirst({
          where: {
            userId: user.id,
            examId: exam.id,
          },
          orderBy: { startedAt: "desc" },
        });

        // Get flashcard progress
        const flashcardProgress = await prisma.flashcardProgress.findMany({
          where: {
            userId: user.id,
            flashcard: { examId: exam.id },
          },
        });

        const masteredFlashcards = flashcardProgress.filter(fp => fp.masteryLevel >= 4).length;

        // Calculate progress percentage
        const totalQuestions = exam.questions.length;
        const totalFlashcards = exam.flashcards.length;
        const questionsCorrect = correctResponses.length;

        const questionProgress = totalQuestions > 0 
          ? (questionsCorrect / totalQuestions) * 100 
          : 0;
        const flashcardProgressPct = totalFlashcards > 0 
          ? (masteredFlashcards / totalFlashcards) * 100 
          : 0;

        // Weighted progress (questions are weighted more heavily)
        const overallProgress = Math.round(
          (questionProgress * 0.7) + (flashcardProgressPct * 0.3)
        );

        // Calculate readiness score based on recent performance
        const recentResponses = await prisma.questionResponse.findMany({
          where: {
            userId: user.id,
            question: { examId: exam.id },
            answeredAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        });

        const recentCorrect = recentResponses.filter(r => r.isCorrect).length;
        const recentAccuracy = recentResponses.length > 0 
          ? (recentCorrect / recentResponses.length) * 100 
          : 0;

        // Readiness status
        let readiness: "on-track" | "needs-attention" | "struggling" | "not-started" = "not-started";
        if (overallProgress === 0 && recentResponses.length === 0) {
          readiness = "not-started";
        } else if (recentAccuracy >= 70 && overallProgress >= 50) {
          readiness = "on-track";
        } else if (recentAccuracy >= 50 || overallProgress >= 25) {
          readiness = "needs-attention";
        } else {
          readiness = "struggling";
        }

        return {
          examId: exam.id,
          examCode: exam.code,
          examName: exam.name,
          progress: overallProgress,
          readiness,
          questionsCorrect,
          totalQuestions,
          masteredFlashcards,
          totalFlashcards,
          recentAccuracy: Math.round(recentAccuracy),
          lastActivity: recentSession?.startedAt || assignment.assignedAt,
        };
      })
    );

    // Get recent activity
    const recentActivity = await prisma.quizSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        exam: { select: { code: true, name: true } },
      },
    });

    return NextResponse.json({
      exams: examProgress,
      recentActivity: recentActivity.map(s => ({
        type: s.type === "TIMED_EXAM" ? "exam" : "quiz",
        examCode: s.exam.code,
        score: s.score,
        totalQuestions: s.totalQuestions,
        date: s.completedAt || s.startedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
