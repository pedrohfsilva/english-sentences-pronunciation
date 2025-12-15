'use client';

import { useState, useEffect, useRef } from 'react';
import { Sentence } from '@/types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Eye, EyeOff, Save, Mic, MicOff, Volume2, ArrowLeft } from 'lucide-react';

interface FlashCardProps {
  sentence: Sentence;
  title: string;
  onNext: () => void;
  onToggleSave: () => void;
  isSaved: boolean;
  currentIndex: number;
  totalCount: number;
  onBack: () => void;
}

export default function FlashCard({ 
  sentence, 
  title,
  onNext, 
  onToggleSave, 
  isSaved,
  currentIndex,
  totalCount,
  onBack
}: FlashCardProps) {
  if (!sentence) {
    // Guard against transient empty state to avoid blank screen flicker
    return (
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-100 flex items-center justify-center min-h-[320px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-label="Loading" />
        </div>
      </div>
    );
  }
  const [showTranslation, setShowTranslation] = useState(false);
  const [wantsToSave, setWantsToSave] = useState(isSaved);

  // Sync local state with prop when prop changes (e.g. new card)
  useEffect(() => {
    setWantsToSave(isSaved);
  }, [isSaved, sentence]);

  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const sentenceIdRef = useRef(sentence.id);

  // Update ref synchronously when sentence changes
  sentenceIdRef.current = sentence.id;

  const handleMatch = () => {
    // Guard against firing for wrong sentence or already exiting
    if (isExiting) return;
    if (sentence.id !== sentenceIdRef.current) return;
    
    setIsExiting(true);
    
    // Delay for animation and fluidity
    setTimeout(() => {
        // Execute the save if needed
        if (wantsToSave !== isSaved) {
            onToggleSave();
        }
        onNext();
    }, 500);
  };

  const { transcript, isListening, feedback, mistakeCount, toggleMicrophone, isActive } = useSpeechRecognition(
    sentence?.sentence || '',
    handleMatch
  );

  // Auto-save on 2 mistakes (only once per phrase)
  useEffect(() => {
    if (mistakeCount >= 2 && !wantsToSave && !hasAutoSaved) {
      setWantsToSave(true);
      setHasAutoSaved(true);
    }
  }, [mistakeCount, wantsToSave, hasAutoSaved]);

  // Reset local state when phrase changes
  useEffect(() => {
    setShowTranslation(false);
    setHasAutoSaved(false);
    setIsExiting(false);
  }, [sentence]);

  if (!sentence) return null;

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence.sentence);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordClick = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className={`bg-white rounded-3xl shadow-2xl p-8 md:p-12 transition-all duration-500 border border-slate-100 relative ${
        isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}>
        
        {/* Internal Header: Back & Counter */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-medium"
            >
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>
            
            <h2 className="text-slate-500 font-bold text-lg uppercase tracking-wide">{title}</h2>

            <div className="bg-slate-50 px-4 py-1.5 rounded-full text-slate-500 font-medium text-sm border border-slate-100">
                <span className="text-blue-600 font-bold">{currentIndex}</span> / {totalCount}
            </div>
        </div>

        {/* Status & TTS */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isListening && isActive
                ? 'bg-green-50 text-green-600 border border-green-100 animate-pulse' 
                : 'bg-slate-50 text-slate-400 border border-slate-100'
            }`}>
              {isListening && isActive ? <Mic size={16} /> : <MicOff size={16} />}
              <span>{isListening && isActive ? 'Listening...' : 'Mic Off'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
                onClick={toggleMicrophone}
                className={`p-3 rounded-full transition-colors ${
                    isActive 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
                title={isActive ? "Turn Microphone Off" : "Turn Microphone On"}
            >
                {isActive ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button 
                onClick={handleSpeak}
                className="p-3 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Listen to pronunciation"
            >
                <Volume2 size={24} />
            </button>
          </div>
        </div>

        {/* Main Sentence */}
        <div className="text-center mb-12">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mb-6">
            {sentence.sentence.split(' ').map((word, idx) => (
              <span 
                key={idx}
                onClick={() => handleWordClick(word)}
                className="text-3xl md:text-5xl font-bold text-slate-800 leading-tight cursor-pointer hover:text-blue-500 transition-colors"
                title="Click to listen"
              >
                {word}
              </span>
            ))}
          </div>
          
          {/* Feedback Display */}
          <div className="flex flex-wrap justify-center gap-2 text-lg md:text-xl">
            {feedback.length > 0 ? (
              feedback.map((seg, i) => (
                <span
                  key={i}
                  className={`p-1 rounded ${
                    seg.isCorrect 
                      ? 'text-green-600 bg-green-50/50 font-medium' 
                      : 'text-red-500 bg-red-50/50'
                  }`}
                >
                  {seg.text}
                </span>
              ))
            ) : (
              <span className="text-slate-300 italic font-light">
                Read the sentence aloud...
              </span>
            )}
          </div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
          >
            {showTranslation ? <EyeOff size={18} /> : <Eye size={18} />}
            {showTranslation ? 'Hide Translation' : 'Show Translation'}
          </button>

          <button
            onClick={() => setWantsToSave(!wantsToSave)}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-medium shadow-sm ${
              wantsToSave
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <Save size={18} />
            {wantsToSave ? 'Saved (Click to Undo)' : 'Save for Review'}
          </button>
        </div>

        {/* Translation Reveal */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showTranslation ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-xl text-slate-600 font-medium">
              {sentence.translation}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
