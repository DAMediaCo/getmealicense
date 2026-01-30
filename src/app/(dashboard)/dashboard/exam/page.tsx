"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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

function ExamContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const { data: session } = useSession();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [examInfo, setExamInfo] = useState<{ code: string; name: string; timeLimit: number } | null>(null);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number; score: number } | null>(null);

  // Exam selection
  const [selectingExam, setSelectingExam] = useState(!examId);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  
  // Dialogs
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

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

  // Start exam
  const startExam = async (selectedExamId: string) => {
    setLoading(true);
    setSelectingExam(false);
    
    try {
      // Create timed exam session
      const sessionRes = await fetch("/api/quiz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          examId: selectedExamId, 
          mode: "TIMED", 
          totalQuestions: 50 // Full exam
        }),
      });
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.session?.id);
      
      // Set time limit (default 2 hours if not set)
      const timeLimitSeconds = sessionData.session?.timeRemaining || 7200;
      setTimeRemaining(timeLimitSeconds);

      // Fetch questions
      const questionsRes = await fetch(`/api/quiz/questions?examId=${selectedExamId}&limit=50`);
      const questionsData = await questionsRes.json();
      
      if (questionsData.questions?.length > 0) {
        setQuestions(questionsData.questions);
      }
      
      setExamStarted(true);
    } catch (error) {
      console.error("Error starting exam:", error);
    }
    setLoading(false);
  };

  // Timer effect
  useEffect(() => {
    if (!examStarted || isPaused || examFinished || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, isPaused, examFinished]);

  const handleTimeUp = () => {
    setExamFinished(true);
    submitExam();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePause = async () => {
    setIsPaused(true);
    setShowPauseDialog(true);
    
    // Save state to server
    if (sessionId) {
      await fetch("/api/quiz/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "pause",
          timeRemaining,
          questionIndex: currentIndex,
        }),
      });
    }
  };

  const handleResume = async () => {
    setIsPaused(false);
    setShowPauseDialog(false);
    
    if (sessionId) {
      await fetch("/api/quiz/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "resume",
        }),
      });
    }
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const submitExam = async () => {
    setExamFinished(true);
    setShowSubmitDialog(false);

    // Submit all answers
    let correct = 0;
    for (const question of questions) {
      const selectedOption = answers[question.id];
      if (selectedOption) {
        try {
          const res = await fetch("/api/quiz/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: question.id,
              selectedOptionId: selectedOption,
              quizSessionId: sessionId,
            }),
          });
          const data = await res.json();
          if (data.isCorrect) correct++;
        } catch (error) {
          console.error("Error submitting answer:", error);
        }
      }
    }

    // Complete session
    if (sessionId) {
      await fetch("/api/quiz/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "complete",
        }),
      });
    }

    const score = Math.round((correct / questions.length) * 100);
    setResults({ correct, total: questions.length, score });
    setShowResults(true);
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

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
        <h1 className="text-2xl font-bold">Timed Exam</h1>
        <p className="text-gray-500">Select an exam to begin. This will simulate real exam conditions with a timer.</p>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ Once started, the timer will run continuously. You can pause and resume, but plan accordingly.
            </p>
          </CardContent>
        </Card>

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
                  startExam(exam.examId);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{exam.examName}</h3>
                      <p className="text-sm text-gray-500">{exam.examCode}</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {exam.totalQuestions} questions • ~2 hours
                      </p>
                    </div>
                    <Button>Start Exam</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Results screen
  if (showResults && results) {
    const passed = results.score >= 70;
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Exam Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`text-center py-8 rounded-lg ${passed ? "bg-green-50" : "bg-red-50"}`}>
              <div className={`text-6xl font-bold mb-2 ${passed ? "text-green-600" : "text-red-600"}`}>
                {results.score}%
              </div>
              <p className={passed ? "text-green-700" : "text-red-700"}>
                {passed ? "🎉 Congratulations! You passed!" : "Keep studying and try again"}
              </p>
              <p className="text-gray-500 mt-2">
                {results.correct} of {results.total} correct (70% required to pass)
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => {
                setShowResults(false);
                setExamFinished(false);
                setExamStarted(false);
                setAnswers({});
                setCurrentIndex(0);
                setSelectingExam(true);
              }}>
                Try Another Exam
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No questions available for this exam.</p>
            <Button onClick={() => setSelectingExam(true)}>Choose Another Exam</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Timer and Controls Header */}
      <div className="sticky top-0 bg-white z-10 py-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Timed Exam</h1>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-mono font-bold ${timeRemaining < 300 ? "text-red-600" : ""}`}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
            <Button variant="outline" onClick={handlePause}>
              Pause
            </Button>
            <Button onClick={() => setShowSubmitDialog(true)}>
              Submit Exam
            </Button>
          </div>
        </div>
        
        <Progress value={(currentIndex / questions.length) * 100} className="mt-4 h-2" />
        
        <p className="text-xs text-gray-400 mt-2">
          {answeredCount} answered • {unansweredCount} remaining
        </p>
      </div>

      {/* Question */}
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
          {currentQuestion.answerOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className={`w-full justify-start text-left h-auto py-3 px-4 ${
                answers[currentQuestion.id] === option.id
                  ? "bg-blue-100 border-blue-500"
                  : ""
              }`}
              onClick={() => handleSelectAnswer(currentQuestion.id, option.id)}
            >
              {option.optionText}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>
        
        <div className="flex gap-2">
          {/* Question jump buttons */}
          {questions.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((q, idx) => {
            const actualIdx = Math.max(0, currentIndex - 2) + idx;
            return (
              <Button
                key={q.id}
                variant={actualIdx === currentIndex ? "default" : "outline"}
                size="sm"
                className={`w-8 h-8 p-0 ${answers[q.id] ? "bg-green-100 border-green-300" : ""}`}
                onClick={() => setCurrentIndex(actualIdx)}
              >
                {actualIdx + 1}
              </Button>
            );
          })}
        </div>

        <Button
          onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIndex === questions.length - 1}
        >
          Next →
        </Button>
      </div>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exam Paused</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500">
              Your exam is paused. The timer has stopped. You can resume whenever you're ready.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Time remaining: {formatTime(timeRemaining)}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleResume}>Resume Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-500">
              Are you sure you want to submit your exam?
            </p>
            {unansweredCount > 0 && (
              <p className="text-yellow-600 mt-2">
                ⚠️ You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}.
              </p>
            )}
            <p className="text-sm text-gray-400 mt-4">
              Time remaining: {formatTime(timeRemaining)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={submitExam}>Submit Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}
