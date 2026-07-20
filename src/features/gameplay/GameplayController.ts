import { GameState } from "../../core/GameState";
import type { GameManager } from "../../core/GameManager";
import { shuffle } from "../../utils/shuffle";
import { filterQuestions } from "../questions/QuestionFilter";
import { QuestionSelector } from "../questions/QuestionSelector";
import { ScoreManager } from "../scoring/ScoreManager";
import type { SoundManager } from "../../ui/SoundManager";
import type { AccessibilityManager } from "../../ui/AccessibilityManager";
import type { Category, Difficulty, Question, QuestionType } from "../questions/QuestionTypes";
import { CountdownTimer } from "../timer/CountdownTimer";
import { QuestionDeck } from "./QuestionDeck";
import type { QuestionResult } from "./GameplayTypes";
import type { SavedGame } from "./SaveGameTypes";

const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  instruments: "Instruments",
  music_vocabulary: "Music Vocabulary",
  music_symbols_notation: "Music Symbols & Notation",
  music_history: "Music History",
  artists_bands: "Artists & Bands",
  genres: "Genres",
  lyrics_songs: "Lyrics & Songs",
  fun_miscellaneous: "Fun & Miscellaneous"
};

const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: "Easy",
  medium: "Medium",
  challenging: "Challenging"
};

export class GameplayController {
  private readonly selector = new QuestionSelector();
  private readonly scoreManager = new ScoreManager();
  private readonly timer: CountdownTimer;
  private questionBank: readonly Question[] = [];
  private deck: QuestionDeck | null = null;
  private answerRevealed = false;
  private buzzedTeamId: string | null = null;
  private eligibleTeamIds = new Set<string>();
  private questionStartedAt = 0;
  private readonly results: QuestionResult[] = [];
  private choices: readonly string[] = [];
  private suddenDeath = false;
  private suddenDeathTeamIds = new Set<string>();

  private readonly questionNumber = document.querySelector<HTMLElement>("#game-question-number");
  private readonly category = document.querySelector<HTMLElement>("#game-category");
  private readonly difficulty = document.querySelector<HTMLElement>("#game-difficulty");
  private readonly timerElement = document.querySelector<HTMLElement>("#game-timer");
  private readonly questionText = document.querySelector<HTMLElement>("#game-question-text");
  private readonly answerArea = document.querySelector<HTMLElement>("#game-answer-area");
  private readonly explanation = document.querySelector<HTMLElement>("#game-explanation");
  private readonly teacherControls = document.querySelector<HTMLElement>("#game-teacher-controls");
  private readonly teamControls = document.querySelector<HTMLElement>("#game-team-controls");
  private readonly scoreboard = document.querySelector<HTMLElement>("#game-scoreboard");
  private readonly statusBanner = document.querySelector<HTMLElement>("#game-status-banner");
  private readonly pauseButton = document.querySelector<HTMLButtonElement>("#game-pause");
  private readonly nextButton = document.querySelector<HTMLButtonElement>("#game-next");
  private readonly revealButton = document.querySelector<HTMLButtonElement>("#game-reveal");

  constructor(
    private readonly game: GameManager,
    private readonly onShowScreen: (screenId: string) => void,
    private readonly onStatus: (message: string) => void,
    private readonly onPersist: (save: SavedGame) => void,
    private readonly onComplete: () => void,
    private readonly sounds: SoundManager,
    private readonly accessibility: AccessibilityManager
  ) {
    this.timer = new CountdownTimer({
      onTick: (seconds) => this.renderTimer(seconds),
      onExpire: () => this.handleTimeExpired()
    });
    this.bindControls();
  }

  setQuestionBank(questions: readonly Question[]): void {
    this.questionBank = questions;
  }

