import type { Question } from "../questions/QuestionTypes";

export class QuestionDeck {
  private index = -1;

  constructor(
    private readonly questionsValue: readonly Question[],
    initialIndex = -1
  ) {
    this.index = Math.max(-1, Math.min(initialIndex, questionsValue.length - 1));
  }

  get total(): number {
    return this.questionsValue.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  get current(): Question | null {
    return this.index >= 0 ? this.questionsValue[this.index] ?? null : null;
  }

  get hasNext(): boolean {
    return this.index + 1 < this.questionsValue.length;
  }

  get completedCount(): number {
    return Math.max(0, this.index + 1);
  }

  next(): Question | null {
    if (!this.hasNext) return null;
    this.index += 1;
    return this.current;
  }

  all(): readonly Question[] {
    return this.questionsValue;
  }
}
