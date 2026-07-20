import type { GameSettings } from "../settings/SettingsTypes";

export interface SessionPreset {
  readonly id: string;
  readonly name: string;
  readonly settings: GameSettings;
  readonly teamCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