  start(): void {
    const settings = this.game.settings;
    const filtered = filterQuestions(this.questionBank, {
      categories: settings.categories as Category[],
      difficulties: settings.difficulties as Difficulty[],
      types: settings.questionTypes as QuestionType[]
    });

    const selection = this.selector.select(filtered, {
      count: settings.questionCount,
      method: settings.distributionMethod
    });

    if (selection.questions.length < settings.questionCount) {
      this.onStatus(`Unable to start: only ${selection.questions.length} matching questions were selected.`);
      return;
    }

    this.deck = new QuestionDeck(selection.questions);
    this.results.length = 0;
    this.suddenDeath = false;
    this.suddenDeathTeamIds.clear();
    this.onShowScreen("screen-gameplay");
    this.game.statistics.start();
    this.renderScoreboard();
    this.nextQuestion();
  }

  resume(save: SavedGame): boolean {
    const questionsById = new Map(this.questionBank.map((question) => [question.id, question]));
    const restoredQuestions = save.questionIds
      .map((id) => questionsById.get(id))
      .filter((question): question is Question => question !== undefined);

    if (restoredQuestions.length !== save.questionIds.length || restoredQuestions.length === 0) {
      this.onStatus("The saved game cannot be restored because its questions are unavailable.");
      return false;
    }

    this.deck = new QuestionDeck(restoredQuestions, save.deckIndex);
    this.answerRevealed = save.answerRevealed;
    this.buzzedTeamId = save.buzzedTeamId;
    this.eligibleTeamIds = new Set(save.eligibleTeamIds);
    this.questionStartedAt = Date.now();
    this.results.splice(0, this.results.length, ...save.results);
    this.choices = [...save.choices];
    this.suddenDeath = save.suddenDeath;
    this.suddenDeathTeamIds = new Set(save.suddenDeathTeamIds);

    const question = this.deck.current;
    if (!question) return false;

    this.onShowScreen("screen-gameplay");
    this.renderScoreboard();
    this.renderQuestion(question);

    if (this.answerRevealed) {
      this.applyRevealedAnswer(question);
    } else if (this.game.settings.timerEnabled) {
      this.timer.start(Math.max(1, save.timerRemainingSeconds));
      if (save.timerPaused) this.timer.pause();
    } else {
      this.renderTimer(null);
    }

    if (save.timerPaused && this.pauseButton) {
      this.pauseButton.textContent = "Resume";
    }

    this.onStatus(`Saved game restored at question ${save.deckIndex + 1}.`);
    this.persist();
    return true;
  }

  createSave(): SavedGame | null {
    if (!this.deck || !this.deck.current) return null;

    return {
      schemaVersion: "1.0",
      savedAt: new Date().toISOString(),
      state: this.game.state,
      settings: this.game.settings,
      teams: this.game.teams.map((team) => team.snapshot()),
      questionIds: this.deck.all().map((question) => question.id),
      deckIndex: this.deck.currentIndex,
      answerRevealed: this.answerRevealed,
      buzzedTeamId: this.buzzedTeamId,
      eligibleTeamIds: [...this.eligibleTeamIds],
      choices: [...this.choices],
      results: [...this.results],
      timerRemainingSeconds: this.timer.remainingSeconds,
      timerPaused: this.timer.paused,
      suddenDeath: this.suddenDeath,
      suddenDeathTeamIds: [...this.suddenDeathTeamIds],
      statistics: this.game.statistics.snapshot()
    };
  }

  private persist(): void {
    const save = this.createSave();
    if (save) this.onPersist(save);
  }

  private nextQuestion(): void {
    const question = this.deck?.next() ?? null;
    if (!question) {
      this.completeGame();
      return;
    }

    this.answerRevealed = false;
    this.buzzedTeamId = null;
    this.eligibleTeamIds = this.suddenDeath
      ? new Set(this.suddenDeathTeamIds)
      : new Set(this.game.teams.map((team) => team.id));
    this.questionStartedAt = Date.now();
    this.sounds.resetTimerWarning();
    this.sounds.play("question-next", this.game.settings.soundEnabled);
    this.choices = question.type === "open_response"
      ? []
      : shuffle(question.choices);

    if (this.game.state !== GameState.QUESTION_ACTIVE) {
      this.game.transitionTo(GameState.QUESTION_ACTIVE);
    }

    this.renderQuestion(question);
    if (this.game.settings.timerEnabled) {
      this.timer.start(this.game.settings.timerLengthSeconds);
    } else {
      this.timer.stop();
      this.renderTimer(null);
    }
  }

