export class FullscreenManager {
  private readonly button = document.querySelector<HTMLButtonElement>("#fullscreen-toggle");

  initialize(): void {
    this.button?.addEventListener("click", () => void this.toggle());
    document.addEventListener("fullscreenchange", () => this.updateButton());
    this.updateButton();
  }

  private async toggle(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen mode could not be changed.", error);
    }
  }

  private updateButton(): void {
    if (!this.button) return;
    this.button.textContent = document.fullscreenElement
      ? "Exit Presentation"
      : "Presentation Mode";
  }
}
