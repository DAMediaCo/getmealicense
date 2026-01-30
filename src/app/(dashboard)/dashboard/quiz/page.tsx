"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AnswerOption {
  id: string;
  optionText: string;
}

interface Question {
  id: string;
  questionText: string;
  answerOptions: AnswerOption[];
  topic?: { id: string; name: string };
}

interface SubmitResult {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string | null;
}

function QuizContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const { data: session } = useSession();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [examInfo, setExamInfo] = useState<{ code: string; name: string } | null>(null);
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

  // Start quiz session and fetch questions
  useEffect(() => {
    if (examId && session) {
      setSelectingExam(false);
      startQuiz(examId);
    }
  }, [examId, session]);

  const startQuiz = async (selectedExamId: string) => {
    setLoading(true);
    try {
      // Create quiz session
      const sessionRes = await fetch("/api/quiz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: selectedExamId, mode: "PRACTICE", totalQuestions: 10 }),
      });
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.session?.id);

      // Fetch questions
      const questionsRes = await fetch(`/api/quiz/questions?examId=${selectedExamId}&limit=10`);
      const questionsData = await questionsRes.json();
      
      if (questionsData.questions?.length > 0) {
        setQuestions(questionsData.questions);
        setExamInfo({ 
          code: questionsData.questions[0]?.exam?.code || selectedExamId, 
          name: questionsData.questions[0]?.exam?.name || "Practice Quiz" 
        });
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !questions[currentIndex]) return;

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questions[currentIndex].id,
          selectedOptionId: selectedAnswer,
          quizSessionId: sessionId,
        }),
      });
      const data = await res.json();
      setResult(data);
      setScore(prev => ({
        correct: prev.correct + (data.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setResult(null);
    setCurrentIndex(prev => prev + 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResult(null);
    setScore({ correct: 0, total: 0 });
    if (examId) {
      startQuiz(examId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Exam selection screen
  if (selectingExam) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Practice Quiz</h1>
        <p className="text-gray-500">Select an exam to practice</p>
        
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
                  startQuiz(exam.examId);
                }}
              >
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{exam.examName}</h3>
                    <p className="text-sm text-gray-500">{exam.examCode} • {exam.totalQuestions} questions</p>
                  </div>
                  <Badge variant="outline">{exam.progress}% complete</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // No questions available
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No questions available for this exam yet.</p>
            <Button onClick={() => setSelectingExam(true)}>Choose Another Exam</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz complete
  if (currentIndex >= questions.length) {
    const percentage = Math.round((score.correct / score.total) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Complete! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
              <p className="text-gray-500">
                You got {score.correct} out of {score.total} questions correct
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={handleRestart}>Try Again</Button>
              <Button variant="outline" onClick={() => setSelectingExam(true)}>
                Different Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Practice Quiz</h1>
          {examInfo && <p className="text-sm text-gray-500">{examInfo.code}</p>}
        </div>
        <Badge variant="outline">
          {currentIndex + 1} / {questions.length}
        </Badge>
      </div>

      <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />

      {/* Question card */}
      <Card>
        <CardHeader>
          {currentQuestion.topic && (
            <Badge variant="secondary" className="w-fit mb-2">
              {currentQuestion.topic.name}
            </Badge>
          )}
          <CardTitle className="text-lg font-medium leading-relaxed">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.answerOptions.map((option) => {
            let buttonClass = "w-full justify-start text-left h-auto py-3 px-4";
            
            if (result) {
              if (option.id === result.correctOptionId) {
                buttonClass += " bg-green-100 border-green-500 text-green-800";
              } else if (option.id === selectedAnswer && !result.isCorrect) {
                buttonClass += " bg-red-100 border-red-500 text-red-800";
              }
            } else if (option.id === selectedAnswer) {
              buttonClass += " bg-blue-100 border-blue-500";
            }

            return (
              <Button
                key={option.id}
                variant="outline"
                className={buttonClass}
                onClick={() => !result && setSelectedAnswer(option.id)}
                disabled={!!result}
              >
                {option.optionText}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Result feedback */}
      {result && (
        <Card className={result.isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <CardContent className="py-4">
            <p className="font-semibold mb-2">
              {result.isCorrect ? "✅ Correct!" : "❌ Incorrect"}
            </p>
            {result.explanation && (
              <p className="text-sm text-gray-700">{result.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-4">
        {!result ? (
          <Button onClick={handleSubmit} disabled={!selectedAnswer}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
          </Button>
        )}
      </div>

      {/* Score tracker */}
      <div className="text-center text-sm text-gray-500">
        Current score: {score.correct} / {score.total}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
