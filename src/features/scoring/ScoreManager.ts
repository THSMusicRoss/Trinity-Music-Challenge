import type { Difficulty } from "../questions/QuestionTypes";
import type { GameSettings } from "../settings/SettingsTypes";
import type { Team } from "../teams/Team";

export interface ScoreChange {
  readonly teamId: string;
  readonly delta: number;
  readonly reason: string;
  readonly timestamp: number;
}

export class ScoreManager {
  private readonly historyValue: ScoreChange[] = [];

  get history(): readonly ScoreChange[] {
    return this.historyValue;
  }

  getQuestionValue(settings: GameSettings, difficulty: Difficulty): number {
    if (settings.scoringMethod === "fixed") {
      return Math.max(0, settings.fixedPointValue);
    }

    return Math.max(0, settings.pointValues[difficulty]);
  }

  award(team: Team, points: number, reason: string): ScoreChange {
    const delta = Math.max(0, Math.floor(points));
    team.adjustScore(delta);
    return this.record(team.id, delta, reason);
  }

  penalize(team: Team, points: number, reason: string): ScoreChange {
    const delta = -Math.max(0, Math.floor(points));
    team.adjustScore(delta);
    return this.record(team.id, delta, reason);
  }

  adjust(team: Team, delta: number, reason: string): ScoreChange {
    const normalized = Math.floor(delta);
    team.adjustScore(normalized);
    return this.record(team.id, normalized, reason);
  }

  rank(teams: readonly Team[]): readonly Team[] {
    return [...teams].sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (scoreDifference !== 0) return scoreDifference;
      return a.name.localeCompare(b.name);
    });
  }

  leaders(teams: readonly Team[]): readonly Team[] {
    if (teams.length === 0) return [];
    const ranked = this.rank(teams);
    const topScore = ranked[0]?.score ?? 0;
    return ranked.filter((team) => team.score === topScore);
  }

  private record(teamId: string, delta: number, reason: string): ScoreChange {
    const change: ScoreChange = {
      teamId,
      delta,
      reason,
      timestamp: Date.now()
    };
    this.historyValue.push(change);
    return change;
  }
}
