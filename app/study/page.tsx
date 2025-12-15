'use client';
import { useState, useEffect } from 'react';
import { Sentence } from '@/types';
import FlashCard from '@/components/FlashCard';
import { markAsStudied, isStudied, saveForReview, removeFromReview, getSentenceLevel, getAppState } from '@/lib/storage';
import Link from 'next/link';
import { CheckCircle, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudyPage() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [allStudied, setAllStudied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [totalSentencesCount, setTotalSentencesCount] = useState(0);
  const [initialStudiedCount, setInitialStudiedCount] = useState(0);
  const [liveStudiedCount, setLiveStudiedCount] = useState(() => getAppState().studiedCount);
  const router = useRouter();

  const refreshPendingSentences = (allSentences: Sentence[], studiedSet: Set<number>) => {
    // Build a circular list starting at random index, skipping studied sentences
    if (allSentences.length === 0) {
      setSentences([]);
      setLoading(false);
      return;
    }

    const start = Math.floor(Math.random() * allSentences.length);
    const available: Sentence[] = [];
    for (let i = 0; i < allSentences.length; i++) {
      const idx = (start + i) % allSentences.length;
      const s = allSentences[idx];
      if (!studiedSet.has(s.id)) {
        available.push(s);
      }
    }

    setSentences(available);
    setLoading(false);
  };

  // Prevent stale index when list size changes or re-mounts
  useEffect(() => {
    if (!loading && sentences.length > 0 && currentIndex >= sentences.length) {
      setCurrentIndex(0);
    }
  }, [loading, sentences, currentIndex]);

  useEffect(() => {
    // Get initial progress from storage (authoritative source)
    const appState = getAppState();
    const studiedSet = new Set<number>(appState.studiedSentences);
    const initialCount = studiedSet.size;
    setInitialStudiedCount(initialCount);
    setLiveStudiedCount(initialCount);

    fetch('/api/sentences')
      .then(res => res.json())
      .then((data: Sentence[]) => {
        setTotalSentencesCount(data.length);
        refreshPendingSentences(data, studiedSet);
      });
  }, []);

  // Check saved status when sentence changes
  useEffect(() => {
    if (sentences[currentIndex]) {
        const level = getSentenceLevel(sentences[currentIndex].id);
        setIsSaved(level > 0);
    }
  }, [currentIndex, sentences]);

  const handleNext = () => {
    if (sentences[currentIndex]) {
        markAsStudied(sentences[currentIndex].id);
        const latest = getAppState();
        const newTotal = latest.studiedSentences.length;
        setLiveStudiedCount(newTotal);
        if (newTotal >= totalSentencesCount) {
          setAllStudied(true);
        }
    }
    const atEnd = currentIndex >= sentences.length - 1;
    if (atEnd) {
      const latest = getAppState();
      const studiedSet = new Set<number>(latest.studiedSentences);
      if (studiedSet.size >= totalSentencesCount) {
        setIsFinished(true);
      } else {
        // Reload remaining pending sentences to avoid premature completion
        fetch('/api/sentences')
          .then(res => res.json())
          .then((data: Sentence[]) => {
            refreshPendingSentences(data, studiedSet);
            setCurrentIndex(0);
            setIsFinished(false);
          });
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleToggleSave = () => {
    if (!sentences[currentIndex]) return;
    const id = sentences[currentIndex].id;
    
    if (isSaved) {
        removeFromReview(id);
        setIsSaved(false);
    } else {
        saveForReview(id, 0);
        setIsSaved(true);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  // If no sentences left to study (all studied)
  if (sentences.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-6 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
        <p className="text-slate-500 mb-8">
          You have studied all available sentences! Great job!
        </p>
        <Link 
          href="/" 
          className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  if (isFinished) {
    const finishedAll = allStudied || (initialStudiedCount + sentences.length) >= totalSentencesCount;
    return finishedAll ? (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-6 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
          <p className="text-slate-500 mb-8">
            You have studied all available sentences! Great job!
          </p>
          <Link 
            href="/" 
            className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    ) : (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Session Complete!</h2>
          <p className="text-slate-500 mb-8 text-lg">
            You have studied all {sentences.length} sentences in this session.
          </p>
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Home size={20} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Calculate "Real" index based on storage + current session progress
  const realIndex = liveStudiedCount;

  const currentSentence = sentences[currentIndex];

  if (!currentSentence) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center pb-20 pt-10">
        <FlashCard
          sentence={currentSentence}
          title="New sentences"
          onNext={handleNext}
          onToggleSave={handleToggleSave}
          isSaved={isSaved}
          currentIndex={realIndex}
          totalCount={totalSentencesCount}
          onBack={() => router.push('/')}
        />
      </div>
    </div>
  );
}

