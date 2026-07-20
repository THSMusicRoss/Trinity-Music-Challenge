import type { ThemeName } from "../../core/config";
import type { ThemeManager } from "../../ui/ThemeManager";
import { PreferencesRepository } from "./PreferencesRepository";
import type { UserPreferences } from "./PreferencesTypes";
import type { GameMode } from "./SettingsTypes";

export class SettingsScreen {
  private readonly repository = new PreferencesRepository();
  private readonly form = document.querySelector<HTMLFormElement>("#settings-form");
  private readonly status = document.querySelector<HTMLElement>("#settings-save-status");

  constructor(
    private readonly themeManager: ThemeManager,
    private readonly onShowScreen: (screenId: string) => void,
    private readonly onStatus: (message: string) => void
  ) {
    this.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.save();
    });
  }

  show(): void {
    this.populate(this.repository.load());
    this.onShowScreen("screen-settings");
  }

  loadPreferences(): UserPreferences {
    return this.repository.load();
  }

  private populate(preferences: UserPreferences): void {
    this.setValue("#settings-theme", preferences.theme);
    this.setValue("#settings-default-mode", preferences.defaultMode);
    this.setChecked("#settings-default-timer", preferences.defaultTimerEnabled);
    this.setValue("#settings-default-timer-length", String(preferences.defaultTimerLengthSeconds));
    this.setChecked("#settings-default-sound", preferences.defaultSoundEnabled);
    this.setValue("#settings-default-question-count", String(preferences.defaultQuestionCount));
    if (this.status) this.status.textContent = "";
  }

  private save(): void {
    const preferences: UserPreferences = {
      theme: (this.value("#settings-theme") ?? "dark") as ThemeName,
      defaultMode: (this.value("#settings-default-mode") ?? "manual") as GameMode,
      defaultTimerEnabled: this.checked("#settings-default-timer"),
      defaultTimerLengthSeconds: this.number("#settings-default-timer-length", 20),
      defaultSoundEnabled: this.checked("#settings-default-sound"),
      defaultQuestionCount: this.number("#settings-default-question-count", 20)
    };

    if (!this.repository.save(preferences)) {
      if (this.status) this.status.textContent = "Settings could not be saved.";
      return;
    }

    this.themeManager.apply(preferences.theme);
    if (this.status) this.status.textContent = "Settings saved.";
    this.onStatus("Default settings saved.");
  }

  private value(selector: string): string | null {
    return document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value ?? null;
  }

  private number(selector: string, fallback: number): number {
    const value = Number(this.value(selector));
    return Number.isFinite(value) ? value : fallback;
  }

  private checked(selector: string): boolean {
    return document.querySelector<HTMLInputElement>(selector)?.checked ?? false;
  }

  private setValue(selector: string, value: string): void {
    const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
    if (element) element.value = value;
  }

  private setChecked(selector: string, checked: boolean): void {
    const element = document.querySelector<HTMLInputElement>(selector);
    if (element) element.checked = checked;
  }
}
