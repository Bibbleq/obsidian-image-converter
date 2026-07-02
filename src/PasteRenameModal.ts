// PasteRenameModal.ts
import { App, Modal, Setting } from "obsidian";

export interface PasteRenameResult {
    /** User accepted the modal with a custom name. */
    action: "save";
    filename: string;
}

export interface PasteRenameKeepResult {
    /** User clicked "Keep original name". */
    action: "keep";
}

export interface PasteRenameCancelResult {
    /** User dismissed the modal without choosing. */
    action: "cancel";
}

export type PasteRenameModalResult =
    | PasteRenameResult
    | PasteRenameKeepResult
    | PasteRenameCancelResult;

/**
 * Modal shown on paste/drop when `filenamePromptEnabled` is true.
 *
 * Displays:
 *   – destination folder (read-only preview)
 *   – filename input (pre-filled with suggestion)
 *   – output extension / format (read-only preview)
 *
 * Resolves a `PasteRenameModalResult` when closed.
 */
export class PasteRenameModal extends Modal {
    private result: PasteRenameModalResult = { action: "cancel" };
    private inputEl!: HTMLInputElement;

    constructor(
        app: App,
        private readonly destinationFolder: string,
        private readonly suggestedName: string,
        private readonly outputExtension: string,
        private readonly placeholder: string,
        private readonly resolve: (result: PasteRenameModalResult) => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText("Name this image");

        // Destination folder preview
        new Setting(contentEl)
            .setName("Destination folder")
            .setDesc(this.destinationFolder || "(vault root)")
            .setDisabled(true);

        // Output format preview
        new Setting(contentEl)
            .setName("Output format")
            .setDesc(`.${this.outputExtension}`)
            .setDisabled(true);

        // Filename input
        new Setting(contentEl)
            .setName("Filename")
            .setDesc("Enter a name without extension. Leave blank to keep the suggestion.")
            .addText(text => {
                text
                    .setPlaceholder(this.placeholder)
                    .setValue(this.suggestedName);
                this.inputEl = text.inputEl;
                this.inputEl.style.width = "100%";

                // Submit on Enter
                this.inputEl.addEventListener("keydown", (evt: KeyboardEvent) => {
                    if (evt.key === "Enter") {
                        evt.preventDefault();
                        this.handleSave();
                    }
                });
            });

        // Action buttons
        const buttonRow = contentEl.createDiv({ cls: "modal-button-container" });

        buttonRow.createEl("button", { text: "Save", cls: "mod-cta" })
            .addEventListener("click", () => this.handleSave());

        buttonRow.createEl("button", { text: "Keep original name" })
            .addEventListener("click", () => {
                this.result = { action: "keep" };
                this.close();
            });

        buttonRow.createEl("button", { text: "Cancel" })
            .addEventListener("click", () => {
                this.result = { action: "cancel" };
                this.close();
            });

        // Focus input on open
        window.setTimeout(() => this.inputEl?.focus(), 50);
    }

    private handleSave() {
        const raw = this.inputEl?.value?.trim() ?? "";
        const filename = raw.length > 0 ? raw : this.suggestedName;
        this.result = { action: "save", filename };
        this.close();
    }

    onClose() {
        this.resolve(this.result);
        this.contentEl.empty();
    }
}

/**
 * Convenience wrapper: open `PasteRenameModal` and await its result.
 */
export function openPasteRenameModal(
    app: App,
    destinationFolder: string,
    suggestedName: string,
    outputExtension: string,
    placeholder: string
): Promise<PasteRenameModalResult> {
    return new Promise<PasteRenameModalResult>(resolve => {
        new PasteRenameModal(
            app,
            destinationFolder,
            suggestedName,
            outputExtension,
            placeholder,
            resolve
        ).open();
    });
}
