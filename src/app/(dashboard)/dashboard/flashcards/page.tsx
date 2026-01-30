"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Flashcard {
  id: string;
  frontText: string;
  backText: string;
  topicName?: string;
  masteryLevel: number; // 0-5
}

// Mock flashcards - will be replaced with API
const mockFlashcards: Flashcard[] = [
  {
    id: "1",
    frontText: "What is a beneficiary?",
    backText: "The person or entity designated to receive the death benefit or policy proceeds when the insured dies.",
    topicName: "Life Insurance Basics",
    masteryLevel: 0,
  },
  {
    id: "2",
    frontText: "What is an insurance premium?",
    backText: "The amount of money paid by the policyholder to the insurance company in exchange for coverage, typically paid monthly, quarterly, or annually.",
    topicName: "General Concepts",
    masteryLevel: 0,
  },
  {
    id: "3",
    frontText: "What is underwriting?",
    backText: "The process by which an insurer evaluates the risk of insuring a potential policyholder and determines coverage eligibility and premium rates.",
    topicName: "General Concepts",
    masteryLevel: 0,
  },
  {
    id: "4",
    frontText: "What is a deductible?",
    backText: "The amount the policyholder must pay out-of-pocket before the insurance company pays its portion of a covered claim.",
    topicName: "Health Insurance",
    masteryLevel: 0,
  },
  {
    id: "5",
    frontText: "What is a grace period?",
    backText: "A period of time (usually 30-31 days) after the premium due date during which the policy remains in force and the premium can still be paid without penalty.",
    topicName: "Policy Provisions",
    masteryLevel: 0,
  },
  {
    id: "6",
    frontText: "What is a rider?",
    backText: "An addition or amendment to an insurance policy that modifies the coverage by adding or excluding certain conditions or increasing/decreasing benefits.",
    topicName: "Policy Provisions",
    masteryLevel: 0,
  },
  {
    id: "7",
    frontText: "What does 'insurable interest' mean?",
    backText: "A financial or emotional stake in the continued life, health, or safety of the insured. Required at the time of application to prevent wagering on lives.",
    topicName: "Legal Concepts",
    masteryLevel: 0,
  },
  {
    id: "8",
    frontText: "What is the contestability period?",
    backText: "A period (typically 2 years) during which the insurer can investigate and deny claims based on misrepresentation in the application.",
    topicName: "Policy Provisions",
    masteryLevel: 0,
  },
];

type FlashcardState = "idle" | "studying" | "complete";

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("exam");
  
  const [state, setState] = useState<FlashcardState>("idle");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ known: 0, learning: 0, total: 0 });

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  const startStudying = () => {
    // Shuffle cards for variety
    const shuffled = [...mockFlashcards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ known: 0, learning: 0, total: shuffled.length });
    setState("studying");
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleResponse = (knew: boolean) => {
    setStats(prev => ({
      ...prev,
      known: knew ? prev.known + 1 : prev.known,
      learning: !knew ? prev.learning + 1 : prev.learning,
    }));

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setState("complete");
    }
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

  // Idle state
  if (state === "idle") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-gray-600">
              Review key terms and concepts with flashcards. Rate your knowledge
              to track your progress with spaced repetition.
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>🗂️ {mockFlashcards.length} cards</span>
              <span>🔄 Spaced repetition</span>
              <span>📊 Track mastery</span>
            </div>
            
            <Button onClick={startStudying} size="lg" className="w-full">
              Start Reviewing
            </Button>
          </CardContent>
        </Card>

        {/* Topic breakdown */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Cards by Topic</h3>
            <div className="space-y-2">
              {Array.from(new Set(mockFlashcards.map(c => c.topicName))).map(topic => (
                <div key={topic} className="flex justify-between items-center text-sm">
                  <span>{topic}</span>
                  <Badge variant="outline">
                    {mockFlashcards.filter(c => c.topicName === topic).length} cards
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete state
  if (state === "complete") {
    const knownPercent = Math.round((stats.known / stats.total) * 100);
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Session Complete!</h1>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            <div className="text-5xl">🎉</div>
            
            <div className="text-xl">
              You reviewed {stats.total} flashcards
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">{stats.known}</div>
                <div className="text-sm text-green-700">Already knew</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-600">{stats.learning}</div>
                <div className="text-sm text-yellow-700">Still learning</div>
              </div>
            </div>
            
            <Progress value={knownPercent} className="h-3" />
            <p className="text-sm text-gray-500">{knownPercent}% known</p>
            
            <div className="pt-4 space-x-4">
              <Button onClick={startStudying}>
                Study Again
              </Button>
              <Button variant="outline" onClick={() => setState("idle")}>
                Back to Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Studying state
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span className="space-x-3">
            <span className="text-green-600">✓ {stats.known}</span>
            <span className="text-yellow-600">○ {stats.learning}</span>
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Flashcard */}
      <div 
        onClick={handleFlip}
        className="cursor-pointer perspective-1000"
      >
        <Card className={`min-h-[300px] transition-all duration-300 ${isFlipped ? 'bg-blue-50' : 'bg-white'}`}>
          <CardContent className="pt-6 h-full flex flex-col">
            {/* Topic badge */}
            {currentCard?.topicName && (
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline">{currentCard.topicName}</Badge>
                <Badge className={getMasteryColor(currentCard.masteryLevel)}>
                  {getMasteryLabel(currentCard.masteryLevel)}
                </Badge>
              </div>
            )}
            
            {/* Card content */}
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                  {isFlipped ? "Answer" : "Question"}
                </p>
                <p className="text-xl font-medium leading-relaxed">
                  {isFlipped ? currentCard?.backText : currentCard?.frontText}
                </p>
              </div>
            </div>
            
            {/* Flip hint */}
            <div className="text-center text-sm text-gray-400 pb-2">
              {isFlipped ? "Click to see question" : "Click to reveal answer"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response buttons */}
      {isFlipped && (
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            className="flex-1 h-14 border-yellow-300 hover:bg-yellow-50"
            onClick={() => handleResponse(false)}
          >
            <span className="text-lg mr-2">🤔</span>
            Still Learning
          </Button>
          <Button 
            className="flex-1 h-14 bg-green-600 hover:bg-green-700"
            onClick={() => handleResponse(true)}
          >
            <span className="text-lg mr-2">✓</span>
            Got It!
          </Button>
        </div>
      )}
      
      {!isFlipped && (
        <div className="text-center">
          <Button variant="ghost" onClick={handleFlip}>
            Show Answer
          </Button>
        </div>
      )}
    </div>
  );
}
