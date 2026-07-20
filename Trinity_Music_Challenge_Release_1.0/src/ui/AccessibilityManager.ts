export class AccessibilityManager {
  private readonly liveRegion = document.querySelector<HTMLElement>("#global-live-region");

  initialize(): void {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        document.body.classList.add("keyboard-navigation");
      }
      if (event.key === "Escape") {
        window.dispatchEvent(new CustomEvent("tmc:escape"));
      }
    });

    document.addEventListener("pointerdown", () => {
      document.body.classList.remove("keyboard-navigation");
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.dataset.reducedMotion = "true";
    }
  }

  announce(message: string): void {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = "";
    window.setTimeout(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    }, 20);
  }

  focusMainHeading(): void {
    const heading = document.querySelector<HTMLElement>(
      ".screen.screen-active h1, .screen.screen-active h2"
    );
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}
