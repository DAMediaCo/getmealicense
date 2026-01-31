'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Types
interface Page {
  title: string;
  id: string;
  content: string;
}

interface Course {
  courseId: string;
  title: string;
  description: string;
  pages: Page[];
}

interface AudioManifest {
  [courseId: string]: {
    [chapterId: string]: string;
  };
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [audioManifest, setAudioManifest] = useState<AudioManifest>({});
  const [useHDAudio, setUseHDAudio] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load courses, audio manifest, and auth state
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

    // Load audio manifest
    fetch('/courses/audio/manifest.json')
      .then(r => r.json())
      .then(setAudioManifest)
      .catch(() => console.log('No audio manifest found'));

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

    // Setup fallback TTS
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      audioRef.current?.pause();
      synthRef.current?.cancel();
    };
  }, []);

  // Setup audio element when course/chapter changes
  useEffect(() => {
    if (!currentCourse) return;
    
    const chapter = currentCourse.pages[currentChapterIndex];
    const audioPath = audioManifest[currentCourse.courseId]?.[chapter.id];
    
    if (audioPath && useHDAudio) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            setAudioProgress(audioRef.current.currentTime);
          }
        };
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current) {
            setAudioDuration(audioRef.current.duration);
          }
        };
      }
      audioRef.current.src = audioPath;
      audioRef.current.playbackRate = speed;
      audioRef.current.load();
    }
  }, [currentCourse, currentChapterIndex, audioManifest, useHDAudio]);

  // Update playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

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
    return Math.round((completed / courses[courseId].pages.length) * 100);
  };

  const openCourse = (courseId: string) => {
    const course = courses[courseId];
    setCurrentCourse(course);
    
    // Find first incomplete chapter
    let startIndex = 0;
    if (progress[courseId]) {
      for (let i = 0; i < course.pages.length; i++) {
        if (!progress[courseId][i]) { startIndex = i; break; }
      }
    }
    setCurrentChapterIndex(startIndex);
  };

  const goToChapter = (index: number) => {
    stopAudio();
    setCurrentChapterIndex(index);
    setSidebarOpen(false);
    setAudioProgress(0);
    setAudioDuration(0);
    window.scrollTo(0, 0);
  };

  const getAudioPath = () => {
    if (!currentCourse) return null;
    const chapter = currentCourse.pages[currentChapterIndex];
    return audioManifest[currentCourse.courseId]?.[chapter.id];
  };

  const toggleAudio = () => {
    const audioPath = getAudioPath();
    
    // Use HD Audio (MP3) if available
    if (audioPath && useHDAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }
    
    // Fallback to browser TTS
    if (!synthRef.current || !currentCourse) return;
    
    if (isPlaying) {
      synthRef.current.pause();
      setIsPlaying(false);
    } else if (synthRef.current.paused) {
      synthRef.current.resume();
      setIsPlaying(true);
    } else {
      const chapter = currentCourse.pages[currentChapterIndex];
      const utterance = new SpeechSynthesisUtterance(chapter.content);
      utterance.rate = speed;
      utterance.onend = () => setIsPlaying(false);
      synthRef.current.speak(utterance);
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    synthRef.current?.cancel();
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const seekAudio = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioProgress(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    <span>📖 {course.pages.length} chapters</span>
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
  const chapter = currentCourse.pages[currentChapterIndex];
  const wordCount = chapter.content.split(/\s+/).length;
  const isComplete = progress[currentCourse.courseId]?.[currentChapterIndex];
  const hasHDAudio = !!getAudioPath();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => { stopAudio(); setCurrentCourse(null); }} className="text-blue-600 hover:underline">
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
            {currentCourse.pages.map((ch, i) => (
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
              <span>Chapter {currentChapterIndex + 1} of {currentCourse.pages.length}</span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{Math.ceil(wordCount / 200)} min read</span>
            </div>
          </div>

          {/* Audio Player */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={toggleAudio}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg transition-all ${
                  isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={stopAudio} className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center">
                ⏹
              </button>
              
              <div className="flex-1">
                {hasHDAudio && useHDAudio ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{formatTime(audioProgress)}</span>
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      value={audioProgress}
                      onChange={(e) => seekAudio(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-slate-500">{formatTime(audioDuration)}</span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Using browser voice</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <select 
                  value={speed} 
                  onChange={e => setSpeed(parseFloat(e.target.value))} 
                  className="border rounded px-2 py-1 text-sm bg-white"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>
            
            {/* Audio mode indicator */}
            <div className="flex items-center justify-between text-xs">
              {hasHDAudio ? (
                <span className="text-green-600 font-medium">🎧 HD Audio Available</span>
              ) : (
                <span className="text-amber-600">⚠️ HD Audio generating...</span>
              )}
              {hasHDAudio && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useHDAudio}
                    onChange={e => setUseHDAudio(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-600">Use HD Audio</span>
                </label>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-slate max-w-none">
            {chapter.content.split('\n\n').filter(p => p.trim()).map((p, i) => (
              <p key={i} className="mb-4 leading-relaxed whitespace-pre-wrap">{p.trim()}</p>
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
                if (currentChapterIndex < currentCourse.pages.length - 1) {
                  goToChapter(currentChapterIndex + 1);
                } else {
                  alert('🎉 Congratulations! You\'ve completed this course!');
                  setCurrentCourse(null);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {currentChapterIndex === currentCourse.pages.length - 1 ? 'Finish Course' : 'Next →'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
