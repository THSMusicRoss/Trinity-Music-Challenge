import { GameState } from "../../core/GameState";
import type { GameManager } from "../../core/GameManager";
import { CATEGORIES, DIFFICULTIES, QUESTION_TYPES, type Category, type Difficulty, type Question, type QuestionType } from "../questions/QuestionTypes";
import { filterQuestions } from "../questions/QuestionFilter";
import type { GameSettings, ScoringMethod } from "../settings/SettingsTypes";
import { Team } from "../teams/Team";
import { PresetRepository } from "../presets/PresetRepository";
import type { SessionPreset } from "../presets/PresetTypes";
import { createDefaultSetupDraft } from "./SetupDefaults";
import type { UserPreferences } from "../settings/PreferencesTypes";
import { TEAM_COLORS, type SetupDraft, type TeamSetup } from "./SetupTypes";

const CATEGORY_LABELS: Record<Category, string> = {
  instruments: "Instruments",
  music_vocabulary: "Music Vocabulary",
  music_symbols_notation: "Music Symbols & Notation",
  music_history: "Music History",
  artists_bands: "Artists & Bands",
  genres: "Genres",
  lyrics_songs: "Lyrics & Songs",
  fun_miscellaneous: "Fun & Miscellaneous"
};

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  open_response: "Open Response"
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  challenging: "Challenging"
};

export class SetupWizard {
  private step = 0;
  private defaultPreferences: UserPreferences | undefined;
  private draft: SetupDraft = createDefaultSetupDraft();
  private questionBank: readonly Question[] = [];
  private readonly repository = new PresetRepository();

  private readonly content = document.querySelector<HTMLElement>("#setup-content");
  private readonly stepLabel = document.querySelector<HTMLElement>("#setup-step-label");
  private readonly progress = document.querySelector<HTMLElement>("#setup-progress");
  private readonly backButton = document.querySelector<HTMLButtonElement>("#setup-back");
  private readonly nextButton = document.querySelector<HTMLButtonElement>("#setup-next");
  private readonly cancelButton = document.querySelector<HTMLButtonElement>("#setup-cancel");

  constructor(
    private readonly game: GameManager,
    private readonly onShowScreen: (screenId: string) => void,
    private readonly onStatus: (message: string) => void
  ) {
    this.bind();
  }

  setDefaultPreferences(preferences: UserPreferences): void {
    this.defaultPreferences = preferences;
  }

  setQuestionBank(questions: readonly Question[]): void {
    this.questionBank = questions;
  }

  start(preset?: SessionPreset): void {
    this.step = 0;
    this.draft = preset
      ? this.fromPreset(preset)
      : createDefaultSetupDraft(this.defaultPreferences);
    this.game.transitionTo(GameState.GAME_SETUP);
    this.onShowScreen("screen-setup");
    this.render();
  }