  private renderQuestion(question: Question): void {
    if (this.questionNumber) {
      this.questionNumber.textContent = `Question ${(this.deck?.currentIndex ?? 0) + 1} of ${this.deck?.total ?? 0}`;
    }
    if (this.category) this.category.textContent = CATEGORY_LABELS[question.category];
    if (this.difficulty) {
      this.difficulty.textContent = DIFFICULTY_LABELS[question.difficulty];
      this.difficulty.dataset.difficulty = question.difficulty;
    }
    if (this.questionText) this.questionText.textContent = question.question;
    if (this.explanation) {
      this.explanation.hidden = true;
      this.explanation.textContent = "";
    }
    if (this.statusBanner) {
      this.statusBanner.hidden = true;
      this.statusBanner.textContent = "";
    }
    if (this.nextButton) this.nextButton.hidden = true;
    if (this.revealButton) {
      this.revealButton.hidden = false;
      this.revealButton.disabled = false;
    }

    this.renderAnswers(question);
    this.renderTeacherControls();
    this.renderTeamControls();
    this.onStatus(`Showing ${question.id}.`);
    this.game.statistics.recordQuestion(question.category, question.difficulty);
    this.persist();
  }

  private renderAnswers(question: Question): void {
    if (!this.answerArea) return;

    if (question.type === "open_response") {
      this.answerArea.innerHTML = `<div class="open-response-card">Open Response</div>`;
      return;
    }

    const labels = question.type === "true_false" ? ["", ""] : ["A", "B", "C", "D"];
    this.answerArea.innerHTML = this.choices.map((choice, index) => `
      <article class="answer-card" data-answer="${this.escapeAttribute(choice)}">
        ${labels[index] ? `<span class="answer-letter">${labels[index]}</span>` : ""}
        <span>${this.escapeHtml(choice)}</span>
      </article>
    `).join("");
  }

  private renderTeacherControls(): void {
    if (!this.teacherControls) return;
    const mode = this.game.settings.mode;

    if (mode === "manual") {
      this.teacherControls.innerHTML = `
        <div class="control-group">
          <strong>Manual Classroom Mode</strong>
          <span>Select the team that answered correctly, or mark the question unanswered.</span>
        </div>
        <div class="team-action-grid">
          ${this.game.teams.map((team) => `
            <button class="button team-correct-button" type="button" data-game-action="correct" data-team-id="${team.id}">
              ${this.escapeHtml(team.name)} Correct
            </button>
          `).join("")}
        </div>
        <button class="button button-danger" type="button" data-game-action="incorrect">No Correct Answer</button>
      `;
    } else {
      const buzzedTeam = this.game.teams.find((team) => team.id === this.buzzedTeamId);
      this.teacherControls.innerHTML = buzzedTeam
        ? `
          <div class="control-group">
            <strong>${this.escapeHtml(buzzedTeam.name)} buzzed in</strong>
            <span>Judge the response, then continue or reopen buzzing.</span>
          </div>
          <div class="teacher-button-row">
            <button class="button button-success" type="button" data-game-action="correct" data-team-id="${buzzedTeam.id}">Correct</button>
            <button class="button button-danger" type="button" data-game-action="buzz-incorrect" data-team-id="${buzzedTeam.id}">Incorrect</button>
            <button class="button button-secondary" type="button" data-game-action="reset-buzzers">Reset Buzzers</button>
          </div>
        `
        : `
          <div class="control-group">
            <strong>Built-in Buzzer Mode</strong>
            <span>Teams may buzz using the buttons below or number keys 1–6.</span>
          </div>
          <button class="button button-danger" type="button" data-game-action="incorrect">No Correct Answer</button>
        `;
    }
  }

