import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/quiz/questions?examId=xxx&limit=10
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const limit = parseInt(searchParams.get("limit") || "10");
    const topicId = searchParams.get("topicId");

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    const user = session.user as any;

    // Verify user has access to this exam
    const assignment = await prisma.userExamAssignment.findFirst({
      where: {
        userId: user.id,
        examId: examId,
      },
    });

    // Allow managers to access any exam
    if (!assignment && user.role !== "MANAGER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Not assigned to this exam" }, { status: 403 });
    }

    // Get questions the user hasn't answered correctly yet, prioritizing those
    const answeredCorrectly = await prisma.questionResponse.findMany({
      where: {
        userId: user.id,
        isCorrect: true,
        question: { examId },
      },
      select: { questionId: true },
    });

    const answeredCorrectlyIds = answeredCorrectly.map(r => r.questionId);

    // Build where clause
    const whereClause: any = {
      examId,
      isActive: true,
    };

    if (topicId) {
      whereClause.topicId = topicId;
    }

    // Fetch questions, prioritizing unanswered ones
    const questions = await prisma.question.findMany({
      where: {
        ...whereClause,
        id: { notIn: answeredCorrectlyIds },
      },
      include: {
        answerOptions: {
          select: {
            id: true,
            optionText: true,
            // Don't include isCorrect - that's revealed after answering
          },
        },
        topic: { select: { id: true, name: true } },
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    // If we don't have enough unanswered questions, add some answered ones
    if (questions.length < limit) {
      const additionalQuestions = await prisma.question.findMany({
        where: {
          ...whereClause,
          id: { 
            notIn: [...answeredCorrectlyIds.slice(0, answeredCorrectlyIds.length - (limit - questions.length)), ...questions.map(q => q.id)],
          },
        },
        include: {
          answerOptions: {
            select: {
              id: true,
              optionText: true,
            },
          },
          topic: { select: { id: true, name: true } },
        },
        take: limit - questions.length,
        orderBy: { createdAt: "asc" },
      });
      questions.push(...additionalQuestions);
    }

    // Shuffle questions
    const shuffled = questions.sort(() => Math.random() - 0.5);

    return NextResponse.json({ questions: shuffled });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
