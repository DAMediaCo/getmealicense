import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/manager/exams - List all available exams
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

    const exams = await prisma.exam.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        state: true,
        description: true,
        passingScore: true,
        timeLimit: true,
        _count: {
          select: {
            questions: true,
            flashcards: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      exams: exams.map(e => ({
        ...e,
        questionCount: e._count.questions,
        flashcardCount: e._count.flashcards,
      })),
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}
