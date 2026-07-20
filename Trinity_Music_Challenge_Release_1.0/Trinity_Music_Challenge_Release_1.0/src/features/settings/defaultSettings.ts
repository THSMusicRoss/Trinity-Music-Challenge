import type { GameSettings } from "./SettingsTypes";

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  mode: "manual",
  timerEnabled: true,
  timerLengthSeconds: 20,
  soundEnabled: true,
  scoringMethod: "difficulty",
  pointValues: { easy: 100, medium: 200, challenging: 300 },
  fixedPointValue: 100,
  subtractPointsForIncorrect: false,
  stealsAllowed: true,
  passingAllowed: false,
  tieRule: "sudden_death",
  categories: [],
  difficulties: ["easy", "medium", "challenging"],
  questionTypes: ["multiple_choice", "true_false", "open_response"],
  questionCount: 20,
  distributionMethod: "balanced",
  presetName: null
};