  private renderTeamControls(): void {
    if (!this.teamControls) return;

    if (this.game.settings.mode !== "buzzer" || this.answerRevealed) {
      this.teamControls.innerHTML = "";
      this.teamControls.hidden = true;
      return;
    }

    this.teamControls.hidden = false;
    this.teamControls.innerHTML = this.game.teams.map((team, index) => {
      const eligible = this.eligibleTeamIds.has(team.id);
      const locked = this.buzzedTeamId !== null || !eligible;
      return `
        <button class="buzzer-button buzzer-${this.escapeAttribute(team.color)}" type="button"
          data-game-action="buzz" data-team-id="${team.id}" ${locked ? "disabled" : ""}>
          <span class="buzzer-key">${index + 1}</span>
          <strong>${this.escapeHtml(team.name)}</strong>
          <span>${eligible ? "BUZZ" : "Locked out"}</span>
        </button>
      `;
    }).join("");
  }

  private revealAnswer(): void {
    const question = this.deck?.current;
    if (!question || this.answerRevealed) return;

    this.answerRevealed = true;
    this.timer.stop();
    this.applyRevealedAnswer(question);
    this.onStatus(`Answer revealed for ${question.id}.`);
    this.persist();
  }

  private applyRevealedAnswer(question: Question): void {
    this.answerRevealed = true;
    this.timer.stop();

    for (const card of document.querySelectorAll<HTMLElement>(".answer-card")) {
      const isCorrect = card.dataset.answer === question.correctAnswer;
      card.classList.toggle("answer-correct", isCorrect);
      card.classList.toggle("answer-dimmed", !isCorrect);
    }

    if (question.type === "open_response" && this.answerArea) {
      this.answerArea.innerHTML = `
        <div class="open-response-card answer-correct">
          <span class="answer-label">Accepted answer</span>
          <strong>${this.escapeHtml(question.correctAnswer)}</strong>
        </div>`;
    }

    if (this.explanation) {
      this.explanation.hidden = false;
      this.explanation.innerHTML = `
        <strong>Answer:</strong> ${this.escapeHtml(question.correctAnswer)}
        <span>${this.escapeHtml(question.explanation)}</span>
      `;
    }

    if (this.revealButton) this.revealButton.hidden = true;
    if (this.nextButton) this.nextButton.hidden = false;
    this.renderTeamControls();
    this.renderTeacherControls();
  }

  private markCorrect(teamId: string): void {
    const question = this.deck?.current;
    if (!question || this.answerRevealed) return;

    const team = this.game.teams.find((candidate) => candidate.id === teamId);
    if (!team) return;

    const points = this.suddenDeath
      ? 0
      : this.scoreManager.getQuestionValue(this.game.settings, question.difficulty);

    team.recordCorrect(0);
    if (points > 0) {
      this.scoreManager.award(team, points, `Correct answer: ${question.id}`);
    }

    this.game.statistics.recordCorrect();
    this.recordResult("correct", teamId);
    const correctMessage = this.suddenDeath
      ? `${team.name} wins sudden death.`
      : `${team.name} answered correctly and earned ${points} points.`;
    this.sounds.play("correct", this.game.settings.soundEnabled);
    this.accessibility.announce(correctMessage);
    this.showOutcome(correctMessage, "correct");
    this.revealAnswer();
    this.renderScoreboard();
    this.persist();

    if (this.suddenDeath) {
      window.setTimeout(() => this.renderWinnerScreen([team]), 300);
    }
  }

