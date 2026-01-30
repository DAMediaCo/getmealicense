"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AnswerOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  explanation: string | null;
  answerOptions: AnswerOption[];
  topicName?: string;
}

// Mock questions - will be replaced with API
const mockQuestions: Question[] = [
  {
    id: "1",
    questionText: "What is the primary purpose of life insurance?",
    explanation: "Life insurance provides financial protection for dependents in case of the insured's death, helping replace lost income and cover expenses.",
    topicName: "Life Insurance Basics",
    answerOptions: [
      { id: "1a", optionText: "To provide financial protection for dependents", isCorrect: true },
      { id: "1b", optionText: "To generate investment returns", isCorrect: false },
      { id: "1c", optionText: "To reduce tax liability", isCorrect: false },
      { id: "1d", optionText: "To qualify for government benefits", isCorrect: false },
    ],
  },
  {
    id: "2",
    questionText: "Which type of life insurance provides coverage for a specific period?",
    explanation: "Term life insurance provides coverage for a specific period (term), such as 10, 20, or 30 years. If the insured dies during this period, beneficiaries receive the death benefit.",
    topicName: "Life Insurance Basics",
    answerOptions: [
      { id: "2a", optionText: "Whole life insurance", isCorrect: false },
      { id: "2b", optionText: "Term life insurance", isCorrect: true },
      { id: "2c", optionText: "Universal life insurance", isCorrect: false },
      { id: "2d", optionText: "Variable life insurance", isCorrect: false },
    ],
  },
  {
    id: "3",
    questionText: "What is the 'free look' period in insurance?",
    explanation: "The free look period (typically 10-30 days) allows policyholders to review their new policy and return it for a full refund if not satisfied.",
    topicName: "Policy Provisions",
    answerOptions: [
      { id: "3a", optionText: "Time to compare quotes from different insurers", isCorrect: false },
      { id: "3b", optionText: "Period when no premiums are due", isCorrect: false },
      { id: "3c", optionText: "Time to review and potentially return a new policy for full refund", isCorrect: true },
      { id: "3d", optionText: "Period of guaranteed insurability", isCorrect: false },
    ],
  },
  {
    id: "4", 
    questionText: "What does 'annuitant' mean?",
    explanation: "The annuitant is the person whose life expectancy is used to calculate annuity payments. They receive the periodic payments from the annuity contract.",
    topicName: "Annuities",
    answerOptions: [
      { id: "4a", optionText: "The insurance company issuing the annuity", isCorrect: false },
      { id: "4b", optionText: "The person who receives annuity payments", isCorrect: true },
      { id: "4c", optionText: "The beneficiary of an annuity", isCorrect: false },
      { id: "4d", optionText: "The agent who sold the annuity", isCorrect: false },
    ],
  },
  {
    id: "5",
    questionText: "What is a 'grace period' in insurance?",
    explanation: "The grace period is a specified time after the premium due date during which the policy remains in force even if the premium hasn't been paid. Typically 30-31 days for life insurance.",
    topicName: "Policy Provisions",
    answerOptions: [
      { id: "5a", optionText: "Time before coverage begins", isCorrect: false },
      { id: "5b", optionText: "Period after premium due date when policy stays active", isCorrect: true },
      { id: "5c", optionText: "Waiting period for pre-existing conditions", isCorrect: false },
      { id: "5d", optionText: "Time to file a claim after a loss", isCorrect: false },
    ],
  },
];

type QuizState = "idle" | "active" | "review" | "complete";

