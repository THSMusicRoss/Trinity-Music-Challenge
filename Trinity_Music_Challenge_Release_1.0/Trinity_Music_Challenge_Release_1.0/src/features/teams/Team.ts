export interface TeamSnapshot {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly score: number;
  readonly questionsAnswered: number;
  readonly correctAnswers: number;
  readonly incorrectAnswers: number;
  readonly buzzCount: number;
}

export class Team {
  private scoreValue = 0;
  private questionsAnsweredValue = 0;
  private correctAnswersValue = 0;
  private incorrectAnswersValue = 0;
  private buzzCountValue = 0;

  constructor(
    readonly id: string,
    public name: string,
    public color: string
  ) {}


  static fromSnapshot(snapshot: TeamSnapshot): Team {
    const team = new Team(snapshot.id, snapshot.name, snapshot.color);
    team.scoreValue = snapshot.score;
    team.questionsAnsweredValue = snapshot.questionsAnswered;
    team.correctAnswersValue = snapshot.correctAnswers;
    team.incorrectAnswersValue = snapshot.incorrectAnswers;
    team.buzzCountValue = snapshot.buzzCount;
    return team;
  }

  get score(): number {
    return this.scoreValue;
  }

  recordBuzz(): void {
    this.buzzCountValue += 1;
  }

  recordCorrect(points: number): void {
    this.questionsAnsweredValue += 1;
    this.correctAnswersValue += 1;
    this.scoreValue += points;
  }

  recordIncorrect(pointsToSubtract = 0): void {
    this.questionsAnsweredValue += 1;
    this.incorrectAnswersValue += 1;
    this.scoreValue -= Math.max(0, pointsToSubtract);
  }

  adjustScore(delta: number): void {
    this.scoreValue += delta;
  }

  snapshot(): TeamSnapshot {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      score: this.scoreValue,
      questionsAnswered: this.questionsAnsweredValue,
      correctAnswers: this.correctAnswersValue,
      incorrectAnswers: this.incorrectAnswersValue,
      buzzCount: this.buzzCountValue
    };
  }
}
