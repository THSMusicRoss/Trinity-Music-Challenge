import { CATEGORIES } from "../questions/QuestionTypes";
import { DEFAULT_GAME_SETTINGS } from "../settings/defaultSettings";
import type { UserPreferences } from "../settings/PreferencesTypes";
import type { SetupDraft } from "./SetupTypes";

export function createDefaultSetupDraft(preferences?: UserPreferences): SetupDraft {
  return {
    settings: {
      ...DEFAULT_GAME_SETTINGS,
      mode: preferences?.defaultMode ?? DEFAULT_GAME_SETTINGS.mode,
      timerEnabled: preferences?.defaultTimerEnabled ?? DEFAULT_GAME_SETTINGS.timerEnabled,
      timerLengthSeconds: preferences?.defaultTimerLengthSeconds ?? DEFAULT_GAME_SETTINGS.timerLengthSeconds,
      soundEnabled: preferences?.defaultSoundEnabled ?? DEFAULT_GAME_SETTINGS.soundEnabled,
      questionCount: preferences?.defaultQuestionCount ?? DEFAULT_GAME_SETTINGS.questionCount,
      categories: [...CATEGORIES]
    },
    teams: [
      { id: "team-1", name: "Team 1", color: "blue", startingScore: 0 },
      { id: "team-2", name: "Team 2", color: "red", startingScore: 0 }
    ]
  };
}
