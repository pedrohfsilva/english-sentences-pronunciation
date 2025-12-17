'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FeedbackSegment {
  text: string;
  isCorrect: boolean;
}

export function useSpeechRecognition(
  targetSentence: string,
  onMatch: () => void,
  isSpeaking: boolean = false
) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isActive, setIsActive] = useState(true); // User preference state
  const [feedback, setFeedback] = useState<FeedbackSegment[]>([]);
  const [mistakeCount, setMistakeCount] = useState(0);
  const recognitionRef = useRef<any>(null);
  const onMatchRef = useRef(onMatch);
  const targetSentenceRef = useRef(targetSentence);

  // Update refs when values change
  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    targetSentenceRef.current = targetSentence;
  }, [targetSentence]);

  // Normalize text for comparison
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      // Remove TODOS os sinais de pontuação e caracteres especiais
      .replace(/[^\w\s]|_/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const checkMatch = useCallback((currentTranscript: string, isFinal: boolean, currentTarget: string) => {
    // Guard against stale callback from old recognition session
    if (currentTarget !== targetSentenceRef.current) {
      return;
    }

    const normalizedTarget = normalize(currentTarget);
    const normalizedTranscript = normalize(currentTranscript);

    // Ignore empty or very short transcripts
    if (normalizedTranscript.length < 2) {
      return;
    }

    const targetWords = normalizedTarget.split(' ');
    const transcriptWords = normalizedTranscript.split(' ');

    // Generate feedback based on what was SPOKEN
    const newFeedback: FeedbackSegment[] = transcriptWords.map((word, index) => {
      // Simple comparison: check if the word at this index matches the target word at this index
      const targetWord = targetWords[index];
      const isCorrect = targetWord === word;
      return {
        text: word,
        isCorrect: isCorrect,
      };
    });

    setFeedback(newFeedback);

    if (normalizedTranscript === normalizedTarget) {
      onMatchRef.current();
    } else if (isFinal && normalizedTranscript.length > 0) {
        // If it's a final result and it didn't match, count as mistake
        setMistakeCount(prev => prev + 1);
    }
  }, []); // No dependencies needed - uses parameters

  const toggleMicrophone = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isActive && !isSpeaking) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Reset after each pause
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onerror = (event: any) => {
            // Ignore 'aborted' error as it happens during cleanup/reset
            if (event.error !== 'aborted') {
                console.warn('Speech recognition error:', event.error);
            }
        };

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            // Auto restart to keep listening loop ONLY if still active and not speaking
            if (recognitionRef.current && isActive && !isSpeaking) {
                setTimeout(() => {
                    try {
                        // Check ref again inside timeout in case it was unmounted/disabled
                        if (recognitionRef.current && isActive && !isSpeaking) {
                            recognition.start();
                        }
                    } catch (e) {
                        // ignore
                    }
                }, 800);
            }
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let isFinal = false;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
             if (event.results[i].isFinal) {
                 isFinal = true;
                 interimTranscript += event.results[i][0].transcript;
             } else {
                 interimTranscript += event.results[i][0].transcript;
             }
          }
          
          setTranscript(interimTranscript);
          checkMatch(interimTranscript, isFinal, targetSentence);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch(e) {
            console.error("Failed to start recognition", e);
        }
      }
    } else {
        // If not active, ensure we stop any existing recognition
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Prevent restart
            recognitionRef.current.stop();
            recognitionRef.current = null;
            setIsListening(false);
        }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart loop when unmounting
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [checkMatch, isActive, targetSentence, isSpeaking]);

  // Reset when target sentence changes
  useEffect(() => {
    setTranscript('');
    setFeedback([]);
    setMistakeCount(0);
    setIsActive(true); // Reset to active when sentence changes
  }, [targetSentence]);

  // Stop recognition when speaking
  useEffect(() => {
    if (isSpeaking && recognitionRef.current) {
      recognitionRef.current.onend = null; // Prevent restart
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isSpeaking]);

  return { transcript, isListening, feedback, mistakeCount, toggleMicrophone, isActive };
}
