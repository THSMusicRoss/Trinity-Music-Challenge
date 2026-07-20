import { APP_CONFIG } from "./core/config";
import { GameManager } from "./core/GameManager";
import { GameState } from "./core/GameState";
import { GameplayController } from "./features/gameplay/GameplayController";
import { SaveGameRepository } from "./features/gameplay/SaveGameRepository";
import type { SavedGame } from "./features/gameplay/SaveGameTypes";
import { PresetScreen } from "./features/presets/PresetScreen";
import type { SessionPreset } from "./features/presets/PresetTypes";
import { QuestionLoader } from "./features/questions/QuestionLoader";
import type { Question } from "./features/questions/QuestionTypes";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { SetupWizard } from "./features/setup/SetupWizard";
import { Team } from "./features/teams/Team";
import { FullscreenManager } from "./ui/FullscreenManager";
import { SoundManager } from "./ui/SoundManager";
import { AccessibilityManager } from "./ui/AccessibilityManager";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { ScreenRouter } from "./ui/ScreenRouter";
import { ThemeManager } from "./ui/ThemeManager";

class TrinityMusicChallengeApp {
  private readonly game = new GameManager();
  private readonly router = new ScreenRouter();
  private readonly themeManager = new ThemeManager();
  private readonly fullscreenManager = new FullscreenManager();
  private readonly sounds = new SoundManager();
  private readonly accessibility = new AccessibilityManager();
  private readonly confirmDialog = new ConfirmDialog();
  private readonly saveRepository = new SaveGameRepository();
  private readonly footerStatus = document.querySelector<HTMLElement>("#footer-status");
  private readonly gameStateElement = document.querySelector<HTMLElement>("#game-state");
  private readonly questionBankStatus = document.querySelector<HTMLElement>("#question-bank-status");
  private readonly resumeButton = document.querySelector<HTMLButtonElement>("#resume-game-button");
  private readonly resumeDetails = document.querySelector<HTMLElement>("#resume-game-details");
  private readonly questionLoader = new QuestionLoader();
  private questions: readonly Question[] = [];

  private readonly settingsScreen = new SettingsScreen(
    this.themeManager,
    (screenId) => this.router.show(screenId),
    (message) => this.setStatus(message)
  );

  private readonly setupWizard = new SetupWizard(
    this.game,
    (screenId) => this.router.show(screenId),
    (message) => this.setStatus(message)
  );

  private readonly gameplay = new GameplayController(
    this.game,
    (screenId) => this.router.show(screenId),
    (message) => this.setStatus(message),
    (save) => this.persistGame(save),
    () => this.clearSavedGame(),
    this.sounds,
    this.accessibility
  );

  private readonly presetScreen = new PresetScreen(
    (preset) => this.startWithPreset(preset),
    (screenId) => this.router.show(screenId),
    (message) => this.setStatus(message)
  );

  initialize(): void {
    this.themeManager.initialize();
    this.fullscreenManager.initialize();
    this.accessibility.initialize();
    this.setupWizard.setDefaultPreferences(this.settingsScreen.loadPreferences());
    this.bindGameEvents();
    this.bindActions();
    this.renderVersion();
    this.game.initialize();
    this.refreshResumeButton();
    void this.loadQuestionBank();

    window.addEventListener("tmc:setup-complete", () => {
      this.clearSavedGame();
      this.game.statistics.reset();
      this.gameplay.start();
    });

    window.addEventListener("tmc:play-again", () => {
      this.clearSavedGame();
      this.setupWizard.start();
      this.setStatus("Starting a new game with fresh setup.");
    });

    window.addEventListener("tmc:return-main-menu", () => {
      this.returnToMainMenu();
    });

    window.addEventListener("tmc:screen-changed", () => {
      this.accessibility.focusMainHeading();
    });

    window.addEventListener("tmc:escape", () => {
      if (this.game.state !== GameState.MAIN_MENU && this.game.state !== GameState.GAME_COMPLETE) {
        void this.requestReturnToMainMenu();
      }
    });

    window.addEventListener("beforeunload", () => {
      const save = this.gameplay.createSave();
      if (save && this.game.state !== GameState.GAME_COMPLETE) {
        this.saveRepository.save(save);
      }
    });
  }