  private markIncorrect(): void {
    const question = this.deck?.current;
    if (!question || this.answerRevealed) return;

    this.game.statistics.recordIncorrect();
    this.recordResult("incorrect", null);
    this.sounds.play("incorrect", this.game.settings.soundEnabled);
    this.accessibility.announce("No correct answer was awarded.");
    this.showOutcome("No correct answer was awarded.", "incorrect");
    this.revealAnswer();
    this.persist();
  }

  private markBuzzIncorrect(teamId: string): void {
    if (this.answerRevealed) return;
    const team = this.game.teams.find((candidate) => candidate.id === teamId);
    const question = this.deck?.current;
    if (!team || !question) return;

    const penalty = this.game.settings.subtractPointsForIncorrect && !this.suddenDeath
      ? this.scoreManager.getQuestionValue(this.game.settings, question.difficulty)
      : 0;

    team.recordIncorrect(0);
    this.sounds.play("incorrect", this.game.settings.soundEnabled);
    if (penalty > 0) {
      this.scoreManager.penalize(team, penalty, `Incorrect answer: ${question.id}`);
    }

    this.game.statistics.recordIncorrect();
    this.eligibleTeamIds.delete(teamId);
    this.renderScoreboard();
    this.buzzedTeamId = null;

    if (this.game.settings.stealsAllowed && this.eligibleTeamIds.size > 0) {
      if (this.game.state === GameState.BUZZ_LOCKED) {
        this.game.transitionTo(GameState.QUESTION_ACTIVE);
      }
      this.showOutcome(`${this.teamName(teamId)} was incorrect${penalty > 0 ? ` and lost ${penalty} points` : ""}. Buzzers reopened.`, "incorrect");
      this.renderTeacherControls();
      this.renderTeamControls();
      if (this.game.settings.timerEnabled && this.timer.paused) this.timer.resume();
      this.persist();
      return;
    }

    this.recordResult("incorrect", teamId);
    this.showOutcome(`${this.teamName(teamId)} was incorrect${penalty > 0 ? ` and lost ${penalty} points` : ""}.`, "incorrect");
    this.revealAnswer();
    this.persist();
  }

  private buzz(teamId: string): void {
    if (
      this.game.settings.mode !== "buzzer" ||
      this.answerRevealed ||
      this.buzzedTeamId ||
      !this.eligibleTeamIds.has(teamId)
    ) return;

    this.buzzedTeamId = teamId;
    this.game.teams.find((team) => team.id === teamId)?.recordBuzz();
    this.timer.pause();
    this.game.transitionTo(GameState.BUZZ_LOCKED);
    this.sounds.play("buzz", this.game.settings.soundEnabled);
    this.accessibility.announce(`${this.teamName(teamId)} buzzed in.`);
    this.showOutcome(`${this.teamName(teamId)} buzzed in.`, "buzz");
    this.renderTeacherControls();
    this.renderTeamControls();
    this.persist();
  }

  private resetBuzzers(): void {
    if (this.answerRevealed) return;
    this.buzzedTeamId = null;
    this.eligibleTeamIds = this.suddenDeath
      ? new Set(this.suddenDeathTeamIds)
      : new Set(this.game.teams.map((team) => team.id));
    if (this.game.state === GameState.BUZZ_LOCKED) {
      this.game.transitionTo(GameState.QUESTION_ACTIVE);
    }
    if (this.game.settings.timerEnabled && this.timer.paused) this.timer.resume();
    this.showOutcome("Buzzers reset.", "neutral");
    this.renderTeacherControls();
    this.renderTeamControls();
    this.persist();
  }

  private skipQuestion(): void {
    if (this.answerRevealed) return;
    this.recordResult("skipped", null);
    this.showOutcome("Question skipped.", "neutral");
    this.revealAnswer();
  }

  private handleTimeExpired(): void {
    if (this.answerRevealed) return;
    this.recordResult("time_expired", null);
    this.game.statistics.recordIncorrect();
    this.sounds.play("time-expired", this.game.settings.soundEnabled);
    this.accessibility.announce("Time expired.");
    this.showOutcome("Time expired.", "incorrect");
    this.revealAnswer();
  }

