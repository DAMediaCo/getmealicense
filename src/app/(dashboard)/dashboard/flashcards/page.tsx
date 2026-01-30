"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Flashcard {
  id: string;
  frontText: string;
  backText: string;
  topic?: { id: string; name: string };
  progress?: {
    masteryLevel: number;
    reviewCount: number;
  } | null;
}

function FlashcardsContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const { data: session } = useSession();
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectingExam, setSelectingExam] = useState(!examId);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [stats, setStats] = useState({ reviewed: 0, mastered: 0 });

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

  // Fetch flashcards
  useEffect(() => {
    if (examId && session) {
      setSelectingExam(false);
      fetchFlashcards(examId);
    }
  }, [examId, session]);

  const fetchFlashcards = async (selectedExamId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flashcards?examId=${selectedExamId}&mode=review&limit=20`);
      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
    }
    setLoading(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleRate = async (quality: number) => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    try {
      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          quality,
        }),
      });

      setStats(prev => ({
        reviewed: prev.reviewed + 1,
        mastered: quality >= 4 ? prev.mastered + 1 : prev.mastered,
      }));
    } catch (error) {
      console.error("Error recording progress:", error);
    }

    // Move to next card
    setIsFlipped(false);
    setCurrentIndex(prev => prev + 1);
  };

  const getMasteryColor = (level: number) => {
    if (level >= 4) return "bg-green-100 text-green-800";
    if (level >= 2) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getMasteryLabel = (level: number) => {
    if (level >= 4) return "Mastered";
    if (level >= 2) return "Learning";
    return "New";
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
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-gray-500">Select an exam to review flashcards</p>
        
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
                  fetchFlashcards(exam.examId);
                }}
              >
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{exam.examName}</h3>
                    <p className="text-sm text-gray-500">
                      {exam.examCode} • {exam.masteredFlashcards}/{exam.totalFlashcards} mastered
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round((exam.masteredFlashcards / Math.max(exam.totalFlashcards, 1)) * 100)}% complete
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // No flashcards available
  if (flashcards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500 mb-4">No flashcards available for review right now.</p>
            <p className="text-sm text-gray-400 mb-4">All flashcards have been mastered or aren't due for review yet.</p>
            <Button onClick={() => setSelectingExam(true)}>Choose Another Exam</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All cards reviewed
  if (currentIndex >= flashcards.length) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Session Complete! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-blue-600 mb-2">{stats.reviewed}</div>
              <p className="text-gray-500">Cards Reviewed</p>
              {stats.mastered > 0 && (
                <p className="text-green-600 mt-2">{stats.mastered} cards mastered!</p>
              )}
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={() => {
                setCurrentIndex(0);
                setStats({ reviewed: 0, mastered: 0 });
                if (examId) fetchFlashcards(examId);
              }}>
                Review More
              </Button>
              <Button variant="outline" onClick={() => setSelectingExam(true)}>
                Different Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Flashcards</h1>
          <p className="text-sm text-gray-500">{stats.reviewed} reviewed this session</p>
        </div>
        <Badge variant="outline">
          {currentIndex + 1} / {flashcards.length}
        </Badge>
      </div>

      <Progress value={((currentIndex + 1) / flashcards.length) * 100} className="h-2" />

      {/* Flashcard */}
      <Card 
        className="min-h-[300px] cursor-pointer transition-all duration-300 hover:shadow-lg"
        onClick={handleFlip}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
          {currentCard.topic && (
            <Badge 
              variant="secondary" 
              className={`mb-4 ${currentCard.progress ? getMasteryColor(currentCard.progress.masteryLevel) : "bg-gray-100"}`}
            >
              {currentCard.progress ? getMasteryLabel(currentCard.progress.masteryLevel) : "New"}
            </Badge>
          )}
          
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">
              {isFlipped ? "ANSWER" : "QUESTION"}
            </p>
            <p className="text-xl leading-relaxed">
              {isFlipped ? currentCard.backText : currentCard.frontText}
            </p>
          </div>

          {!isFlipped && (
            <p className="text-sm text-gray-400 mt-8">Tap to reveal answer</p>
          )}
        </CardContent>
      </Card>

      {/* Rating buttons (only show when flipped) */}
      {isFlipped && (
        <div className="space-y-4">
          <p className="text-center text-sm text-gray-500">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
              onClick={() => handleRate(1)}
            >
              😕 Didn't know
            </Button>
            <Button 
              variant="outline"
              className="border-yellow-200 hover:bg-yellow-50"
              onClick={() => handleRate(3)}
            >
              🤔 Hesitated
            </Button>
            <Button 
              variant="outline"
              className="border-green-200 hover:bg-green-50"
              onClick={() => handleRate(5)}
            >
              😊 Knew it!
            </Button>
          </div>
        </div>
      )}

      {/* Topic info */}
      {currentCard.topic && (
        <p className="text-center text-sm text-gray-400">
          Topic: {currentCard.topic.name}
        </p>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FlashcardsContent />
    </Suspense>
  );
}