export default function QuizPage() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("exam");
  
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { selected: string; correct: boolean }>>({});

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const correctCount = Object.values(answers).filter(a => a.correct).length;

  const startQuiz = () => {
    // Shuffle questions for variety
    const shuffled = [...mockQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setAnswers({});
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizState("active");
  };

  const handleAnswerSelect = (optionId: string) => {
    if (showExplanation) return; // Already answered
    setSelectedAnswer(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    
    const selectedOption = currentQuestion.answerOptions.find(o => o.id === selectedAnswer);
    const isCorrect = selectedOption?.isCorrect ?? false;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: selectedAnswer, correct: isCorrect }
    }));
    
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizState("complete");
    }
  };

  const getOptionClass = (option: AnswerOption) => {
    const baseClass = "p-4 rounded-lg border-2 cursor-pointer transition-all";
    
    if (!showExplanation) {
      if (selectedAnswer === option.id) {
        return `${baseClass} border-blue-500 bg-blue-50`;
      }
      return `${baseClass} border-gray-200 hover:border-gray-300 hover:bg-gray-50`;
    }
    
    // After answer submitted
    if (option.isCorrect) {
      return `${baseClass} border-green-500 bg-green-50`;
    }
    if (selectedAnswer === option.id && !option.isCorrect) {
      return `${baseClass} border-red-500 bg-red-50`;
    }
    return `${baseClass} border-gray-200 bg-gray-50 opacity-50`;
  };

  // Idle state - quiz not started
  if (quizState === "idle") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Practice Quiz</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Ready to practice?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              This practice quiz will test your knowledge with multiple choice questions.
              You'll get immediate feedback and explanations after each question.
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>📝 {mockQuestions.length} questions</span>
              <span>⏱️ No time limit</span>
              <span>💡 Explanations included</span>
            </div>
            
            <Button onClick={startQuiz} size="lg" className="w-full">
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state - quiz finished
  if (quizState === "complete") {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= 70;
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Quiz Complete!</h1>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            <div className={`text-6xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {percentage}%
            </div>
            
            <div className="text-xl">
              {correctCount} out of {questions.length} correct
            </div>
            
            <Badge className={passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {passed ? '✓ Passed' : '✗ Needs More Practice'}
            </Badge>
            
            <div className="pt-4 space-x-4">
              <Button onClick={startQuiz}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setQuizState("review")}>
                Review Answers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review state - reviewing answers
  if (quizState === "review") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Review Answers</h1>
          <Button variant="outline" onClick={() => setQuizState("complete")}>
            Back to Results
          </Button>
        </div>
        
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const answer = answers[q.id];
            const isCorrect = answer?.correct;
            
            return (
              <Card key={q.id} className={isCorrect ? 'border-green-200' : 'border-red-200'}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-500">Question {idx + 1}</span>
                    <Badge className={isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </Badge>
                  </div>
                  
                  <p className="font-medium">{q.questionText}</p>
                  
                  <div className="space-y-2">
                    {q.answerOptions.map(opt => (
                      <div 
                        key={opt.id}
                        className={`p-2 rounded text-sm ${
                          opt.isCorrect 
                            ? 'bg-green-50 text-green-800' 
                            : answer?.selected === opt.id 
                              ? 'bg-red-50 text-red-800'
                              : 'text-gray-500'
                        }`}
                      >
                        {opt.isCorrect && '✓ '}{opt.optionText}
                      </div>
                    ))}
                  </div>
                  
                  {q.explanation && (
                    <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Active state - taking quiz
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{correctCount} correct so far</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          {currentQuestion?.topicName && (
            <Badge variant="outline" className="w-fit mb-2">
              {currentQuestion.topicName}
            </Badge>
          )}
          <CardTitle className="text-lg leading-relaxed">
            {currentQuestion?.questionText}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Answer options */}
          <div className="space-y-3">
            {currentQuestion?.answerOptions.map((option, idx) => (
              <div
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                className={getOptionClass(option)}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-500">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{option.optionText}</span>
                  {showExplanation && option.isCorrect && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                  {showExplanation && selectedAnswer === option.id && !option.isCorrect && (
                    <span className="ml-auto text-red-600">✗</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          {showExplanation && currentQuestion?.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Explanation:</strong> {currentQuestion.explanation}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {!showExplanation ? (
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
