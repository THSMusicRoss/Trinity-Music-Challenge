import type { GameSettings } from "../settings/SettingsTypes";

export interface TeamSetup {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly startingScore: number;
}

export interface SetupDraft {
  readonly settings: GameSettings;
  readonly teams: readonly TeamSetup[];
}

export const TEAM_COLORS = ["blue", "red", "green", "gold", "purple", "orange"] as const;
