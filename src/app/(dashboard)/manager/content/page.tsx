"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Exam {
  id: string;
  code: string;
  name: string;
  questionCount: number;
  flashcardCount: number;
}

export default function ManagerContentPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/exams")
      .then(r => r.json())
      .then(data => {
        setExams(data.exams || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalQuestions = exams.reduce((sum, e) => sum + e.questionCount, 0);
  const totalFlashcards = exams.reduce((sum, e) => sum + e.flashcardCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-gray-500">Manage exam questions, flashcards, and study guides</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{exams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Flashcards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFlashcards}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Study Guides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-400">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Content by Exam */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Exams</TabsTrigger>
          {exams.map(exam => (
            <TabsTrigger key={exam.id} value={exam.id}>{exam.code}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4">
            {exams.map(exam => (
              <Card key={exam.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{exam.name}</h3>
                      <p className="text-sm text-gray-500">{exam.code}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{exam.questionCount} questions</Badge>
                      <Badge variant="outline">{exam.flashcardCount} flashcards</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      + Add Questions
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      + Add Flashcards
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      + Add Study Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {exams.map(exam => (
          <TabsContent key={exam.id} value={exam.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{exam.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Questions ({exam.questionCount})</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Multiple choice questions for practice quizzes and timed exams.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Manage Questions
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Flashcards ({exam.flashcardCount})</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Term/definition cards for spaced repetition review.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Manage Flashcards
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Study Guides</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Markdown-formatted study materials organized by topic.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Manage Study Guides
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="py-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ Content editing UI coming soon. For now, content is managed via database seed scripts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
