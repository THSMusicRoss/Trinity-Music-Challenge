import type { Question } from "../questions/QuestionTypes";

export type QuestionOutcome = "correct" | "incorrect" | "skipped" | "time_expired";

export interface QuestionResult {
  readonly questionId: string;
  readonly outcome: QuestionOutcome;
  readonly teamId: string | null;
  readonly elapsedSeconds: number;
}

export interface GameplaySnapshot {
  readonly currentQuestion: Question | null;
  readonly questionNumber: number;
  readonly totalQuestions: number;
  readonly answerRevealed: boolean;
  readonly buzzedTeamId: string | null;
  readonly results: readonly QuestionResult[];
}
