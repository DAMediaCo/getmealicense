import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/study-guides?examId=xxx - Get study guides for an exam
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    const guideId = searchParams.get("id");

    // Get single guide by ID
    if (guideId) {
      const guide = await prisma.studyGuide.findUnique({
        where: { id: guideId },
        include: {
          topic: { select: { id: true, name: true } },
          progress: {
            where: { userId: user.id },
            select: { completed: true, completedAt: true },
          },
        },
      });

      if (!guide) {
        return NextResponse.json({ error: "Guide not found" }, { status: 404 });
      }

      return NextResponse.json({
        guide: {
          ...guide,
          completed: guide.progress[0]?.completed || false,
        },
      });
    }

    // Get all guides for exam
    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    const guides = await prisma.studyGuide.findMany({
      where: {
        examId,
        isActive: true,
      },
      include: {
        topic: { select: { id: true, name: true } },
        progress: {
          where: { userId: user.id },
          select: { completed: true, completedAt: true },
        },
      },
      orderBy: [
        { topic: { name: "asc" } },
        { sortOrder: "asc" },
      ],
    });

    // Group by topic
    const byTopic: Record<string, any[]> = {};
    guides.forEach(guide => {
      const topicName = guide.topic?.name || "General";
      if (!byTopic[topicName]) {
        byTopic[topicName] = [];
      }
      byTopic[topicName].push({
        id: guide.id,
        title: guide.title,
        topicId: guide.topicId,
        completed: guide.progress[0]?.completed || false,
      });
    });

    const completedCount = guides.filter(g => g.progress[0]?.completed).length;

    return NextResponse.json({
      guides: byTopic,
      stats: {
        total: guides.length,
        completed: completedCount,
        percentage: guides.length > 0 ? Math.round((completedCount / guides.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching study guides:", error);
    return NextResponse.json({ error: "Failed to fetch study guides" }, { status: 500 });
  }
}

// POST /api/study-guides - Mark guide as complete/incomplete
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body = await req.json();
    const { studyGuideId, completed } = body;

    if (!studyGuideId) {
      return NextResponse.json({ error: "studyGuideId is required" }, { status: 400 });
    }

    const progress = await prisma.studyGuideProgress.upsert({
      where: {
        userId_studyGuideId: {
          userId: user.id,
          studyGuideId,
        },
      },
      update: {
        completed: completed ?? true,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: user.id,
        studyGuideId,
        completed: completed ?? true,
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error("Error updating study guide progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