  private togglePause(): void {
    if (this.answerRevealed) return;

    if (this.game.state === GameState.PAUSED) {
      this.game.transitionTo(this.buzzedTeamId ? GameState.BUZZ_LOCKED : GameState.QUESTION_ACTIVE);
      this.timer.resume();
      if (this.pauseButton) this.pauseButton.textContent = "Pause";
      this.showOutcome("Game resumed.", "neutral");
    } else {
      this.game.transitionTo(GameState.PAUSED);
      this.timer.pause();
      if (this.pauseButton) this.pauseButton.textContent = "Resume";
      this.showOutcome("Game paused.", "neutral");
    }
    this.persist();
  }

  private completeGame(): void {
    this.timer.stop();
    this.game.statistics.stop();

    const leaders = this.scoreManager.leaders(this.game.teams);
    const tied = leaders.length > 1;

    if (tied && this.game.settings.tieRule === "sudden_death") {
      this.beginSuddenDeath(leaders.map((team) => team.id));
      return;
    }

    if (this.game.state !== GameState.GAME_COMPLETE) {
      this.game.transitionTo(GameState.GAME_COMPLETE);
    }

    if (tied && this.game.settings.tieRule === "teacher_decides") {
      this.renderTeacherDecision(leaders);
      return;
    }

    this.renderWinnerScreen(leaders);
  }

  private beginSuddenDeath(teamIds: readonly string[]): void {
    this.suddenDeath = true;
    this.suddenDeathTeamIds = new Set(teamIds);
    this.showOutcome("Tie game: sudden death begins.", "buzz");

    const settings = this.game.settings;
    const filtered = filterQuestions(this.questionBank, {
      categories: settings.categories as Category[],
      difficulties: settings.difficulties as Difficulty[],
      types: settings.questionTypes as QuestionType[]
    }).filter((question) => !this.results.some((result) => result.questionId === question.id));

    const selection = this.selector.select(filtered, { count: Math.min(10, filtered.length), method: "random" });
    this.deck = new QuestionDeck(selection.questions);
    this.results.length = 0;

    if (selection.questions.length === 0) {
      this.game.transitionTo(GameState.GAME_COMPLETE);
      this.renderWinnerScreen(
        this.game.teams.filter((team) => this.suddenDeathTeamIds.has(team.id))
      );
      return;
    }

    this.nextQuestion();
  }

  private renderTeacherDecision(leaders: readonly import("../teams/Team").Team[]): void {
    if (this.questionText) this.questionText.textContent = "Teacher Decision";
    if (this.questionNumber) this.questionNumber.textContent = "Tie Game";
    if (this.category) this.category.textContent = "Choose the winner";
    if (this.difficulty) this.difficulty.textContent = "";
    if (this.answerArea) {
      this.answerArea.innerHTML = leaders.map((team) => `
        <button class="winner-choice-card" type="button" data-winner-team="${team.id}">
          <strong>${this.escapeHtml(team.name)}</strong>
          <span>${team.score} points</span>
        </button>
      `).join("");
    }
    if (this.explanation) {
      this.explanation.hidden = false;
      this.explanation.textContent = "Select the winning team to complete the game.";
    }
    if (this.teacherControls) this.teacherControls.innerHTML = "";
    if (this.teamControls) {
      this.teamControls.innerHTML = "";
      this.teamControls.hidden = true;
    }
    if (this.revealButton) this.revealButton.hidden = true;
    if (this.nextButton) this.nextButton.hidden = true;
  }

