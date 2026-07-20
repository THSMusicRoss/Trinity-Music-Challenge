import type { SessionPreset } from "./PresetTypes";
import { PresetRepository } from "./PresetRepository";

export class PresetScreen {
  private readonly repository = new PresetRepository();
  private readonly listElement = document.querySelector<HTMLElement>("#preset-list");

  constructor(
    private readonly onUse: (preset: SessionPreset) => void,
    private readonly onShowScreen: (screenId: string) => void,
    private readonly onStatus: (message: string) => void
  ) {
    this.listElement?.addEventListener("click", (event) => this.handleClick(event));
  }

  show(): void {
    this.render();
    this.onShowScreen("screen-presets");
  }

  private render(): void {
    if (!this.listElement) return;
    const presets = this.repository.list();
    this.listElement.innerHTML = presets.length
      ? presets.map((preset) => `
        <article class="preset-card">
          <div><h3>${this.escape(preset.name)}</h3><p>${preset.teamCount} teams • ${preset.settings.questionCount} questions • ${preset.settings.mode === "manual" ? "Manual" : "Built-in buzzers"}</p></div>
          <div class="preset-actions">
            <button class="button button-primary" data-preset-action="use" data-preset-id="${preset.id}">Use Preset</button>
            <button class="button button-danger" data-preset-action="delete" data-preset-id="${preset.id}">Delete</button>
          </div>
        </article>`).join("")
      : `<div class="empty-state"><h3>No presets saved yet</h3><p>Complete the setup wizard and save a configuration from the Review step.</p></div>`;
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-preset-action]");
    if (!button) return;
    const id = button.dataset.presetId ?? "";
    const preset = this.repository.list().find((item) => item.id === id);
    if (!preset) return;

    if (button.dataset.presetAction === "use") this.onUse(preset);
    if (button.dataset.presetAction === "delete") {
      this.repository.delete(id);
      this.render();
      this.onStatus(`Deleted preset: ${preset.name}.`);
    }
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
  }
}
