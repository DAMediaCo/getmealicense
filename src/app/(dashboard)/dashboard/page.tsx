"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ExamProgress {
  examId: string;
  examCode: string;
  examName: string;
  progress: number;
  readiness: "on-track" | "needs-attention" | "struggling" | "not-started";
  questionsCorrect: number;
  totalQuestions: number;
  masteredFlashcards: number;
  totalFlashcards: number;
  recentAccuracy: number;
  lastActivity: string;
}

interface RecentActivity {
  type: string;
  examCode: string;
  score: number | null;
  questionsAnswered: number;
  date: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;
  
  const [exams, setExams] = useState<ExamProgress[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect managers to their dashboard
  useEffect(() => {
    if (status === "authenticated" && (user?.role === "MANAGER" || user?.role === "ADMIN")) {
      router.replace("/manager");
    }
  }, [status, user?.role, router]);

  // Fetch progress data
  useEffect(() => {
    if (status === "authenticated" && user?.role === "STUDENT") {
      fetch("/api/student/progress")
        .then(res => res.json())
        .then(data => {
          setExams(data.exams || []);
          setRecentActivity(data.recentActivity || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching progress:", err);
          setLoading(false);
        });
    }
  }, [status, user?.role]);

  const getReadinessBadge = (readiness: string) => {
    switch (readiness) {
      case "on-track":
        return <Badge className="bg-green-100 text-green-800">On Track</Badge>;
      case "needs-attention":
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Attention</Badge>;
      case "struggling":
        return <Badge className="bg-red-100 text-red-800">Struggling</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-gray-500 mt-1">
          Continue your insurance exam preparation
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/quiz">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📝 Practice Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Test your knowledge with practice questions</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/flashcards">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">🗂️ Flashcards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Review key terms and concepts</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/exam">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">⏱️ Timed Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Simulate the real exam experience</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Assigned Exams */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Assigned Exams</h2>
        {exams.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No exams assigned yet. Contact your manager to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <Card key={exam.examId}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{exam.examName}</h3>
                      <p className="text-sm text-gray-500">{exam.examCode}</p>
                    </div>
                    {getReadinessBadge(exam.readiness)}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{exam.progress}%</span>
                      </div>
                      <Progress value={exam.progress} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{exam.questionsCorrect} / {exam.totalQuestions} questions</span>
                      <span>Last active: {formatTimeAgo(exam.lastActivity)}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/quiz?examId=${exam.examId}`}>
                          Continue Studying
                        </Link>
                      </Button>
                      <Button asChild variant="default" size="sm">
                        <Link href={`/dashboard/exam?examId=${exam.examId}`}>
                          Take Exam
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="divide-y">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="py-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {activity.type === "exam" ? "⏱️" : "📝"}
                    </span>
                    <div>
                      <p className="font-medium">
                        {activity.type === "exam" ? "Timed Exam" : "Practice Quiz"}
                        {activity.score !== null && ` - ${activity.score}%`}
                      </p>
                      <p className="text-sm text-gray-500">{activity.examCode}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimeAgo(activity.date)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
