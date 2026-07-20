export interface CountdownCallbacks {
  readonly onTick?: (remainingSeconds: number) => void;
  readonly onExpire?: () => void;
}

export class CountdownTimer {
  private intervalId: number | null = null;
  private remainingValue = 0;
  private runningValue = false;
  private pausedValue = false;

  constructor(private readonly callbacks: CountdownCallbacks = {}) {}

  get remainingSeconds(): number {
    return this.remainingValue;
  }

  get running(): boolean {
    return this.runningValue;
  }

  get paused(): boolean {
    return this.pausedValue;
  }

  start(seconds: number): void {
    this.stop();
    this.remainingValue = Math.max(0, Math.floor(seconds));
    this.runningValue = true;
    this.pausedValue = false;
    this.callbacks.onTick?.(this.remainingValue);

    if (this.remainingValue === 0) {
      this.expire();
      return;
    }

    this.intervalId = window.setInterval(() => {
      this.remainingValue = Math.max(0, this.remainingValue - 1);
      this.callbacks.onTick?.(this.remainingValue);
      if (this.remainingValue === 0) this.expire();
    }, 1000);
  }

  pause(): void {
    if (!this.runningValue || this.pausedValue) return;
    this.clearInterval();
    this.pausedValue = true;
  }

  resume(): void {
    if (!this.runningValue || !this.pausedValue) return;
    this.pausedValue = false;
    this.intervalId = window.setInterval(() => {
      this.remainingValue = Math.max(0, this.remainingValue - 1);
      this.callbacks.onTick?.(this.remainingValue);
      if (this.remainingValue === 0) this.expire();
    }, 1000);
  }

  stop(): void {
    this.clearInterval();
    this.runningValue = false;
    this.pausedValue = false;
  }

  reset(seconds: number): void {
    this.start(seconds);
  }

  private expire(): void {
    this.clearInterval();
    this.runningValue = false;
    this.pausedValue = false;
    this.callbacks.onExpire?.();
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
