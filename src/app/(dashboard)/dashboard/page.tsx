"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  // Redirect managers to their dashboard
  useEffect(() => {
    if (status === "authenticated" && (user?.role === "MANAGER" || user?.role === "ADMIN")) {
      router.replace("/manager");
    }
  }, [status, user?.role, router]);

  // Mock data - will be replaced with real API calls
  const assignedExams = [
    {
      id: "1",
      code: "FL-2-15",
      name: "Florida 2-15 (Life, Health, Annuities)",
      progress: 45,
      readiness: "on-track",
      questionsAnswered: 68,
      totalQuestions: 151,
      lastActivity: "2 hours ago",
    },
    {
      id: "2", 
      code: "FL-2-40",
      name: "Florida 2-40 (Health Only)",
      progress: 12,
      readiness: "needs-attention",
      questionsAnswered: 8,
      totalQuestions: 75,
      lastActivity: "1 day ago",
    },
  ];

  const recentActivity = [
    { type: "quiz", exam: "FL-2-15", score: "85%", date: "2 hours ago" },
    { type: "flashcard", exam: "FL-2-15", cards: 25, date: "Yesterday" },
    { type: "study-guide", exam: "FL-2-15", topic: "Life Insurance Basics", date: "Yesterday" },
  ];

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignedExams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{exam.name}</CardTitle>
                    <CardDescription>{exam.code}</CardDescription>
                  </div>
                  {getReadinessBadge(exam.readiness)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{exam.progress}%</span>
                  </div>
                  <Progress value={exam.progress} className="h-2" />
                </div>
                
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{exam.questionsAnswered} / {exam.totalQuestions} questions</span>
                  <span>Last active: {exam.lastActivity}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/dashboard/quiz?exam=${exam.id}`}>
                      Continue Studying
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/exam?exam=${exam.id}`}>
                      Take Exam
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {activity.type === "quiz" && "📝"}
                      {activity.type === "flashcard" && "🗂️"}
                      {activity.type === "study-guide" && "📖"}
                    </span>
                    <div>
                      <p className="font-medium">
                        {activity.type === "quiz" && `Practice Quiz - ${activity.score}`}
                        {activity.type === "flashcard" && `Reviewed ${activity.cards} flashcards`}
                        {activity.type === "study-guide" && activity.topic}
                      </p>
                      <p className="text-sm text-gray-500">{activity.exam}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{activity.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
