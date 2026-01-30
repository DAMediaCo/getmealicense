"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface AnswerOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  answerOptions: AnswerOption[];
}

// Mock exam questions
const mockExamQuestions: Question[] = [
  {
    id: "e1",
    questionText: "A policy loan is typically available on which type of life insurance?",
    answerOptions: [
      { id: "e1a", optionText: "Term life insurance", isCorrect: false },
      { id: "e1b", optionText: "Whole life insurance", isCorrect: true },
      { id: "e1c", optionText: "Group term life insurance", isCorrect: false },
      { id: "e1d", optionText: "Decreasing term insurance", isCorrect: false },
    ],
  },
  {
    id: "e2",
    questionText: "Which of the following is NOT a standard provision in life insurance policies?",
    answerOptions: [
      { id: "e2a", optionText: "Grace period", isCorrect: false },
      { id: "e2b", optionText: "Incontestability clause", isCorrect: false },
      { id: "e2c", optionText: "Guaranteed insurability rider", isCorrect: true },
      { id: "e2d", optionText: "Suicide clause", isCorrect: false },
    ],
  },
  {
    id: "e3",
    questionText: "The elimination period in a disability policy refers to:",
    answerOptions: [
      { id: "e3a", optionText: "The waiting period before benefits begin", isCorrect: true },
      { id: "e3b", optionText: "The maximum benefit period", isCorrect: false },
      { id: "e3c", optionText: "The contestability period", isCorrect: false },
      { id: "e3d", optionText: "The policy renewal date", isCorrect: false },
    ],
  },
  {
    id: "e4",
    questionText: "What type of annuity guarantees payments for the lifetime of the annuitant?",
    answerOptions: [
      { id: "e4a", optionText: "Period certain annuity", isCorrect: false },
      { id: "e4b", optionText: "Life annuity", isCorrect: true },
      { id: "e4c", optionText: "Fixed period annuity", isCorrect: false },
      { id: "e4d", optionText: "Deferred annuity", isCorrect: false },
    ],
  },
  {
    id: "e5",
    questionText: "Coinsurance in health insurance typically means:",
    answerOptions: [
      { id: "e5a", optionText: "The insured pays a percentage of covered expenses after the deductible", isCorrect: true },
      { id: "e5b", optionText: "Two insurance companies share the risk", isCorrect: false },
      { id: "e5c", optionText: "The insured must have two policies", isCorrect: false },
      { id: "e5d", optionText: "The insurer pays 100% of all costs", isCorrect: false },
    ],
  },
];

type ExamState = "idle" | "active" | "paused" | "complete";

export default function ExamPage() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("exam");
  
  const [examState, setExamState] = useState<ExamState>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const EXAM_TIME_MINUTES = 30; // 30 minute exam
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Timer effect
  useEffect(() => {
    if (examState !== "active" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setExamState("complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startExam = () => {
    const shuffled = [...mockExamQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setAnswers({});
    setTimeRemaining(EXAM_TIME_MINUTES * 60);
    setExamState("active");
  };

  const pauseExam = () => {
    setExamState("paused");
    setShowPauseDialog(true);
  };

  const resumeExam = () => {
    setShowPauseDialog(false);
    setExamState("active");
  };

  const handleAnswerSelect = (optionId: string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const submitExam = () => {
    setShowSubmitDialog(false);
    setExamState("complete");
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      const selectedId = answers[q.id];
      const selectedOption = q.answerOptions.find(o => o.id === selectedId);
      if (selectedOption?.isCorrect) correct++;
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  // Idle state
  if (examState === "idle") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Timed Exam</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Practice Exam - FL 2-15</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Simulate the real exam experience with a timed practice test. 
              You can pause and resume if needed.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">⚠️ Exam Rules</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• {mockExamQuestions.length} questions, {EXAM_TIME_MINUTES} minutes</li>
                <li>• Passing score: 70%</li>
                <li>• You can navigate between questions</li>
                <li>• Pause available (time stops)</li>
                <li>• No explanations until after submission</li>
              </ul>
            </div>
            
            <Button onClick={startExam} size="lg" className="w-full">
              Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state
  if (examState === "complete") {
    const score = calculateScore();
    const passed = score.percentage >= 70;
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Exam Complete</h1>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            <div className={`text-6xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {score.percentage}%
            </div>
            
            <div className="text-xl">
              {score.correct} out of {score.total} correct
            </div>
            
            <Badge className={`text-lg px-4 py-2 ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {passed ? '✓ PASSED' : '✗ DID NOT PASS'}
            </Badge>
            
            <p className="text-gray-500">
              {passed 
                ? "Great job! You're on track for the real exam." 
                : "Keep studying! Review the topics you missed."}
            </p>
            
            <div className="pt-4 space-x-4">
              <Button onClick={startExam}>
                Retake Exam
              </Button>
              <Button variant="outline" onClick={() => setExamState("idle")}>
                Back to Overview
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Answer Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const selectedId = answers[q.id];
                const selectedOption = q.answerOptions.find(o => o.id === selectedId);
                const correctOption = q.answerOptions.find(o => o.isCorrect);
                const isCorrect = selectedOption?.isCorrect;
                
                return (
                  <div 
                    key={q.id}
                    className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {idx + 1}. {q.questionText}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Your answer: {selectedOption?.optionText || "Not answered"}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-green-700 mt-1">
                            Correct: {correctOption?.optionText}
                          </p>
                        )}
                      </div>
                      <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active/Paused state
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header with timer */}
      <div className="sticky top-0 bg-white z-10 py-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Practice Exam</h1>
            <p className="text-sm text-gray-500">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-2xl font-mono font-bold ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
              ⏱️ {formatTime(timeRemaining)}
            </div>
            <Button variant="outline" size="sm" onClick={pauseExam}>
              Pause
            </Button>
            <Button size="sm" onClick={() => setShowSubmitDialog(true)}>
              Submit Exam
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question navigation */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`
                      w-8 h-8 rounded text-sm font-medium
                      ${idx === currentIndex ? 'ring-2 ring-blue-500' : ''}
                      ${answers[q.id] 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current question */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <Badge variant="outline">Question {currentIndex + 1}</Badge>
              </div>
              <CardTitle className="text-lg leading-relaxed mt-2">
                {currentQuestion?.questionText}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Answer options */}
              <div className="space-y-3">
                {currentQuestion?.answerOptions.map((option, idx) => {
                  const isSelected = answers[currentQuestion.id] === option.id;
                  
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm
                          ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}
                        `}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option.optionText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline"
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  ← Previous
                </Button>
                <Button 
                  onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exam Paused</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Your exam is paused. The timer has stopped. Click resume when you're ready to continue.
          </p>
          <DialogFooter>
            <Button onClick={resumeExam}>Resume Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to submit your exam?
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span>Questions answered:</span>
                <span className="font-medium">{answeredCount} of {questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Time remaining:</span>
                <span className="font-medium">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            {answeredCount < questions.length && (
              <p className="text-amber-600 text-sm">
                ⚠️ You have {questions.length - answeredCount} unanswered question(s).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Continue Exam
            </Button>
            <Button onClick={submitExam}>
              Submit Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