  private renderWinnerScreen(winners: readonly import("../teams/Team").Team[]): void {
    this.timer.stop();
    if (this.game.state !== GameState.GAME_COMPLETE) {
      this.game.transitionTo(GameState.GAME_COMPLETE);
    }

    const ranked = this.scoreManager.rank(this.game.teams);
    const shared = winners.length > 1;
    const title = shared ? "Shared Victory" : "Winner";
    const winnerNames = winners.map((team) => team.name).join(" & ");

    if (this.questionText) this.questionText.textContent = winnerNames || "Game Complete";
    if (this.questionNumber) this.questionNumber.textContent = title;
    if (this.category) this.category.textContent = "Final Results";
    if (this.difficulty) this.difficulty.textContent = "";

    if (this.answerArea) {
      this.answerArea.innerHTML = `
        <div class="winner-card">
          <div class="winner-icon" aria-hidden="true">★</div>
          <h3>${this.escapeHtml(winnerNames || "Game Complete")}</h3>
          <p>${shared ? "The teams share the victory." : "Congratulations!"}</p>
        </div>
        <div class="final-standings">
          ${ranked.map((team, index) => `
            <article class="final-standing-row ${winners.some((winner) => winner.id === team.id) ? "final-winner" : ""}">
              <span class="standing-place">${index + 1}</span>
              <strong>${this.escapeHtml(team.name)}</strong>
              <span>${team.score} points</span>
            </article>
          `).join("")}
        </div>`;
    }

    if (this.explanation) {
      const stats = this.game.statistics.snapshot();
      this.explanation.hidden = false;
      this.explanation.innerHTML = `
        <strong>${stats.questionsAsked} questions completed</strong>
        <span>${stats.totalCorrect} correct responses • ${stats.totalIncorrect} incorrect responses</span>
      `;
    }

    if (this.teacherControls) {
      this.teacherControls.innerHTML = `
        <div class="teacher-button-row">
          <button class="button button-primary" type="button" data-finish-action="play-again">Play Again</button>
          <button class="button button-secondary" type="button" data-finish-action="main-menu">Main Menu</button>
        </div>`;
    }

    if (this.teamControls) {
      this.teamControls.innerHTML = "";
      this.teamControls.hidden = true;
    }
    if (this.revealButton) this.revealButton.hidden = true;
    if (this.nextButton) this.nextButton.hidden = true;
    this.renderScoreboard();
    this.sounds.play("winner", this.game.settings.soundEnabled);
    this.accessibility.announce(`Game complete. ${winnerNames || "No winner"}.`);
    this.onStatus(`Game complete. ${winnerNames || "No winner"}.`);
    this.onComplete();
  }

  private adjustScore(teamId: string): void {
    const team = this.game.teams.find((candidate) => candidate.id === teamId);
    if (!team) return;

    const raw = window.prompt(
      `Adjust ${team.name}'s score.\nEnter a positive or negative number:`,
      "100"
    );
    if (raw === null) return;

    const delta = Number(raw);
    if (!Number.isFinite(delta) || delta === 0) {
      this.onStatus("Score adjustment canceled: enter a nonzero number.");
      return;
    }

    this.scoreManager.adjust(team, delta, "Teacher adjustment");
    this.renderScoreboard();
    this.showOutcome(
      `${team.name}'s score was ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)}.`,
      "neutral"
    );
  }

