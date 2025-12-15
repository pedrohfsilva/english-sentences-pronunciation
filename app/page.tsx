'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDetailedStats, getAvailableLevels, resetProgress } from '@/lib/storage';
import { Play, BarChart3, Star, CheckCircle, Trash2, X, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({ 
    studiedCount: 0, 
    totalInReview: 0, 
    reviewCounts: {} as Record<number, number>,
    levelProgressCounts: {} as Record<number, number>,
    levelTotals: {} as Record<number, number>
  });
  const [levels, setLevels] = useState<number[]>([]);
  const [totalSentences, setTotalSentences] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);

  const loadStats = () => {
    const state = getDetailedStats();
    setStats({ 
      studiedCount: state.studiedCount,
      totalInReview: state.totalInReview,
      reviewCounts: state.reviewCounts,
      levelProgressCounts: state.levelProgressCounts,
      levelTotals: state.levelTotals
    });
    setLevels(getAvailableLevels());
  };

  useEffect(() => {
    loadStats();

    fetch('/api/sentences')
      .then(res => res.json())
      .then(data => setTotalSentences(data.length));
  }, []);

  const handleReset = () => {
    resetProgress();
    loadStats();
    setShowResetModal(false);
  };

  const isStudyFinished = totalSentences > 0 && stats.studiedCount >= totalSentences;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 relative">
      
      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Reset Progress?</h3>
              <p className="text-slate-500 mb-8">
                This will delete all your study history and review queues. This action cannot be undone.
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="pt-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            English <span className="text-blue-600">Mastery</span>
          </h1>
        </div>
      </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Study New Phrases */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Star size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Study New Sentences</h2>
                        <p className="text-slate-500 text-sm">Learn new vocabulary</p>
                    </div>
                </div>
            <div className="flex items-center gap-3 text-right">
              <span className={`text-lg font-bold ${isStudyFinished ? 'text-green-500' : 'text-slate-700'}`}>
                {stats.studiedCount} / {totalSentences}
              </span>
              <button 
                onClick={() => setShowResetModal(true)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Reset Progress"
              >
                <Trash2 size={18} />
              </button>
            </div>
            </div>
            
            {isStudyFinished ? (
                <button disabled className="w-full bg-green-100 text-green-700 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-default">
                    <CheckCircle size={20} />
                    All Sentences Studied
                </button>
            ) : (
                <Link href="/study" className="w-full block">
                    <button className="w-full bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                        <Play size={20} fill="currentColor" />
                        Start Session
                    </button>
                </Link>
            )}
        </div>

        {/* Review Levels */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <BarChart3 size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Review Progress</h2>
                    <p className="text-slate-500 text-sm">Reinforce your memory</p>
                </div>
            </div>
            
            {levels.length > 0 ? (
              <div className="space-y-4">
                {levels.map((level) => {
                  const totalCountRaw = stats.reviewCounts[level] || 0;
                  const reviewedCount = stats.levelProgressCounts[level] || 0;
                  const snapshotTotal = stats.levelTotals[level] || 0;
                  const totalCount = Math.max(totalCountRaw, reviewedCount, snapshotTotal); // keep completed level visible even if queue emptied
                    
                    // Check if previous level is completed
                    // Level 1 is always unlocked.
                    // Level N is unlocked if Level N-1 has 0 pending reviews (reviewedCount >= totalCount of N-1)
                    // Wait, stats.reviewCounts[level] is the TOTAL items in that level.
                    // stats.levelProgressCounts[level] is how many I reviewed THIS SESSION.
                    // So "pending" = totalCount - reviewedCount.
                    
                    let isLocked = false;
                    if (level > 1) {
                        const prevLevelTotal = stats.reviewCounts[level - 1] || 0;
                        const prevLevelReviewed = stats.levelProgressCounts[level - 1] || 0;
                        const prevLevelPending = prevLevelTotal - prevLevelReviewed;
                        
                        if (prevLevelPending > 0) {
                            isLocked = true;
                        }
                    }

                    if (isLocked) {
                        return (
                            <div key={level} className="block opacity-50 cursor-not-allowed">
                                <div className="group flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 text-slate-400 flex items-center justify-center font-bold shadow-sm">
                                        {level}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-slate-500">Level {level}</span>
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Locked</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-slate-400">
                                            {reviewedCount} <span className="text-slate-300 text-sm font-normal">/ {totalCount}</span>
                                        </span>
                                        <span className="text-xs text-slate-400">reviewed</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-slate-300 rounded-full"></div>
                                    </div>
                                </div>
                                </div>
                            </div>
                        );
                    }
                    
                    const isCompleted = totalCount > 0 && reviewedCount >= totalCount;
                    if (isCompleted) {
                      return (
                        <div key={level} className="block">
                          <div className="flex items-center justify-between p-5 rounded-2xl bg-green-50 border border-green-200 cursor-default opacity-80">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white border-2 border-green-200 text-green-700 flex items-center justify-center font-bold shadow-sm">
                                {level}
                              </div>
                              <div>
                                <span className="block font-bold text-green-700">Level {level}</span>
                                <span className="text-xs text-green-600 font-medium uppercase tracking-wide">Completed</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="block text-lg font-bold text-green-700">
                                  {reviewedCount} <span className="text-green-600 text-sm font-normal">/ {totalCount}</span>
                                </span>
                                <span className="text-xs text-green-600">reviewed</span>
                              </div>
                              <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                              Completed
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Link key={level} href={`/review/${level}`} className="block">
                        <div className="group flex items-center justify-between p-5 rounded-2xl bg-slate-50 hover:bg-purple-50 transition-colors border border-slate-100 hover:border-purple-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white border-2 border-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-sm">
                            {level}
                          </div>
                          <div>
                            <span className="block font-bold text-slate-700 group-hover:text-purple-700">Level {level}</span>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Review Queue</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-lg font-bold text-slate-800 group-hover:text-purple-700">
                              {reviewedCount} <span className="text-slate-400 text-sm font-normal">/ {totalCount}</span>
                            </span>
                            <span className="text-xs text-slate-400">reviewed</span>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white text-slate-300 group-hover:text-purple-500 flex items-center justify-center transition-colors">
                            <Play size={16} fill="currentColor" />
                          </div>
                        </div>
                        </div>
                      </Link>
                    );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">No sentences in review queue.</p>
                <p className="text-sm text-slate-400 mt-1">Save sentences while studying to see them here.</p>
              </div>
            )}
        </div>

      </div>
    </main>
  );
}
