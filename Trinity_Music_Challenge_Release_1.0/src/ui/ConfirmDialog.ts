export interface ConfirmationOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export class ConfirmDialog {
  private readonly dialog = document.querySelector<HTMLDialogElement>("#confirm-dialog");
  private readonly title = document.querySelector<HTMLElement>("#confirm-dialog-title");
  private readonly message = document.querySelector<HTMLElement>("#confirm-dialog-message");
  private readonly confirmButton = document.querySelector<HTMLButtonElement>("#confirm-dialog-confirm");
  private readonly cancelButton = document.querySelector<HTMLButtonElement>("#confirm-dialog-cancel");
  private resolveValue: ((confirmed: boolean) => void) | null = null;

  constructor() {
    this.confirmButton?.addEventListener("click", () => this.finish(true));
    this.cancelButton?.addEventListener("click", () => this.finish(false));
    this.dialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.finish(false);
    });
  }

  ask(options: ConfirmationOptions): Promise<boolean> {
    if (!this.dialog || !this.title || !this.message || !this.confirmButton || !this.cancelButton) {
      return Promise.resolve(window.confirm(options.message));
    }

    this.title.textContent = options.title;
    this.message.textContent = options.message;
    this.confirmButton.textContent = options.confirmLabel ?? "Continue";
    this.cancelButton.textContent = options.cancelLabel ?? "Cancel";

    this.dialog.showModal();
    this.cancelButton.focus();

    return new Promise<boolean>((resolve) => {
      this.resolveValue = resolve;
    });
  }

  private finish(confirmed: boolean): void {
    this.dialog?.close();
    this.resolveValue?.(confirmed);
    this.resolveValue = null;
  }
}