  private async loadQuestionBank(): Promise<void> {
    try {
      const { pack, validation } = await this.questionLoader.load("/data/questions.json");
      this.questions = pack.questions;
      this.setupWizard.setQuestionBank(this.questions);
      this.gameplay.setQuestionBank(this.questions);
      if (this.questionBankStatus) {
        this.questionBankStatus.textContent = `${pack.questions.length} approved questions • ${validation.warningCount} warning(s)`;
      }
      this.setStatus(`Question bank loaded: ${pack.questions.length} questions.`);
      this.refreshResumeButton();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.questionBankStatus) this.questionBankStatus.textContent = "Load failed";
      this.setStatus(message);
      console.error(error);
    }
  }

  private bindGameEvents(): void {
    this.game.events.on("state:changed", ({ to }) => {
      if (this.gameStateElement) this.gameStateElement.textContent = to;
      this.setStatus(`Game state changed to ${to}.`);
    });
    this.game.events.on("game:error", ({ error }) => {
      console.error(error);
      this.setStatus(error.message);
    });
  }

  private bindActions(): void {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("[data-action]");
      if (!control) return;

      switch (control.dataset.action) {
        case "new-game":
          if (this.questions.length === 0) {
            this.setStatus("The question bank is still loading.");
            return;
          }
          this.clearSavedGame();
          this.setupWizard.setDefaultPreferences(this.settingsScreen.loadPreferences());
          this.setupWizard.start();
          break;
        case "resume-game":
          this.resumeSavedGame();
          break;
        case "presets":
          this.presetScreen.show();
          break;
        case "settings":
          this.settingsScreen.show();
          break;
        case "main-menu":
          void this.requestReturnToMainMenu();
          break;
      }
    });
  }

  private resumeSavedGame(): void {
    if (this.questions.length === 0) {
      this.setStatus("The question bank is still loading.");
      return;
    }

    const save = this.saveRepository.load();
    if (!save) {
      this.refreshResumeButton();
      this.setStatus("No resumable game was found.");
      return;
    }

    this.restoreGameManager(save);
    const restored = this.gameplay.resume(save);
    if (!restored) {
      this.clearSavedGame();
    }
  }

  private restoreGameManager(save: SavedGame): void {
    this.game.updateSettings(save.settings);
    this.game.replaceTeams(save.teams.map((snapshot) => Team.fromSnapshot(snapshot)));
    this.game.statistics.restore(save.statistics);

    const path = [
      GameState.GAME_SETUP,
      GameState.TEAM_SETUP,
      GameState.QUESTION_SETUP,
      GameState.READY,
      GameState.QUESTION_ACTIVE
    ];

    for (const state of path) {
      if (this.game.state === state) continue;
      this.game.transitionTo(state);
    }

    if (save.state === GameState.BUZZ_LOCKED) {
      this.game.transitionTo(GameState.BUZZ_LOCKED);
    } else if (save.state === GameState.PAUSED) {
      this.game.transitionTo(GameState.PAUSED);
    }
  }

  private persistGame(save: SavedGame): void {
    if (this.game.state === GameState.GAME_COMPLETE) return;
    this.saveRepository.save(save);
    this.refreshResumeButton();
    this.setStatus(`Game autosaved at question ${save.deckIndex + 1}.`);
  }

  private clearSavedGame(): void {
    this.saveRepository.clear();
    this.refreshResumeButton();
  }

  private refreshResumeButton(): void {
    const save = this.saveRepository.load();
    const ready = save !== null && this.questions.length > 0;

    if (this.resumeButton) this.resumeButton.disabled = !ready;
    if (this.resumeDetails) {
      this.resumeDetails.hidden = save === null;
      this.resumeDetails.textContent = save
        ? `Saved ${new Date(save.savedAt).toLocaleString()} • Question ${save.deckIndex + 1} of ${save.questionIds.length}`
        : "";
    }
  }

  private startWithPreset(preset: SessionPreset): void {
    this.clearSavedGame();
    this.setupWizard.start(preset);
    this.setStatus(`Loaded preset: ${preset.name}.`);
  }

  private async requestReturnToMainMenu(): Promise<void> {
    const active = [
      GameState.QUESTION_ACTIVE,
      GameState.BUZZ_LOCKED,
      GameState.PAUSED,
      GameState.ANSWER_REVIEW
    ].includes(this.game.state);

    if (active) {
      const confirmed = await this.confirmDialog.ask({
        title: "Leave the current game?",
        message: "Your game has been autosaved. You can resume it later from the main menu.",
        confirmLabel: "Leave Game",
        cancelLabel: "Keep Playing"
      });
      if (!confirmed) return;
    }

    this.returnToMainMenu();
  }

  private returnToMainMenu(): void {
    if (this.game.state !== GameState.MAIN_MENU) {
      this.game.transitionTo(GameState.MAIN_MENU);
    }
    this.router.show(APP_CONFIG.screens.MAIN_MENU);
    this.refreshResumeButton();
    this.setStatus("Returned to the main menu.");
  }

  private renderVersion(): void {
    const versionElement = document.querySelector<HTMLElement>("#app-version");
    if (versionElement) versionElement.textContent = APP_CONFIG.appVersion;
  }

  private setStatus(message: string): void {
    if (this.footerStatus) this.footerStatus.textContent = message;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new TrinityMusicChallengeApp().initialize();
});
