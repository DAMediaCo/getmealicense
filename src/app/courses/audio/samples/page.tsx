'use client';

import { useState, useRef } from 'react';

const VOICES = [
  { id: 'aria', name: 'Aria', gender: 'female', description: 'Warm & engaging', file: '/courses/audio/samples/aria_female.mp3' },
  { id: 'jenny', name: 'Jenny', gender: 'female', description: 'Clear & professional', file: '/courses/audio/samples/jenny_female.mp3' },
  { id: 'michelle', name: 'Michelle', gender: 'female', description: 'Friendly & expressive', file: '/courses/audio/samples/michelle_female.mp3' },
  { id: 'christopher', name: 'Christopher', gender: 'male', description: 'Confident & clear', file: '/courses/audio/samples/christopher_male.mp3' },
  { id: 'eric', name: 'Eric', gender: 'male', description: 'Deep & authoritative', file: '/courses/audio/samples/eric_male.mp3' },
  { id: 'guy', name: 'Guy', gender: 'male', description: 'Calm & conversational', file: '/courses/audio/samples/guy_male.mp3' },
];

export default function VoiceSamplesPage() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playVoice = (voice: typeof VOICES[0]) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(voice.file);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(voice.id);
  };

  const selectVoice = (voiceId: string) => {
    localStorage.setItem('gmal_voice', voiceId);
    window.location.href = '/courses';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <a href="/courses" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Courses
        </a>
        
        <h1 className="text-2xl font-bold mb-2">🎧 Voice Samples</h1>
        <p className="text-slate-500 mb-6">Listen to each voice and choose your favorite narrator</p>

        <div className="space-y-3">
          {VOICES.map(voice => (
            <div
              key={voice.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 transition-all"
            >
              <button
                onClick={() => playVoice(voice)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg transition-all ${
                  playingId === voice.id ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {playingId === voice.id ? '⏸' : '▶'}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{voice.gender === 'female' ? '👩' : '👨'}</span>
                  <h2 className="font-semibold text-lg">{voice.name}</h2>
                </div>
                <p className="text-slate-500 text-sm">{voice.description}</p>
              </div>

              <button
                onClick={() => selectVoice(voice.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Select
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-slate-600">
          <strong>💡 Tip:</strong> You can change your voice anytime from the audio player in the course reader.
        </div>
      </div>
    </div>
  );
}
