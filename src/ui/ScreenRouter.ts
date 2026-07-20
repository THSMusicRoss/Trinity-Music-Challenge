import { APP_CONFIG } from "../core/config";

export class ScreenRouter {
  private readonly screens = [...document.querySelectorAll<HTMLElement>(".screen")];
  private readonly placeholderTitle = document.querySelector<HTMLElement>("#placeholder-title");
  private readonly placeholderMessage = document.querySelector<HTMLElement>("#placeholder-message");

  show(screenId: string): void {
    const target = document.getElementById(screenId);

    if (!target) {
      throw new Error(`Unknown screen: ${screenId}`);
    }

    for (const screen of this.screens) {
      screen.classList.toggle("screen-active", screen === target);
    }

    target.querySelector<HTMLElement>("h1, h2")?.focus();
  }

  showPlaceholder(title: string, message: string): void {
    if (this.placeholderTitle) this.placeholderTitle.textContent = title;
    if (this.placeholderMessage) this.placeholderMessage.textContent = message;
    this.show(APP_CONFIG.screens.PLACEHOLDER);
  }
}
