import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/flashcards?examId=xxx - Get flashcards for review
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const mode = searchParams.get("mode") || "review"; // review, all, new

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    // Get flashcards with user's progress
    let flashcards;

    if (mode === "new") {
      // Get flashcards user hasn't seen yet
      const seenFlashcardIds = await prisma.flashcardProgress.findMany({
        where: { userId: user.id },
        select: { flashcardId: true },
      });

      flashcards = await prisma.flashcard.findMany({
        where: {
          examId,
          isActive: true,
          id: { notIn: seenFlashcardIds.map(f => f.flashcardId) },
        },
        include: {
          topic: { select: { id: true, name: true } },
        },
        take: limit,
      });
    } else if (mode === "review") {
      // Get flashcards due for review (spaced repetition)
      const now = new Date();
      
      const dueProgress = await prisma.flashcardProgress.findMany({
        where: {
          userId: user.id,
          flashcard: { examId, isActive: true },
          nextReview: { lte: now },
        },
        include: {
          flashcard: {
            include: {
              topic: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { nextReview: "asc" },
        take: limit,
      });

      flashcards = dueProgress.map(p => ({
        ...p.flashcard,
        progress: {
          masteryLevel: p.masteryLevel,
          reviewCount: p.reviewCount,
        } as { masteryLevel: number; reviewCount: number } | null,
      }));

      // If not enough due, add some new ones
      if (flashcards.length < limit) {
        const seenIds = flashcards.map((f: any) => f.id);
        const allProgressIds = await prisma.flashcardProgress.findMany({
          where: { userId: user.id },
          select: { flashcardId: true },
        });

        const newFlashcards = await prisma.flashcard.findMany({
          where: {
            examId,
            isActive: true,
            id: { 
              notIn: [...seenIds, ...allProgressIds.map(p => p.flashcardId)]
            },
          },
          include: {
            topic: { select: { id: true, name: true } },
          },
          take: limit - flashcards.length,
        });

        flashcards.push(...newFlashcards.map(f => ({ ...f, progress: null as { masteryLevel: number; reviewCount: number } | null })));
      }
    } else {
      // Get all flashcards
      flashcards = await prisma.flashcard.findMany({
        where: {
          examId,
          isActive: true,
        },
        include: {
          topic: { select: { id: true, name: true } },
          progress: {
            where: { userId: user.id },
            select: { masteryLevel: true, reviewCount: true },
          },
        },
        take: limit,
      });

      flashcards = flashcards.map(f => ({
        ...f,
        progress: f.progress[0] || null,
      }));
    }

    // Shuffle for variety
    const shuffled = flashcards.sort(() => Math.random() - 0.5);

    return NextResponse.json({ flashcards: shuffled });
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    return NextResponse.json({ error: "Failed to fetch flashcards" }, { status: 500 });
  }
}

// POST /api/flashcards - Record flashcard review result
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { flashcardId, quality } = body; // quality: 0-5 (how well they knew it)

    if (!flashcardId || quality === undefined) {
      return NextResponse.json(
        { error: "flashcardId and quality are required" },
        { status: 400 }
      );
    }

    // Get or create progress record
    const existing = await prisma.flashcardProgress.findUnique({
      where: {
        userId_flashcardId: {
          userId: user.id,
          flashcardId,
        },
      },
    });

    // Calculate new mastery level and next review date using SM-2 algorithm
    let masteryLevel = existing?.masteryLevel || 0;
    let reviewCount = (existing?.reviewCount || 0) + 1;

    // Adjust mastery based on quality
    if (quality >= 3) {
      // Correct response
      masteryLevel = Math.min(5, masteryLevel + 1);
    } else if (quality <= 1) {
      // Wrong response - reset progress
      masteryLevel = Math.max(0, masteryLevel - 2);
    } else {
      // Partial/hesitant - small decrease
      masteryLevel = Math.max(0, masteryLevel - 1);
    }

    // Calculate next review interval (SM-2 inspired)
    const intervals = [1, 3, 7, 14, 30, 60]; // days
    const intervalDays = intervals[masteryLevel] || 60;
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);

    // Update or create progress
    const progress = await prisma.flashcardProgress.upsert({
      where: {
        userId_flashcardId: {
          userId: user.id,
          flashcardId,
        },
      },
      update: {
        masteryLevel,
        reviewCount,
        nextReview,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        flashcardId,
        masteryLevel,
        reviewCount,
        nextReview,
      },
    });

    return NextResponse.json({
      progress,
      nextReviewIn: `${intervalDays} days`,
    });
  } catch (error) {
    console.error("Error recording flashcard progress:", error);
    return NextResponse.json({ error: "Failed to record progress" }, { status: 500 });
  }
}
