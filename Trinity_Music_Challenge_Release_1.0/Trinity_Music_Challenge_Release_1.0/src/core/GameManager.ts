import { EventBus } from "./EventBus";
import { GameState } from "./GameState";
import type { GameEvents } from "./GameEvents";
import { StateMachine } from "./StateMachine";
import { GameStatistics } from "../features/gameplay/GameStatistics";
import { DEFAULT_GAME_SETTINGS } from "../features/settings/defaultSettings";
import type { GameSettings } from "../features/settings/SettingsTypes";
import { Team } from "../features/teams/Team";

export class GameManager {
  readonly events = new EventBus<GameEvents>();
  readonly stateMachine = new StateMachine(GameState.BOOT);
  readonly statistics = new GameStatistics();

  private settingsValue: GameSettings = DEFAULT_GAME_SETTINGS;
  private readonly teamsValue: Team[] = [];

  get state(): GameState {
    return this.stateMachine.current;
  }

  get settings(): GameSettings {
    return this.settingsValue;
  }

  get teams(): readonly Team[] {
    return this.teamsValue;
  }

  initialize(): void {
    this.transitionTo(GameState.MAIN_MENU);
    this.events.emit("game:initialized", {
      settings: this.settingsValue,
      teams: this.teamsValue.map((team) => team.snapshot())
    });
  }

  transitionTo(nextState: GameState): void {
    try {
      const transition = this.stateMachine.transitionTo(nextState);
      this.events.emit("state:changed", transition);
    } catch (error) {
      this.handleError(error);
    }
  }

  updateSettings(settings: GameSettings): void {
    this.settingsValue = settings;
    this.events.emit("settings:changed", this.settingsValue);
  }

  replaceTeams(teams: readonly Team[]): void {
    this.teamsValue.splice(0, this.teamsValue.length, ...teams);
    this.emitTeamsChanged();
  }

  addTeam(team: Team): void {
    if (this.teamsValue.some((existing) => existing.id === team.id)) {
      throw new Error(`Duplicate team id: ${team.id}`);
    }

    this.teamsValue.push(team);
    this.emitTeamsChanged();
  }

  clearTeams(): void {
    this.teamsValue.length = 0;
    this.emitTeamsChanged();
  }

  private emitTeamsChanged(): void {
    this.events.emit(
      "teams:changed",
      this.teamsValue.map((team) => team.snapshot())
    );
  }

  private handleError(unknownError: unknown): void {
    const error = unknownError instanceof Error
      ? unknownError
      : new Error(String(unknownError));

    const currentState = this.stateMachine.current;

    if (currentState !== GameState.ERROR && this.stateMachine.canTransitionTo(GameState.ERROR)) {
      this.stateMachine.transitionTo(GameState.ERROR);
    }

    this.events.emit("game:error", {
      error,
      state: currentState
    });
  }
}
