'use client';
import { useState, useEffect, use } from 'react';
import { Sentence } from '@/types';
import FlashCard from '@/components/FlashCard';
import { saveForReview, getReviewSentences, getSentenceLevel, setSentenceLevel, markLevelProgress, getLevelProgress, getAppState, saveAppState, getLevelTotal, setLevelTotal } from '@/lib/storage';
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
  const [liveReviewedCount, setLiveReviewedCount] = useState(0);
  const [sessionReviewIds, setSessionReviewIds] = useState<number[]>([]);
  const [sessionStartIndex, setSessionStartIndex] = useState<number | null>(null);
  const [stableTotal, setStableTotal] = useState<number | null>(null);
  const [initialProgressCount, setInitialProgressCount] = useState(0);
  const router = useRouter();

  const refreshReviewSentences = async (existingSessionIds?: number[]) => {
    const allSentencesRes = await fetch('/api/sentences');
    const allSentences: Sentence[] = await allSentencesRes.json();

    // Pegar progresso atual do localStorage (fonte de verdade)
    const progressedIds = new Set(getLevelProgress(level));

    // Se temos IDs de sessão existentes, usar eles para evitar repetição
    if (existingSessionIds && existingSessionIds.length > 0) {
      const available = existingSessionIds
        .filter(id => !progressedIds.has(id))
        .map(id => allSentences.find(s => s.id === id))
        .filter((s): s is Sentence => !!s);
      setSentences(available);
      setLoading(false);
      return;
    }

    // Primeira carga: pegar IDs da fila de revisão e criar snapshot da sessão
    const reviewIds = getReviewSentences(level);
    const uniqueIds = Array.from(new Set(reviewIds));

    // Criar snapshot da sessão com ordem circular aleatória
    const start = uniqueIds.length > 0 ? Math.floor(Math.random() * uniqueIds.length) : 0;
    const orderedIds: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < uniqueIds.length; i++) {
      const idx = (start + i) % uniqueIds.length;
      const id = uniqueIds[idx];
      if (seen.has(id)) continue;
      seen.add(id);
      orderedIds.push(id);
    }

    setSessionReviewIds(orderedIds);
    setSessionStartIndex(start);
    const snap = Math.max(getLevelTotal(level), uniqueIds.length);
    setLevelTotal(level, snap);
    setStableTotal(snap);
    setDisplayTotal(snap);
    setTotalReviewCount(snap);
    
    // Salvar contagem inicial do progresso
    const initialCount = progressedIds.size;
    setInitialProgressCount(initialCount);
    setCompletedCount(0);
    setLiveReviewedCount(initialCount);

    if (snap === 0) {
      setSentences([]);
      setLoading(false);
      return;
    }

    const pendingSentences = orderedIds
      .filter(id => !progressedIds.has(id))
      .map(id => allSentences.find(s => s.id === id))
      .filter((s): s is Sentence => !!s);

    setSentences(pendingSentences);
    setLoading(false);
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
    setStableTotal(null);
    setInitialProgressCount(0);
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
    if (!sentences[currentIndex]) return;
    
    const currentSentence = sentences[currentIndex];
    markLevelProgress(level, currentSentence.id);
    
    // Atualizar contagem
    const currentProgress = getLevelProgress(level).length;
    const sessionCompleted = currentProgress - initialProgressCount;
    setCompletedCount(sessionCompleted);
    setLiveReviewedCount(currentProgress);
    
    const total = stableTotal !== null ? stableTotal : displayTotal;
    
    // Remover a frase atual da lista (approach de pilha)
    const remainingSentences = sentences.filter((_, idx) => idx !== currentIndex);
    
    if (remainingSentences.length === 0) {
      // Não tem mais frases na lista - sempre finalizar
      // O total da sessão foi definido no início e não deve ser expandido
      setIsFinished(true);
    } else {
      setSentences(remainingSentences);
      // Manter currentIndex no mesmo posição (próxima frase "cai" para essa posição)
      // Se estava no final, voltar para 0
      if (currentIndex >= remainingSentences.length) {
        setCurrentIndex(0);
      }
    }
  };

  const handleSkip = () => {
    if (!sentences[currentIndex]) return;
    
    // Não marca como progresso, apenas move para o próximo
    const remainingSentences = sentences.filter((_, idx) => idx !== currentIndex);
    
    if (remainingSentences.length === 0) {
      // Se não tem mais frases, voltar para dashboard
      router.push('/');
    } else {
      setSentences(remainingSentences);
      // Manter currentIndex no mesmo posição (próxima frase "cai" para essa posição)
      // Se estava no final, voltar para 0
      if (currentIndex >= remainingSentences.length) {
        setCurrentIndex(0);
      }
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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 md:p-6">
        <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6">
            <CheckCircle size={32} className="md:w-10 md:h-10" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 md:mb-4">Session Complete!</h2>
          <p className="text-slate-500 mb-6 md:mb-8 text-base md:text-lg">
            You have reviewed all {displayTotal} sentences in this level.
          </p>
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 w-full py-3 md:py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-sm md:text-base"
          >
            <Home size={18} className="md:w-5 md:h-5" />
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4 md:gap-6 p-3 md:p-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6">
          <Layers size={28} className="md:w-8 md:h-8" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
        <p className="text-slate-500 mb-6 md:mb-8 text-sm md:text-base">
          You have no sentences left to review at Level {level}. Great job!
        </p>
        <Link 
          href="/" 
          className="block w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm md:text-base"
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
      <div className="flex-1 flex items-center justify-center md:pb-20 md:pt-10">
        <FlashCard
          sentence={currentSentence}
          title={`Review ${level}`}
          onNext={handleNext}
          onSkip={handleSkip}
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
