export enum GameState {
  BOOT = "BOOT",
  MAIN_MENU = "MAIN_MENU",
  GAME_SETUP = "GAME_SETUP",
  TEAM_SETUP = "TEAM_SETUP",
  QUESTION_SETUP = "QUESTION_SETUP",
  READY = "READY",
  QUESTION_ACTIVE = "QUESTION_ACTIVE",
  BUZZ_LOCKED = "BUZZ_LOCKED",
  ANSWER_REVIEW = "ANSWER_REVIEW",
  SCORE_UPDATE = "SCORE_UPDATE",
  ROUND_COMPLETE = "ROUND_COMPLETE",
  GAME_COMPLETE = "GAME_COMPLETE",
  PAUSED = "PAUSED",
  ERROR = "ERROR"
}

export const GAME_STATE_TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  [GameState.BOOT]: [GameState.MAIN_MENU, GameState.ERROR],
  [GameState.MAIN_MENU]: [GameState.GAME_SETUP, GameState.ERROR],
  [GameState.GAME_SETUP]: [GameState.TEAM_SETUP, GameState.MAIN_MENU, GameState.ERROR],
  [GameState.TEAM_SETUP]: [GameState.QUESTION_SETUP, GameState.GAME_SETUP, GameState.ERROR],
  [GameState.QUESTION_SETUP]: [GameState.READY, GameState.TEAM_SETUP, GameState.ERROR],
  [GameState.READY]: [GameState.QUESTION_ACTIVE, GameState.QUESTION_SETUP, GameState.ERROR],
  [GameState.QUESTION_ACTIVE]: [
    GameState.BUZZ_LOCKED,
    GameState.ANSWER_REVIEW,
    GameState.PAUSED,
    GameState.ERROR
  ],
  [GameState.BUZZ_LOCKED]: [
    GameState.ANSWER_REVIEW,
    GameState.QUESTION_ACTIVE,
    GameState.PAUSED,
    GameState.ERROR
  ],
  [GameState.ANSWER_REVIEW]: [
    GameState.SCORE_UPDATE,
    GameState.QUESTION_ACTIVE,
    GameState.PAUSED,
    GameState.ERROR
  ],
  [GameState.SCORE_UPDATE]: [
    GameState.QUESTION_ACTIVE,
    GameState.ROUND_COMPLETE,
    GameState.GAME_COMPLETE,
    GameState.PAUSED,
    GameState.ERROR
  ],
  [GameState.ROUND_COMPLETE]: [
    GameState.QUESTION_ACTIVE,
    GameState.GAME_COMPLETE,
    GameState.PAUSED,
    GameState.ERROR
  ],
  [GameState.GAME_COMPLETE]: [GameState.MAIN_MENU, GameState.GAME_SETUP, GameState.ERROR],
  [GameState.PAUSED]: [
    GameState.QUESTION_ACTIVE,
    GameState.BUZZ_LOCKED,
    GameState.ANSWER_REVIEW,
    GameState.SCORE_UPDATE,
    GameState.ROUND_COMPLETE,
    GameState.MAIN_MENU,
    GameState.ERROR
  ],
  [GameState.ERROR]: [GameState.MAIN_MENU, GameState.BOOT]
};
