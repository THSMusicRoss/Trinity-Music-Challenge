import type { GameSettings } from "../features/settings/SettingsTypes";
import type { TeamSnapshot } from "../features/teams/Team";
import type { StatisticsSnapshot } from "../features/gameplay/GameStatistics";
import type { GameState } from "./GameState";
import type { StateTransition } from "./StateMachine";

export interface GameEvents {
  readonly "game:initialized": {
    readonly settings: GameSettings;
    readonly teams: readonly TeamSnapshot[];
  };
  readonly "state:changed": StateTransition;
  readonly "settings:changed": GameSettings;
  readonly "teams:changed": readonly TeamSnapshot[];
  readonly "statistics:changed": StatisticsSnapshot;
  readonly "game:error": {
    readonly error: Error;
    readonly state: GameState;
  };
}
