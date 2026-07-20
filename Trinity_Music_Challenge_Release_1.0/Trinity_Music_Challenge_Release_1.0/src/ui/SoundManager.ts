export type SoundCue =
  | "buzz"
  | "correct"
  | "incorrect"
  | "timer-warning"
  | "time-expired"
  | "question-next"
  | "winner";

export class SoundManager {
  private context: AudioContext | null = null;
  private lastWarningSecond: number | null = null;

  play(cue: SoundCue, enabled = true): void {
    if (!enabled) return;

    const context = this.getContext();
    if (!context) return;

    const patterns: Record<SoundCue, readonly [number, number, number][]> = {
      buzz: [[440, 0, .12], [660, .12, .12]],
      correct: [[523.25, 0, .12], [659.25, .12, .12], [783.99, .24, .18]],
      incorrect: [[220, 0, .16], [174.61, .16, .24]],
      "timer-warning": [[880, 0, .08]],
      "time-expired": [[330, 0, .12], [247, .12, .12], [196, .24, .26]],
      "question-next": [[392, 0, .08], [523.25, .08, .12]],
      winner: [[523.25, 0, .15], [659.25, .15, .15], [783.99, .3, .15], [1046.5, .45, .35]]
    };

    for (const [frequency, delay, duration] of patterns[cue]) {
      this.tone(context, frequency, delay, duration);
    }
  }

  playTimerWarning(second: number, enabled = true): void {
    if (second > 5 || second <= 0 || this.lastWarningSecond === second) return;
    this.lastWarningSecond = second;
    this.play("timer-warning", enabled);
  }

  resetTimerWarning(): void {
    this.lastWarningSecond = null;
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.context) {
        this.context = new AudioContext();
      }
      if (this.context.state === "suspended") {
        void this.context.resume();
      }
      return this.context;
    } catch {
      return null;
    }
  }

  private tone(
    context: AudioContext,
    frequency: number,
    delay: number,
    duration: number
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    const end = start + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.16, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + .02);
  }
}
