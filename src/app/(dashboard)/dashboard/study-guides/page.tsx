"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface StudyGuide {
  id: string;
  title: string;
  content: string;
  topic?: { id: string; name: string };
  completed: boolean;
}

interface GuidesByTopic {
  [topic: string]: {
    id: string;
    title: string;
    completed: boolean;
  }[];
}

function StudyGuidesContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const guideId = searchParams.get("guideId");
  const { data: session } = useSession();

  const [guides, setGuides] = useState<GuidesByTopic>({});
  const [stats, setStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [currentGuide, setCurrentGuide] = useState<StudyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingExam, setSelectingExam] = useState(!examId);
  const [availableExams, setAvailableExams] = useState<any[]>([]);

  // Fetch available exams if none selected
  useEffect(() => {
    if (!examId && session) {
      fetch("/api/student/progress")
        .then(res => res.json())
        .then(data => {
          setAvailableExams(data.exams || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [examId, session]);

  // Fetch guides list
  useEffect(() => {
    if (examId && session && !guideId) {
      setSelectingExam(false);
      fetchGuides(examId);
    }
  }, [examId, session, guideId]);

  // Fetch single guide
  useEffect(() => {
    if (guideId && session) {
      fetchGuide(guideId);
    }
  }, [guideId, session]);

  const fetchGuides = async (selectedExamId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study-guides?examId=${selectedExamId}`);
      const data = await res.json();
      setGuides(data.guides || {});
      setStats(data.stats || { total: 0, completed: 0, percentage: 0 });
    } catch (error) {
      console.error("Error fetching guides:", error);
    }
    setLoading(false);
  };

  const fetchGuide = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study-guides?id=${id}`);
      const data = await res.json();
      setCurrentGuide(data.guide);
    } catch (error) {
      console.error("Error fetching guide:", error);
    }
    setLoading(false);
  };

  const markComplete = async (studyGuideId: string, completed: boolean) => {
    try {
      await fetch("/api/study-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studyGuideId, completed }),
      });

      if (currentGuide?.id === studyGuideId) {
        setCurrentGuide({ ...currentGuide, completed });
      }

      // Refresh guides list
      if (examId) {
        fetchGuides(examId);
      }
    } catch (error) {
      console.error("Error marking complete:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Exam selection
  if (selectingExam) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Study Guides</h1>
        <p className="text-gray-500">Select an exam to view study materials</p>

        {availableExams.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No exams assigned yet. Contact your manager.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {availableExams.map((exam) => (
              <Card
                key={exam.examId}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  window.history.pushState({}, "", `?examId=${exam.examId}`);
                  setSelectingExam(false);
                  fetchGuides(exam.examId);
                }}
              >
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{exam.examName}</h3>
                    <p className="text-sm text-gray-500">{exam.examCode}</p>
                  </div>
                  <Button variant="outline">View Guides</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single guide view
  if (currentGuide) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentGuide(null);
              window.history.pushState({}, "", `?examId=${examId}`);
            }}
          >
            ← Back to Guides
          </Button>
        </div>

        <Card>
          <CardHeader>
            {currentGuide.topic && (
              <Badge variant="secondary" className="w-fit mb-2">
                {currentGuide.topic.name}
              </Badge>
            )}
            <CardTitle>{currentGuide.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(currentGuide.content) }}
            />

            <div className="mt-8 pt-6 border-t flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={currentGuide.completed}
                  onCheckedChange={(checked) => markComplete(currentGuide.id, !!checked)}
                />
                <span className="text-sm">Mark as completed</span>
              </label>

              {currentGuide.completed && (
                <Badge className="bg-green-100 text-green-800">✓ Completed</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guides list
  const topicNames = Object.keys(guides);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Study Guides</h1>
          <p className="text-gray-500">
            {stats.completed} of {stats.total} completed
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {stats.percentage}%
        </Badge>
      </div>

      <Progress value={stats.percentage} className="h-3" />

      {topicNames.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No study guides available for this exam yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {topicNames.map((topic) => (
            <Card key={topic}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{topic}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {guides[topic].map((guide) => (
                    <div
                      key={guide.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        window.history.pushState({}, "", `?examId=${examId}&guideId=${guide.id}`);
                        fetchGuide(guide.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            guide.completed
                              ? "bg-green-500 border-green-500"
                              : "border-gray-300"
                          }`}
                        >
                          {guide.completed && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <span className={guide.completed ? "text-gray-500" : ""}>
                          {guide.title}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        Read →
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple markdown formatter (basic)
function formatMarkdown(content: string): string {
  let html = content
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-4">');
  
  // Wrap consecutive li elements in ul
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, '<ul class="list-disc my-4">$&</ul>');
  
  return html;
}

export default function StudyGuidesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <StudyGuidesContent />
    </Suspense>
  );
}
