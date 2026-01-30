import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/quiz/submit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { questionId, selectedOptionId, quizSessionId, timeSpent } = body;

    if (!questionId || !selectedOptionId) {
      return NextResponse.json(
        { error: "questionId and selectedOptionId are required" },
        { status: 400 }
      );
    }

    // Get the question with correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        answerOptions: true,
        topic: { select: { id: true, name: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Find the correct answer
    const correctOption = question.answerOptions.find(opt => opt.isCorrect);
    const isCorrect = selectedOptionId === correctOption?.id;

    // Record the response
    const response = await prisma.questionResponse.create({
      data: {
        userId: user.id,
        questionId,
        selectedOptionId,
        isCorrect,
        timeSpent: timeSpent || null,
        quizSessionId: quizSessionId || null,
      },
    });

    // Update quiz session if provided
    if (quizSessionId) {
      await prisma.quizSession.update({
        where: { id: quizSessionId },
        data: {
          correctAnswers: isCorrect ? { increment: 1 } : undefined,
        },
      });
    }

    return NextResponse.json({
      isCorrect,
      correctOptionId: correctOption?.id,
      explanation: question.explanation,
      topic: question.topic,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
