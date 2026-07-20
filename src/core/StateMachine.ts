import { GAME_STATE_TRANSITIONS, GameState } from "./GameState";

export interface StateTransition {
  readonly from: GameState;
  readonly to: GameState;
  readonly timestamp: number;
}

export class StateMachine {
  private state: GameState;
  private previousState: GameState | null = null;
  private readonly history: StateTransition[] = [];

  constructor(initialState: GameState = GameState.BOOT) {
    this.state = initialState;
  }

  get current(): GameState {
    return this.state;
  }

  get previous(): GameState | null {
    return this.previousState;
  }

  get transitions(): readonly StateTransition[] {
    return this.history;
  }

  canTransitionTo(nextState: GameState): boolean {
    return GAME_STATE_TRANSITIONS[this.state].includes(nextState);
  }

  transitionTo(nextState: GameState): StateTransition {
    if (!this.canTransitionTo(nextState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${nextState}`);
    }

    const transition: StateTransition = {
      from: this.state,
      to: nextState,
      timestamp: Date.now()
    };

    this.previousState = this.state;
    this.state = nextState;
    this.history.push(transition);

    return transition;
  }
}
