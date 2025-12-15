'use client';
import { useState, useEffect, use } from 'react';
import { Sentence } from '@/types';
import FlashCard from '@/components/FlashCard';
import { saveForReview, getReviewSentences, getSentenceLevel, setSentenceLevel, markLevelProgress, getLevelProgress } from '@/lib/storage';
import Link from 'next/link';
import { Layers, CheckCircle, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReviewPage({ params }: { params: Promise<{ level: string }> }) {
  const resolvedParams = use(params);
  const level = parseInt(resolvedParams.level);
  
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [totalReviewCount, setTotalReviewCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [liveReviewedCount, setLiveReviewedCount] = useState(() => getLevelProgress(level).length);
  const [sessionReviewIds, setSessionReviewIds] = useState<number[]>([]);
  const [sessionStartIndex, setSessionStartIndex] = useState<number | null>(null);
  const router = useRouter();

  const refreshReviewSentences = async () => {
    const allSentencesRes = await fetch('/api/sentences');
    const allSentences: Sentence[] = await allSentencesRes.json();

    const baseIds = sessionReviewIds.length > 0 ? sessionReviewIds : getReviewSentences(level);
    const uniqueIds = Array.from(new Set(baseIds));

    if (sessionReviewIds.length === 0) {
      setSessionReviewIds(uniqueIds);
      setSessionStartIndex(uniqueIds.length > 0 ? Math.floor(Math.random() * uniqueIds.length) : 0);
    }

    const completedIds = getLevelProgress(level);
    const total = uniqueIds.length;
    setTotalReviewCount(total);
    setDisplayTotal(total);
    setCompletedCount(completedIds.length);
    setLiveReviewedCount(completedIds.length);

    if (total === 0) {
      setSentences([]);
      setLoading(false);
      return { pending: [], completedIds, total };
    }

    const start = sessionStartIndex !== null ? sessionStartIndex : 0;
    const orderedIds: number[] = [];
    for (let i = 0; i < uniqueIds.length; i++) {
      const idx = (start + i) % uniqueIds.length;
      orderedIds.push(uniqueIds[idx]);
    }

    const pendingSentences = orderedIds
      .map(id => allSentences.find(s => s.id === id))
      .filter((s): s is Sentence => !!s && !completedIds.includes(s.id));

    setSentences(pendingSentences);
    setLoading(false);
    return { pending: pendingSentences, completedIds, total };
  };

  // Prevent stale index from pointing past the available sentences list
  useEffect(() => {
    if (!loading && sentences.length > 0 && currentIndex >= sentences.length) {
      setCurrentIndex(0);
    }
  }, [loading, sentences, currentIndex]);

  useEffect(() => {
    // Reset session state on level change
    setSessionReviewIds([]);
    setSessionStartIndex(null);
    setIsFinished(false);
    setCurrentIndex(0);
    setLoading(true);
    refreshReviewSentences();
  }, [level]);

  // Check saved status (promoted status)
  useEffect(() => {
    if (sentences[currentIndex]) {
        const currentSentenceLevel = getSentenceLevel(sentences[currentIndex].id);
        // If level > currentSentenceLevel, it is \"saved\" (promoted)
        setIsSaved(currentSentenceLevel > level);
    }
  }, [currentIndex, sentences, level]);

  const handleNext = () => {
    if (sentences[currentIndex]) {
        markLevelProgress(level, sentences[currentIndex].id);
      setCompletedCount((prev) => prev + 1);
      setLiveReviewedCount(getLevelProgress(level).length);
    }
    const atEnd = currentIndex >= sentences.length - 1;
    if (atEnd) {
      const refreshed = getLevelProgress(level).length;
      const total = displayTotal; // keep session total stable
      setLiveReviewedCount(refreshed);
      if (refreshed >= total) {
        setIsFinished(true);
      } else {
        // Reload pending from session snapshot to continue until totals match
        refreshReviewSentences().then(() => {
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
        // Demote back to current level
        setSentenceLevel(id, level);
        setIsSaved(false);
    } else {
        // Promote to next level
        saveForReview(id, level);
        setIsSaved(true);
    }
  };

  // Show completion first to avoid spinner after finishing
  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Session Complete!</h2>
          <p className="text-slate-500 mb-8 text-lg">
            You have reviewed all {displayTotal} sentences in this level.
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (sentences.length === 0) return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-6 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Layers size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
        <p className="text-slate-500 mb-8">
          You have no sentences left to review at Level {level}. Great job!
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
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Session Complete!</h2>
          <p className="text-slate-500 mb-8 text-lg">
            You have reviewed all {sentences.length} sentences in this session.
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
          title={`Review ${level}`}
          onNext={handleNext}
          onToggleSave={handleToggleSave}
          isSaved={isSaved}
          currentIndex={liveReviewedCount}
          totalCount={displayTotal}
          onBack={() => router.push('/')}
        />
      </div>
    </div>
  );
}