  private recordResult(outcome: QuestionResult["outcome"], teamId: string | null): void {
    const question = this.deck?.current;
    if (!question) return;
    this.results.push({
      questionId: question.id,
      outcome,
      teamId,
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - this.questionStartedAt) / 1000))
    });
  }

  private renderScoreboard(): void {
    if (!this.scoreboard) return;
    const ranked = this.scoreManager.rank(this.game.teams);
    const rankById = new Map(ranked.map((team, index) => [team.id, index + 1]));
    const topScore = ranked[0]?.score;

    this.scoreboard.innerHTML = this.game.teams.map((team) => {
      const snapshot = team.snapshot();
      const rank = rankById.get(team.id) ?? 0;
      const leading = topScore !== undefined && snapshot.score === topScore;
      return `
        <article class="score-tile score-${this.escapeAttribute(team.color)} ${leading ? "score-leading" : ""}">
          <span class="score-rank">#${rank}</span>
          <strong>${this.escapeHtml(team.name)}</strong>
          <span class="score-value">${snapshot.score}</span>
          <small>${snapshot.correctAnswers} correct</small>
          <button class="score-adjust-button" type="button" data-score-adjust="${team.id}" aria-label="Adjust ${this.escapeAttribute(team.name)} score">Adjust</button>
        </article>`;
    }).join("");
  }

  private renderTimer(seconds: number | null): void {
    if (!this.timerElement) return;
    if (seconds === null) {
      this.timerElement.textContent = "No Timer";
      this.timerElement.classList.remove("timer-warning");
      return;
    }
    this.timerElement.textContent = String(seconds);
    this.timerElement.classList.toggle("timer-warning", seconds <= 5);
    this.sounds.playTimerWarning(seconds, this.game.settings.soundEnabled);
  }

  private showOutcome(message: string, type: "correct" | "incorrect" | "buzz" | "neutral"): void {
    if (!this.statusBanner) return;
    this.statusBanner.hidden = false;
    this.statusBanner.textContent = message;
    this.statusBanner.dataset.statusType = type;
  }

  private bindControls(): void {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const scoreButton = target.closest<HTMLButtonElement>("[data-score-adjust]");
      if (scoreButton) {
        this.adjustScore(scoreButton.dataset.scoreAdjust ?? "");
        return;
      }

      const winnerButton = target.closest<HTMLButtonElement>("[data-winner-team]");
      if (winnerButton) {
        const team = this.game.teams.find((candidate) => candidate.id === winnerButton.dataset.winnerTeam);
        if (team) this.renderWinnerScreen([team]);
        return;
      }

      const finishButton = target.closest<HTMLButtonElement>("[data-finish-action]");
      if (finishButton) {
        if (finishButton.dataset.finishAction === "play-again") {
          window.dispatchEvent(new CustomEvent("tmc:play-again"));
        }
        if (finishButton.dataset.finishAction === "main-menu") {
          window.dispatchEvent(new CustomEvent("tmc:return-main-menu"));
        }
        return;
      }

      const button = target.closest<HTMLButtonElement>("[data-game-action]");
      if (!button) return;

      const teamId = button.dataset.teamId ?? "";
      switch (button.dataset.gameAction) {
        case "buzz": this.buzz(teamId); break;
        case "correct": this.markCorrect(teamId); break;
        case "incorrect": this.markIncorrect(); break;
        case "buzz-incorrect": this.markBuzzIncorrect(teamId); break;
        case "reset-buzzers": this.resetBuzzers(); break;
        case "skip": this.skipQuestion(); break;
        case "reveal": this.revealAnswer(); break;
        case "next": this.nextQuestion(); break;
        case "pause": this.togglePause(); break;
      }
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();

      if (this.game.settings.mode === "buzzer" && !this.answerRevealed) {
        const index = Number(event.key) - 1;
        const team = this.game.teams[index];
        if (team) {
          event.preventDefault();
          this.buzz(team.id);
          return;
        }
      }

      if (key === "p") {
        event.preventDefault();
        this.togglePause();
      }
      if (key === "s" && !this.answerRevealed) {
        event.preventDefault();
        this.skipQuestion();
      }
      if ((event.code === "Space" || key === "r") && !this.answerRevealed) {
        event.preventDefault();
        this.revealAnswer();
      }
      if (key === "n" && this.answerRevealed) {
        event.preventDefault();
        this.nextQuestion();
      }
      if (key === "b" && this.game.settings.mode === "buzzer" && !this.answerRevealed) {
        event.preventDefault();
        this.resetBuzzers();
      }
    });
  }

  private teamName(teamId: string): string {
    return this.game.teams.find((team) => team.id === teamId)?.name ?? "Team";
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character] ?? character);
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }
}