  private bind(): void {
    this.backButton?.addEventListener("click", () => this.back());
    this.nextButton?.addEventListener("click", () => this.next());
    this.cancelButton?.addEventListener("click", () => this.cancel());
    this.content?.addEventListener("change", () => this.readCurrentStep());
    this.content?.addEventListener("input", () => this.readCurrentStep());
    this.content?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("[data-team-action]");
      if (!button) return;
      this.readCurrentStep();
      if (button.dataset.teamAction === "add") this.addTeam();
      if (button.dataset.teamAction === "remove") this.removeTeam(button.dataset.teamId ?? "");
    });
  }

  private next(): void {
    this.readCurrentStep();
    const error = this.validateStep();
    if (error) {
      this.onStatus(error);
      this.content?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    if (this.step === 4) {
      this.finish();
      return;
    }

    this.step += 1;
    this.transitionForStep();
    this.render();
  }

  private back(): void {
    this.readCurrentStep();
    if (this.step === 0) {
      this.cancel();
      return;
    }
    this.step -= 1;
    this.transitionForStep();
    this.render();
  }

  private cancel(): void {
    if (this.game.state !== GameState.MAIN_MENU) {
      this.game.transitionTo(GameState.MAIN_MENU);
    }
    this.onShowScreen("screen-main-menu");
    this.onStatus("Game setup canceled.");
  }

  private transitionForStep(): void {
    const desired = [
      GameState.GAME_SETUP,
      GameState.TEAM_SETUP,
      GameState.QUESTION_SETUP,
      GameState.QUESTION_SETUP,
      GameState.READY
    ][this.step];

    if (desired && this.game.state !== desired) {
      this.game.transitionTo(desired);
    }
  }

  private render(): void {
    if (!this.content || !this.stepLabel || !this.progress || !this.nextButton || !this.backButton) return;

    const labels = ["Game Mode", "Teams", "Questions", "Scoring", "Review"];
    this.stepLabel.textContent = `Step ${this.step + 1} of 5 • ${labels[this.step] ?? ""}`;
    this.progress.style.width = `${((this.step + 1) / 5) * 100}%`;
    this.backButton.textContent = this.step === 0 ? "Cancel" : "Back";
    this.nextButton.textContent = this.step === 4 ? "Start Game" : "Continue";

    const renderers = [
      () => this.renderMode(),
      () => this.renderTeams(),
      () => this.renderQuestions(),
      () => this.renderScoring(),
      () => this.renderReview()
    ];
    this.content.innerHTML = renderers[this.step]?.() ?? "";
    this.updateAvailability();
  }

  private renderMode(): string {
    const s = this.draft.settings;
    return `
      <fieldset class="setup-fieldset">
        <legend>How will students answer?</legend>
        <div class="choice-grid choice-grid-two">
          ${this.radioCard("mode", "manual", "Manual Classroom Mode", "Students raise hands or use physical buzzers.", s.mode === "manual")}
          ${this.radioCard("mode", "buzzer", "Built-in Buzzers", "The software locks in the first team to buzz.", s.mode === "buzzer")}
        </div>
      </fieldset>

      <fieldset class="setup-fieldset">
        <legend>Timer and sound</legend>
        <div class="form-grid">
          <label class="toggle-row">
            <input id="timer-enabled" type="checkbox" ${s.timerEnabled ? "checked" : ""}>
            <span>Use a question timer</span>
          </label>
          <label>
            Time per question
            <select id="timer-length" ${s.timerEnabled ? "" : "disabled"}>
              ${[10,15,20,30,45,60].map((v) => `<option value="${v}" ${s.timerLengthSeconds === v ? "selected" : ""}>${v} seconds</option>`).join("")}
            </select>
          </label>
          <label class="toggle-row">
            <input id="sound-enabled" type="checkbox" ${s.soundEnabled ? "checked" : ""}>
            <span>Use sound effects</span>
          </label>
        </div>
      </fieldset>`;
  }

  private renderTeams(): string {
    return `
      <div class="section-heading">
        <div><h3>Teams</h3><p>Use 2–6 teams. Names and starting scores can be changed now.</p></div>
        <button class="button button-secondary" type="button" data-team-action="add" ${this.draft.teams.length >= 6 ? "disabled" : ""}>Add Team</button>
      </div>
      <div class="team-editor-list">
        ${this.draft.teams.map((team, index) => `
          <article class="team-editor-card">
            <span class="team-number">${index + 1}</span>
            <label>Team name<input data-team-field="name" data-team-id="${team.id}" value="${this.escape(team.name)}" maxlength="30"></label>
            <label>Color<select data-team-field="color" data-team-id="${team.id}">
              ${TEAM_COLORS.map((color) => `<option value="${color}" ${team.color === color ? "selected" : ""}>${this.capitalize(color)}</option>`).join("")}
            </select></label>
            <label>Starting score<input data-team-field="score" data-team-id="${team.id}" type="number" step="10" value="${team.startingScore}"></label>
            <button class="button button-danger" type="button" data-team-action="remove" data-team-id="${team.id}" ${this.draft.teams.length <= 2 ? "disabled" : ""}>Remove</button>
          </article>`).join("")}
      </div>`;
  }

  private renderQuestions(): string {
    const s = this.draft.settings;
    return `
      <div class="question-options-grid">
        <fieldset class="setup-fieldset">
          <legend>Categories</legend>
          <div class="check-grid">
            ${CATEGORIES.map((value) => this.checkbox("category", value, CATEGORY_LABELS[value], s.categories.includes(value))).join("")}
          </div>
        </fieldset>

        <fieldset class="setup-fieldset">
          <legend>Difficulty</legend>
          <div class="check-grid compact">
            ${DIFFICULTIES.map((value) => this.checkbox("difficulty", value, DIFFICULTY_LABELS[value], s.difficulties.includes(value))).join("")}
          </div>
        </fieldset>

        <fieldset class="setup-fieldset">
          <legend>Question types</legend>
          <div class="check-grid compact">
            ${QUESTION_TYPES.map((value) => this.checkbox("question-type", value, TYPE_LABELS[value], s.questionTypes.includes(value))).join("")}
          </div>
        </fieldset>

        <fieldset class="setup-fieldset">
          <legend>Game length and distribution</legend>
          <div class="form-grid">
            <label>Number of questions
              <select id="question-count">
                ${[10,15,20,25,30,40,50].map((v) => `<option value="${v}" ${s.questionCount === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </label>
            <label>Distribution
              <select id="distribution-method">
                <option value="balanced" ${s.distributionMethod === "balanced" ? "selected" : ""}>Balanced: 30% / 50% / 20%</option>
                <option value="random" ${s.distributionMethod === "random" ? "selected" : ""}>Completely random</option>
              </select>
            </label>
          </div>
          <p id="availability-message" class="availability-message"></p>
        </fieldset>
      </div>`;
  }

  private renderScoring(): string {
    const s = this.draft.settings;
    return `
      <fieldset class="setup-fieldset">
        <legend>Point system</legend>
        <div class="choice-grid choice-grid-three">
          ${this.radioCard("scoring-method", "difficulty", "Difficulty-Based", "Easy 100 • Medium 200 • Challenging 300", s.scoringMethod === "difficulty")}
          ${this.radioCard("scoring-method", "fixed", "Fixed", "Every question uses one point value.", s.scoringMethod === "fixed")}
          ${this.radioCard("scoring-method", "custom", "Custom", "Set a value for each difficulty.", s.scoringMethod === "custom")}
        </div>
        <div class="point-editor">
          <label>Fixed value<input id="fixed-points" type="number" min="0" step="25" value="${s.fixedPointValue}"></label>
          <label>Easy<input id="easy-points" type="number" min="0" step="25" value="${s.pointValues.easy}"></label>
          <label>Medium<input id="medium-points" type="number" min="0" step="25" value="${s.pointValues.medium}"></label>
          <label>Challenging<input id="challenging-points" type="number" min="0" step="25" value="${s.pointValues.challenging}"></label>
        </div>
      </fieldset>

      <fieldset class="setup-fieldset">
        <legend>Gameplay rules</legend>
        <div class="form-grid">
          <label class="toggle-row"><input id="subtract-points" type="checkbox" ${s.subtractPointsForIncorrect ? "checked" : ""}><span>Subtract points for incorrect answers</span></label>
          <label class="toggle-row"><input id="steals-allowed" type="checkbox" ${s.stealsAllowed ? "checked" : ""}><span>Allow steals</span></label>
          <label class="toggle-row"><input id="passing-allowed" type="checkbox" ${s.passingAllowed ? "checked" : ""}><span>Allow teams to pass</span></label>
          <label>Tie rule<select id="tie-rule">
            <option value="sudden_death" ${s.tieRule === "sudden_death" ? "selected" : ""}>Sudden Death</option>
            <option value="shared_victory" ${s.tieRule === "shared_victory" ? "selected" : ""}>Shared Victory</option>
            <option value="teacher_decides" ${s.tieRule === "teacher_decides" ? "selected" : ""}>Teacher Decides</option>
          </select></label>
        </div>
      </fieldset>`;
  }

  private renderReview(): string {
    const s = this.draft.settings;
    const available = this.getAvailableQuestions().length;
    return `
      <div class="review-grid">
        ${this.reviewCard("Game", [
          ["Answer method", s.mode === "manual" ? "Manual Classroom Mode" : "Built-in Buzzers"],
          ["Timer", s.timerEnabled ? `${s.timerLengthSeconds} seconds` : "Off"],
          ["Sound", s.soundEnabled ? "On" : "Off"]
        ])}
        ${this.reviewCard("Teams", this.draft.teams.map((team) => [team.name, `${this.capitalize(team.color)} • starts at ${team.startingScore}`]))}
        ${this.reviewCard("Questions", [
          ["Game length", `${s.questionCount} questions`],
          ["Available", `${available} matching questions`],
          ["Distribution", s.distributionMethod === "balanced" ? "30% Easy / 50% Medium / 20% Challenging" : "Completely random"],
          ["Categories", `${s.categories.length} selected`],
          ["Question types", `${s.questionTypes.length} selected`]
        ])}
        ${this.reviewCard("Scoring", [
          ["Method", this.capitalize(s.scoringMethod)],
          ["Incorrect penalty", s.subtractPointsForIncorrect ? "Subtract points" : "No penalty"],
          ["Steals", s.stealsAllowed ? "Allowed" : "Not allowed"],
          ["Passing", s.passingAllowed ? "Allowed" : "Not allowed"],
          ["Tie", s.tieRule.replaceAll("_", " ")]
        ])}
      </div>
      <div class="preset-save-panel">
        <label>Save these settings as a preset
          <input id="preset-name" type="text" maxlength="40" placeholder="Example: Guitar Review">
        </label>
        <button id="save-preset" class="button button-secondary" type="button">Save Preset</button>
        <span id="preset-save-status" role="status"></span>
      </div>`;
  }

  private readCurrentStep(): void {
    if (this.step === 0) this.readMode();
    if (this.step === 1) this.readTeams();
    if (this.step === 2) this.readQuestions();
    if (this.step === 3) this.readScoring();
    if (this.step === 4) this.bindSavePreset();
    this.updateAvailability();
  }

  private readMode(): void {
    const mode = this.selectedRadio("mode") as GameSettings["mode"] | null;
    const timerEnabled = this.checked("#timer-enabled");
    this.updateSettings({
      mode: mode ?? this.draft.settings.mode,
      timerEnabled,
      timerLengthSeconds: this.numberValue("#timer-length", this.draft.settings.timerLengthSeconds),
      soundEnabled: this.checked("#sound-enabled")
    });
    const timerSelect = document.querySelector<HTMLSelectElement>("#timer-length");
    if (timerSelect) timerSelect.disabled = !timerEnabled;
  }

  private readTeams(): void {
    const teams = this.draft.teams.map((team) => {
      const name = document.querySelector<HTMLInputElement>(`[data-team-field="name"][data-team-id="${team.id}"]`)?.value.trim() ?? team.name;
      const color = document.querySelector<HTMLSelectElement>(`[data-team-field="color"][data-team-id="${team.id}"]`)?.value ?? team.color;
      const score = Number(document.querySelector<HTMLInputElement>(`[data-team-field="score"][data-team-id="${team.id}"]`)?.value ?? team.startingScore);
      return { ...team, name, color, startingScore: Number.isFinite(score) ? score : 0 };
    });
    this.draft = { ...this.draft, teams };
  }

  private readQuestions(): void {
    this.updateSettings({
      categories: this.checkedValues("category") as Category[],
      difficulties: this.checkedValues("difficulty") as Difficulty[],
      questionTypes: this.checkedValues("question-type") as QuestionType[],
      questionCount: this.numberValue("#question-count", this.draft.settings.questionCount),
      distributionMethod: (document.querySelector<HTMLSelectElement>("#distribution-method")?.value ?? "balanced") as GameSettings["distributionMethod"]
    });
  }

  private readScoring(): void {
    const scoringMethod = (this.selectedRadio("scoring-method") ?? "difficulty") as ScoringMethod;
    this.updateSettings({
      scoringMethod,
      fixedPointValue: this.numberValue("#fixed-points", 100),
      pointValues: {
        easy: this.numberValue("#easy-points", 100),
        medium: this.numberValue("#medium-points", 200),
        challenging: this.numberValue("#challenging-points", 300)
      },
      subtractPointsForIncorrect: this.checked("#subtract-points"),
      stealsAllowed: this.checked("#steals-allowed"),
      passingAllowed: this.checked("#passing-allowed"),
      tieRule: (document.querySelector<HTMLSelectElement>("#tie-rule")?.value ?? "sudden_death") as GameSettings["tieRule"]
    });
  }

  private bindSavePreset(): void {
    const button = document.querySelector<HTMLButtonElement>("#save-preset");
    if (button?.dataset.bound === "true") return;
    if (button) {
      button.dataset.bound = "true";
      button.addEventListener("click", () => this.savePreset());
    }
  }

  private savePreset(): void {
    const input = document.querySelector<HTMLInputElement>("#preset-name");
    const status = document.querySelector<HTMLElement>("#preset-save-status");
    const name = input?.value.trim() ?? "";
    if (!name) {
      if (status) status.textContent = "Enter a preset name.";
      return;
    }
    const now = new Date().toISOString();
    const id = `preset-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
    this.repository.save({
      id,
      name,
      settings: { ...this.draft.settings, presetName: name },
      teamCount: this.draft.teams.length,
      createdAt: now,
      updatedAt: now
    });
    if (status) status.textContent = "Preset saved.";
    this.onStatus(`Preset saved: ${name}.`);
  }

  private validateStep(): string | null {
    if (this.step === 1) {
      if (this.draft.teams.length < 2 || this.draft.teams.length > 6) return "Choose between 2 and 6 teams.";
      if (this.draft.teams.some((team) => !team.name.trim())) return "Every team needs a name.";
      const normalized = this.draft.teams.map((team) => team.name.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) return "Team names must be unique.";
    }
    if (this.step === 2) {
      if (!this.draft.settings.categories.length) return "Select at least one category.";
      if (!this.draft.settings.difficulties.length) return "Select at least one difficulty.";
      if (!this.draft.settings.questionTypes.length) return "Select at least one question type.";
      if (this.getAvailableQuestions().length < this.draft.settings.questionCount) {
        return `Only ${this.getAvailableQuestions().length} questions match. Reduce the game length or widen the filters.`;
      }
    }
    return null;
  }

  private finish(): void {
    const available = this.getAvailableQuestions().length;
    if (available < this.draft.settings.questionCount) {
      this.onStatus("The game cannot start because too few questions match.");
      return;
    }

    this.game.updateSettings(this.draft.settings);
    const teams = this.draft.teams.map((setup) => {
      const team = new Team(setup.id, setup.name, setup.color);
      if (setup.startingScore !== 0) team.adjustScore(setup.startingScore);
      return team;
    });
    this.game.replaceTeams(teams);
    window.dispatchEvent(new CustomEvent("tmc:setup-complete"));
    this.onStatus(`Game configured with ${teams.length} teams and ${this.draft.settings.questionCount} questions.`);
  }

  private addTeam(): void {
    if (this.draft.teams.length >= 6) return;
    const index = this.draft.teams.length;
    const team: TeamSetup = {
      id: `team-${Date.now()}`,
      name: `Team ${index + 1}`,
      color: TEAM_COLORS[index] ?? "blue",
      startingScore: 0
    };
    this.draft = { ...this.draft, teams: [...this.draft.teams, team] };
    this.render();
  }

  private removeTeam(id: string): void {
    if (this.draft.teams.length <= 2) return;
    this.draft = { ...this.draft, teams: this.draft.teams.filter((team) => team.id !== id) };
    this.render();
  }

  private updateSettings(patch: Partial<GameSettings>): void {
    this.draft = { ...this.draft, settings: { ...this.draft.settings, ...patch } };
  }

  private getAvailableQuestions(): Question[] {
    return filterQuestions(this.questionBank, {
      categories: this.draft.settings.categories as Category[],
      difficulties: this.draft.settings.difficulties as Difficulty[],
      types: this.draft.settings.questionTypes as QuestionType[]
    });
  }

  private updateAvailability(): void {
    const element = document.querySelector<HTMLElement>("#availability-message");
    if (!element) return;
    const count = this.getAvailableQuestions().length;
    const requested = this.draft.settings.questionCount;
    element.textContent = count >= requested
      ? `${count} approved questions match these filters.`
      : `Only ${count} questions match; ${requested} are required.`;
    element.classList.toggle("warning", count < requested);
  }

  private fromPreset(preset: SessionPreset): SetupDraft {
    const teams = Array.from({ length: Math.min(6, Math.max(2, preset.teamCount)) }, (_, index) => ({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`,
      color: TEAM_COLORS[index] ?? "blue",
      startingScore: 0
    }));
    return { settings: preset.settings, teams: teams as TeamSetup[] };
  }

  private radioCard(name: string, value: string, title: string, description: string, checked: boolean): string {
    return `<label class="choice-card"><input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}><span><strong>${title}</strong><small>${description}</small></span></label>`;
  }

  private checkbox(name: string, value: string, label: string, checked: boolean): string {
    return `<label class="check-card"><input type="checkbox" name="${name}" value="${value}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
  }

  private reviewCard(title: string, rows: readonly (readonly [string, string])[]): string {
    return `<article class="review-card"><h3>${title}</h3><dl>${rows.map(([label, value]) => `<div><dt>${this.escape(label)}</dt><dd>${this.escape(value)}</dd></div>`).join("")}</dl></article>`;
  }

  private checked(selector: string): boolean {
    return document.querySelector<HTMLInputElement>(selector)?.checked ?? false;
  }

  private numberValue(selector: string, fallback: number): number {
    const value = Number(document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  private selectedRadio(name: string): string | null {
    return document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null;
  }

  private checkedValues(name: string): string[] {
    return [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((input) => input.value);
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] ?? char));
  }
}
