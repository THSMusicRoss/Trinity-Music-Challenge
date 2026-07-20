import type { ThemeName } from "../../core/config";
import type { GameMode } from "./SettingsTypes";

export interface UserPreferences {
  readonly theme: ThemeName;
  readonly defaultMode: GameMode;
  readonly defaultTimerEnabled: boolean;
  readonly defaultTimerLengthSeconds: number;
  readonly defaultSoundEnabled: boolean;
  readonly defaultQuestionCount: number;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = Object.freeze({
  theme: "dark",
  defaultMode: "manual",
  defaultTimerEnabled: true,
  defaultTimerLengthSeconds: 20,
  defaultSoundEnabled: true,
  defaultQuestionCount: 20
});
