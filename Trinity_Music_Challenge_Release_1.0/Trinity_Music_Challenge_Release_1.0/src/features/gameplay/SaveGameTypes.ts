import type { GameState } from "../../core/GameState";
import type { StatisticsSnapshot } from "./GameStatistics";
import type { QuestionResult } from "./GameplayTypes";
import type { GameSettings } from "../settings/SettingsTypes";
import type { TeamSnapshot } from "../teams/Team";

export interface SavedGame {
  readonly schemaVersion: "1.0";
  readonly savedAt: string;
  readonly state: GameState;
  readonly settings: GameSettings;
  readonly teams: readonly TeamSnapshot[];
  readonly questionIds: readonly string[];
  readonly deckIndex: number;
  readonly answerRevealed: boolean;
  readonly buzzedTeamId: string | null;
  readonly eligibleTeamIds: readonly string[];
  readonly choices: readonly string[];
  readonly results: readonly QuestionResult[];
  readonly timerRemainingSeconds: number;
  readonly timerPaused: boolean;
  readonly suddenDeath: boolean;
  readonly suddenDeathTeamIds: readonly string[];
  readonly statistics: StatisticsSnapshot;
}
