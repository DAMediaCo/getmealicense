"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTTSOptions {
  rate?: number;
  pitch?: number;
  voice?: string;
}

interface UseTTSReturn {
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  rate: number;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(options.rate || 1);
  const [isSupported, setIsSupported] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check support and load voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Select a good default voice (prefer US English)
        const preferredVoice = availableVoices.find(
          v => v.lang === "en-US" && v.name.includes("Samantha")
        ) || availableVoices.find(
          v => v.lang === "en-US"
        ) || availableVoices[0];
        
        if (preferredVoice && !currentVoice) {
          setCurrentVoice(preferredVoice);
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    // Stop any current speech
    speechSynthesis.cancel();

    // Split long text into chunks (browser limit ~32k chars)
    const maxChunkSize = 5000;
    const chunks: string[] = [];
    
    // Split by sentences to avoid cutting mid-word
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = "";
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    let chunkIndex = 0;

    const speakChunk = () => {
      if (chunkIndex >= chunks.length) {
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utteranceRef.current = utterance;

      if (currentVoice) utterance.voice = currentVoice;
      utterance.rate = rate;
      utterance.pitch = options.pitch || 1;

      utterance.onend = () => {
        chunkIndex++;
        speakChunk();
      };

      utterance.onerror = (e) => {
        console.error("TTS error:", e);
        setIsPlaying(false);
        setIsPaused(false);
      };

      speechSynthesis.speak(utterance);
    };

    setIsPlaying(true);
    setIsPaused(false);
    speakChunk();
  }, [isSupported, currentVoice, rate, options.pitch]);

  const pause = useCallback(() => {
    if (isSupported && isPlaying) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isPlaying]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isPlaying,
    isPaused,
    isSupported,
    voices,
    currentVoice,
    setVoice,
    setRate,
    rate,
  };
}
