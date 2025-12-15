export interface Sentence {
  id: number;
  sentence: string;
  translation: string;
}

export interface StudyProgress {
  studiedCount: number;
  // Map of sentenceId -> level (0 means not saved for review, 1+ is review level)
  reviewQueue: Record<number, number>;
}
