export const QUESTION_TYPES = ["multiple_choice", "true_false", "open_response"] as const;
export const DIFFICULTIES = ["easy", "medium", "challenging"] as const;
export const CATEGORIES = [
  "instruments", "music_vocabulary", "music_symbols_notation", "music_history",
  "artists_bands", "genres", "lyrics_songs", "fun_miscellaneous"
] as const;
export const QUESTION_STATUSES = ["approved", "retired"] as const;

export type QuestionType = typeof QUESTION_TYPES[number];
export type Difficulty = typeof DIFFICULTIES[number];
export type Category = typeof CATEGORIES[number];
export type QuestionStatus = typeof QUESTION_STATUSES[number];

export interface QuestionMedia { readonly image?: string; readonly audio?: string; }
export interface Question {
  readonly id: string; readonly packId: string; readonly type: QuestionType;
  readonly category: Category; readonly difficulty: Difficulty; readonly question: string;
  readonly choices: readonly string[]; readonly correctAnswer: string;
  readonly acceptedAnswers: readonly string[]; readonly explanation: string;
  readonly media: QuestionMedia | null; readonly tags: readonly string[]; readonly status: QuestionStatus;
}
export interface QuestionPackMetadata {
  readonly id: string; readonly title: string; readonly version: string;
  readonly questionCount: number; readonly status: "approved";
}
export interface QuestionPack { readonly schemaVersion: "1.0"; readonly pack: QuestionPackMetadata; readonly questions: readonly Question[]; }
