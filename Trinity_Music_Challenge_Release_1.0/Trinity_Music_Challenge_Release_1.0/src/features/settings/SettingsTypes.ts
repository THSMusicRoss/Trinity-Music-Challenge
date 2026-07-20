export type GameMode = "manual" | "buzzer";
export type ScoringMethod = "difficulty" | "fixed" | "custom";
export type TieRule = "shared_victory" | "sudden_death" | "teacher_decides";
export type DistributionMethod = "balanced" | "random";
export type Difficulty = "easy" | "medium" | "challenging";
export type QuestionType = "multiple_choice" | "true_false" | "open_response";

export interface PointValues {
  readonly easy: number;
  readonly medium: number;
  readonly challenging: number;
}

export interface GameSettings {
  readonly mode: GameMode;
  readonly timerEnabled: boolean;
  readonly timerLengthSeconds: number;
  readonly soundEnabled: boolean;
  readonly scoringMethod: ScoringMethod;
  readonly pointValues: PointValues;
  readonly fixedPointValue: number;
  readonly subtractPointsForIncorrect: boolean;
  readonly stealsAllowed: boolean;
  readonly passingAllowed: boolean;
  readonly tieRule: TieRule;
  readonly categories: readonly string[];
  readonly difficulties: readonly Difficulty[];
  readonly questionTypes: readonly QuestionType[];
  readonly questionCount: number;
  readonly distributionMethod: DistributionMethod;
  readonly presetName: string | null;
}
