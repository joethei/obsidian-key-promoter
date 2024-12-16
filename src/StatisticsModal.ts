import {Command, Modal} from "obsidian";
import KeyPromoterPlugin from "./main";

export class StatisticsModal extends Modal {

    plugin: KeyPromoterPlugin;

    constructor(plugin: KeyPromoterPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen() {
        this.modalEl.addClass("key-promoter-modal");
        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl("h1", {text: "Most used commands"});

        const mouseStatistics = contentEl.createDiv("mouse");
        mouseStatistics.createEl("h2", {text: "Mouse"});

        const mouseTable = mouseStatistics.createEl("table");
        const mouseTableHeader = mouseTable.createTHead();
        mouseTableHeader.createEl("th", {text: "Usage Count"});
        mouseTableHeader.createEl("th", {text: "Command"});
        mouseTableHeader.createEl("th", {text: "Hotkey"});
        const mouseTableContent = mouseTable.createTBody();

        const mouseMap = new Map<string, number>();
        Object.each(this.plugin.settings.mouseStatistics, (value, key) => {
            mouseMap.set(key, value);
        });

        mouseMap.forEach((value, key) => {
            const command: Command = this.plugin.app.commands.findCommand(key);
            if(!command) return;
            const tableRow = mouseTableContent.createEl("tr");
            tableRow.createEl("td", {text: String(value)});
            tableRow.createEl("td", {text: command.name});
            const hotkeys = this.plugin.getHotkeysForCommand(command);
            tableRow.createEl("td", {text: hotkeys.join()});
        });

        const keyboardStatistics = contentEl.createDiv("keyboard");

        keyboardStatistics.createEl("h2", {text: "Keyboard"});
        const keyboardTable = keyboardStatistics.createEl("table");
        const keyboardTableHeader = keyboardTable.createTHead();
        keyboardTableHeader.createEl("th", {text: "Usage count"});
        keyboardTableHeader.createEl("th", {text: "Command"});
        keyboardTableHeader.createEl("th", {text: "Hotkey"});

        const keyboardTableContent = keyboardTable.createTBody();
        const keyboardMap = new Map<string, number>();
        Object.each(this.plugin.settings.keyboardStatistics, (value, key) => {
            keyboardMap.set(key, value);
        });

        keyboardMap.forEach((value, key) => {
            const command: Command = this.plugin.app.commands.findCommand(key);
            const tableRow = keyboardTableContent.createEl("tr");
            tableRow.createEl("td", {text: String(value)});
            tableRow.createEl("td", {text: command.name});
            const hotkeys = this.plugin.getHotkeysForCommand(command);
            tableRow.createEl("td", {text: hotkeys.join()});
        });
    }
}
