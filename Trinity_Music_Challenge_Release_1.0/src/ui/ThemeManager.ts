import { APP_CONFIG, type ThemeName } from "../core/config";
import { readJson, writeJson } from "../services/storage";

interface Preferences {
  readonly theme?: ThemeName;
}

export class ThemeManager {
  private readonly root = document.documentElement;
  private readonly toggleButton = document.querySelector<HTMLButtonElement>("#theme-toggle");
  private readonly statusElement = document.querySelector<HTMLElement>("#theme-status");

  initialize(): void {
    const preferences = readJson<Preferences>(APP_CONFIG.storageKeys.preferences, {});
    const theme = preferences.theme && APP_CONFIG.supportedThemes.includes(preferences.theme)
      ? preferences.theme
      : APP_CONFIG.defaultTheme;

    this.apply(theme);
    this.toggleButton?.addEventListener("click", () => this.toggle());
  }

  apply(theme: ThemeName): void {
    this.root.dataset.theme = theme;
    this.updateUi(theme);

    const preferences = readJson<Preferences>(APP_CONFIG.storageKeys.preferences, {});
    writeJson(APP_CONFIG.storageKeys.preferences, { ...preferences, theme });
  }

  toggle(): void {
    this.apply(this.root.dataset.theme === "dark" ? "light" : "dark");
  }

  private updateUi(theme: ThemeName): void {
    const isDark = theme === "dark";

    if (this.toggleButton) {
      this.toggleButton.textContent = isDark ? "Light Theme" : "Dark Theme";
      this.toggleButton.setAttribute(
        "aria-label",
        `Switch to ${isDark ? "light" : "dark"} classroom theme`
      );
    }

    if (this.statusElement) {
      this.statusElement.textContent = isDark ? "Dark Classroom" : "Light Classroom";
    }
  }
}
