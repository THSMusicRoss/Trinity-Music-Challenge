export interface StatisticsSnapshot {
  readonly questionsAsked: number;
  readonly totalCorrect: number;
  readonly totalIncorrect: number;
  readonly elapsedTimeSeconds: number;
  readonly categoryBreakdown: Readonly<Record<string, number>>;
  readonly difficultyBreakdown: Readonly<Record<string, number>>;
}

export class GameStatistics {
  private questionsAskedValue = 0;
  private totalCorrectValue = 0;
  private totalIncorrectValue = 0;
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private readonly categoryBreakdown = new Map<string, number>();
  private readonly difficultyBreakdown = new Map<string, number>();

  restore(snapshot: StatisticsSnapshot): void {
    this.questionsAskedValue = snapshot.questionsAsked;
    this.totalCorrectValue = snapshot.totalCorrect;
    this.totalIncorrectValue = snapshot.totalIncorrect;
    this.startedAt = Date.now() - Math.max(0, snapshot.elapsedTimeSeconds * 1000);
    this.endedAt = null;
    this.categoryBreakdown.clear();
    this.difficultyBreakdown.clear();
    for (const [key, value] of Object.entries(snapshot.categoryBreakdown)) {
      this.categoryBreakdown.set(key, value);
    }
    for (const [key, value] of Object.entries(snapshot.difficultyBreakdown)) {
      this.difficultyBreakdown.set(key, value);
    }
  }

  reset(): void {
    this.questionsAskedValue = 0;
    this.totalCorrectValue = 0;
    this.totalIncorrectValue = 0;
    this.startedAt = null;
    this.endedAt = null;
    this.categoryBreakdown.clear();
    this.difficultyBreakdown.clear();
  }

  start(): void {
    this.startedAt = Date.now();
    this.endedAt = null;
  }

  stop(): void {
    this.endedAt = Date.now();
  }

  recordQuestion(category: string, difficulty: string): void {
    this.questionsAskedValue += 1;
    this.increment(this.categoryBreakdown, category);
    this.increment(this.difficultyBreakdown, difficulty);
  }

  recordCorrect(): void {
    this.totalCorrectValue += 1;
  }

  recordIncorrect(): void {
    this.totalIncorrectValue += 1;
  }

  snapshot(): StatisticsSnapshot {
    const end = this.endedAt ?? Date.now();
    const elapsedMilliseconds = this.startedAt === null ? 0 : end - this.startedAt;

    return {
      questionsAsked: this.questionsAskedValue,
      totalCorrect: this.totalCorrectValue,
      totalIncorrect: this.totalIncorrectValue,
      elapsedTimeSeconds: Math.max(0, Math.floor(elapsedMilliseconds / 1000)),
      categoryBreakdown: Object.fromEntries(this.categoryBreakdown),
      difficultyBreakdown: Object.fromEntries(this.difficultyBreakdown)
    };
  }

  private increment(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1);
  }
}
