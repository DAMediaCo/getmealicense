'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Types
interface Chapter {
  title: string;
  id: string;
  content: string;
}

interface Course {
  courseId: string;
  title: string;
  description: string;
  totalChapters: number;
  chapters: Chapter[];
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CourseReader() {
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, Record<number, boolean>>>({});
  const [user, setUser] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load courses and auth state
  useEffect(() => {
    // Load courses
    Promise.all([
      fetch('/courses/florida_laws.json').then(r => r.json()),
      fetch('/courses/review_notes.json').then(r => r.json())
    ]).then(([flLaws, reviewNotes]) => {
      setCourses({
        florida_laws_lh: flLaws,
        review_notes_lh: reviewNotes
      });
    });

    // Load progress from localStorage
    const saved = localStorage.getItem('gmal_progress');
    if (saved) setProgress(JSON.parse(saved));

    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        loadProgressFromSupabase(session.user.id);
      }
    });

    // Setup TTS
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => {
        const v = synthRef.current?.getVoices().filter(v => v.lang.startsWith('en')) || [];
        setVoices(v);
      };
      loadVoices();
      synthRef.current?.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const loadProgressFromSupabase = async (userId: string) => {
    const { data } = await supabase
      .from('course_progress')
      .select('course_id, chapter_index, completed')
      .eq('user_id', userId);
    
    if (data) {
      const prog: Record<string, Record<number, boolean>> = {};
      data.forEach(row => {
        if (!prog[row.course_id]) prog[row.course_id] = {};
        prog[row.course_id][row.chapter_index] = row.completed;
      });
      setProgress(prog);
      localStorage.setItem('gmal_progress', JSON.stringify(prog));
    }
  };

  const saveProgress = async (courseId: string, chapterIndex: number, completed: boolean) => {
    const newProgress = { ...progress };
    if (!newProgress[courseId]) newProgress[courseId] = {};
    newProgress[courseId][chapterIndex] = completed;
    setProgress(newProgress);
    localStorage.setItem('gmal_progress', JSON.stringify(newProgress));

    if (user) {
      await supabase.from('course_progress').upsert({
        user_id: user.id,
        course_id: courseId,
        chapter_index: chapterIndex,
        completed
      }, { onConflict: 'user_id,course_id,chapter_index' });
    }
  };

  const getCourseProgress = (courseId: string) => {
    if (!progress[courseId] || !courses[courseId]) return 0;
    const completed = Object.values(progress[courseId]).filter(v => v).length;
    return Math.round((completed / courses[courseId].totalChapters) * 100);
  };

  const openCourse = (courseId: string) => {
    const course = courses[courseId];
    setCurrentCourse(course);
    
    // Find first incomplete chapter
    let startIndex = 0;
    if (progress[courseId]) {
      for (let i = 0; i < course.chapters.length; i++) {
        if (!progress[courseId][i]) { startIndex = i; break; }
      }
    }
    setCurrentChapterIndex(startIndex);
  };

  const goToChapter = (index: number) => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setCurrentChapterIndex(index);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const toggleTTS = () => {
    if (!synthRef.current || !currentCourse) return;
    
    if (isSpeaking) {
      synthRef.current.pause();
      setIsSpeaking(false);
    } else if (synthRef.current.paused) {
      synthRef.current.resume();
      setIsSpeaking(true);
    } else {
      const chapter = currentCourse.chapters[currentChapterIndex];
      const utterance = new SpeechSynthesisUtterance(chapter.content);
      utterance.rate = speed;
      if (voices[selectedVoice]) utterance.voice = voices[selectedVoice];
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const stopTTS = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  // Course selection view
  if (!currentCourse) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">📚 Your Courses</h1>
          <p className="text-slate-500 mb-6">Select a course to continue studying</p>
          
          <div className="grid gap-4 md:grid-cols-2">
            {Object.values(courses).map(course => {
              const prog = getCourseProgress(course.courseId);
              return (
                <div
                  key={course.courseId}
                  onClick={() => openCourse(course.courseId)}
                  className="bg-white border border-slate-200 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <h2 className="text-lg font-semibold mb-2">{course.title}</h2>
                  <p className="text-slate-500 text-sm mb-4">{course.description}</p>
                  <div className="flex gap-4 text-sm text-slate-500 mb-3">
                    <span>📖 {course.totalChapters} chapters</span>
                    <span>✓ {prog}% complete</span>
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${prog}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Reader view
  const chapter = currentCourse.chapters[currentChapterIndex];
  const wordCount = chapter.content.split(/\s+/).length;
  const isComplete = progress[currentCourse.courseId]?.[currentChapterIndex];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => { stopTTS(); setCurrentCourse(null); }} className="text-blue-600 hover:underline">
            ← Back to Courses
          </button>
          <h1 className="font-semibold text-sm md:text-base truncate mx-4">{currentCourse.title}</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden border rounded px-3 py-1">
            ☰
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 grid md:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} md:block bg-white border border-slate-200 rounded-xl p-4 h-fit md:sticky md:top-20 max-h-[calc(100vh-100px)] overflow-y-auto`}>
          <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">Chapters</h3>
          <ul className="space-y-1">
            {currentCourse.chapters.map((ch, i) => (
              <li
                key={ch.id}
                onClick={() => goToChapter(i)}
                className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 ${
                  i === currentChapterIndex ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                {progress[currentCourse.courseId]?.[i] && <span className="text-green-500 font-bold">✓</span>}
                {ch.title}
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <main className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
          <div className="mb-6 pb-4 border-b border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{chapter.title}</h2>
            <div className="flex gap-3 text-sm text-slate-500">
              <span>Chapter {currentChapterIndex + 1} of {currentCourse.totalChapters}</span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{Math.ceil(wordCount / 200)} min read</span>
            </div>
          </div>

          {/* TTS Controls */}
          <div className="bg-slate-50 rounded-lg p-3 mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={toggleTTS}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${isSpeaking ? 'bg-red-500' : 'bg-blue-600'}`}
            >
              {isSpeaking ? '⏸ Pause' : '▶ Listen'}
            </button>
            <button onClick={stopTTS} className="px-4 py-2 rounded-lg bg-slate-500 text-white text-sm">
              ⏹ Stop
            </button>
            <div className="flex items-center gap-2 text-sm">
              <label>Speed:</label>
              <select value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="border rounded px-2 py-1">
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
            {voices.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <label>Voice:</label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(parseInt(e.target.value))} className="border rounded px-2 py-1 max-w-[150px]">
                  {voices.map((v, i) => (
                    <option key={i} value={i}>{v.name.split(' ').slice(0, 3).join(' ')}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            {chapter.content.split('\n\n').filter(p => p.trim()).map((p, i) => (
              <p key={i} className="mb-4 leading-relaxed">{p.trim()}</p>
            ))}
          </div>

          {/* Mark Complete */}
          <div className="mt-6 flex items-center gap-2">
            <input
              type="checkbox"
              id="complete"
              checked={!!isComplete}
              onChange={e => saveProgress(currentCourse.courseId, currentChapterIndex, e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="complete" className="text-sm">Mark chapter as complete</label>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between">
            <button
              onClick={() => goToChapter(currentChapterIndex - 1)}
              disabled={currentChapterIndex === 0}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => {
                if (currentChapterIndex < currentCourse.totalChapters - 1) {
                  goToChapter(currentChapterIndex + 1);
                } else {
                  alert('🎉 Congratulations! You\'ve completed this course!');
                  setCurrentCourse(null);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {currentChapterIndex === currentCourse.totalChapters - 1 ? 'Finish Course' : 'Next →'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
