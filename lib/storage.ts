const STORAGE_KEY = 'english_sentences_progress';

export interface AppState {
  studiedCount: number;
  studiedSentences: number[]; // List of IDs that have been studied
  reviewQueue: Record<number, number>; // sentenceId -> level
  levelProgress: Record<number, number[]>; // level -> list of reviewed sentenceIds in current cycle
}

export const getAppState = (): AppState => {
  if (typeof window === 'undefined') return { studiedCount: 0, studiedSentences: [], reviewQueue: {}, levelProgress: {} };
  const stored = localStorage.getItem(STORAGE_KEY);
  const state = stored ? JSON.parse(stored) : { studiedCount: 0, studiedSentences: [], reviewQueue: {}, levelProgress: {} };
  if (!state.levelProgress) state.levelProgress = {};
  if (!state.studiedSentences) {
    // Migration: Initialize with keys from reviewQueue
    state.studiedSentences = Object.keys(state.reviewQueue).map(Number);
  }
  return state;
};

export const saveAppState = (state: AppState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetProgress = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};

export const markAsStudied = (sentenceId: number) => {
  const state = getAppState();
  if (!state.studiedSentences.includes(sentenceId)) {
    state.studiedSentences.push(sentenceId);
    state.studiedCount = state.studiedSentences.length;
    saveAppState(state);
  }
};

export const isStudied = (sentenceId: number): boolean => {
    const state = getAppState();
    return state.studiedSentences.includes(sentenceId);
};

export const markLevelProgress = (level: number, sentenceId: number) => {
  const state = getAppState();
  if (!state.levelProgress[level]) {
    state.levelProgress[level] = [];
  }
  if (!state.levelProgress[level].includes(sentenceId)) {
    state.levelProgress[level].push(sentenceId);
    saveAppState(state);
  }
};

export const getLevelProgress = (level: number): number[] => {
  const state = getAppState();
  return state.levelProgress[level] || [];
};

export const resetLevelProgress = (level: number) => {
  const state = getAppState();
  state.levelProgress[level] = [];
  saveAppState(state);
};

export const saveForReview = (sentenceId: number, currentLevel: number) => {
  const state = getAppState();
  state.reviewQueue[sentenceId] = currentLevel + 1;
  saveAppState(state);
};

export const removeFromReview = (sentenceId: number) => {
  const state = getAppState();
  delete state.reviewQueue[sentenceId];
  saveAppState(state);
};

export const setSentenceLevel = (sentenceId: number, level: number) => {
  const state = getAppState();
  if (level <= 0) {
    delete state.reviewQueue[sentenceId];
  } else {
    state.reviewQueue[sentenceId] = level;
  }
  saveAppState(state);
};

export const getSentenceLevel = (sentenceId: number): number => {
  const state = getAppState();
  return state.reviewQueue[sentenceId] || 0;
};

export const getReviewSentences = (level: number): number[] => {
  const state = getAppState();
  return Object.entries(state.reviewQueue)
    .filter(([_, lvl]) => lvl === level)
    .map(([id, _]) => Number(id));
};

export const getAvailableLevels = (): number[] => {
  const state = getAppState();
  const levels = new Set<number>();
  Object.values(state.reviewQueue).forEach((lvl) => levels.add(lvl));
  Object.keys(state.levelProgress).forEach((lvl) => levels.add(Number(lvl)));
  return Array.from(levels).sort((a, b) => a - b);
};

export const getDetailedStats = () => {
  const state = getAppState();
  const reviewCounts: Record<number, number> = {};
  const levelProgressCounts: Record<number, number> = {};
  let totalInReview = 0;

  Object.values(state.reviewQueue).forEach(level => {
    reviewCounts[level] = (reviewCounts[level] || 0) + 1;
    totalInReview++;
  });

  Object.keys(state.levelProgress).forEach(levelKey => {
    const level = Number(levelKey);
    levelProgressCounts[level] = state.levelProgress[level].length;
  });

  return {
    studiedCount: state.studiedCount,
    reviewCounts,
    levelProgressCounts,
    totalInReview
  };
};
