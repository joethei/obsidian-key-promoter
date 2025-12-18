import {Command, Modal, Setting, SettingGroup} from "obsidian";
import KeyPromoterPlugin from "./main";

export class StatisticsModal extends Modal {

    plugin: KeyPromoterPlugin;

    constructor(plugin: KeyPromoterPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen(): void {
        this.modalEl.addClass("key-promoter-modal");
        const {contentEl} = this;
        contentEl.empty();

        this.setTitle("Command statistics");

        const mouseGroup = new SettingGroup(contentEl).setHeading("Mouse");

        const mouseMap = new Map<string, number>();
        Object.each(this.plugin.settings.mouseStatistics, (value, key) => {
            mouseMap.set(key, value);
        });
        const sortedMouseMap = new Map([...mouseMap.entries()].sort((a, b) => b[1] - a[1]));

        sortedMouseMap.forEach((value, key) => {
            const command: Command = this.plugin.app.commands.findCommand(key);
            if(!command) return;

            mouseGroup.addSetting(setting => {
                setting
                    .setName(command.name)
                    .setDesc(this.plugin.getHotkeysForCommand(command).join())
                    .controlEl.createSpan({text: String(value)});
                setting.addExtraButton(button => {
                    button
                        .setIcon('command')
                        .setTooltip('Assign new hotkey')
                        .onClick(() => {
                            this.close();
                            this.app.setting.open();
                            const hotkeySettings = this.app.setting.openTabById('hotkeys');
                            hotkeySettings.setQuery(command.id);
                        });
                });
                });
        });

        const keyboardGroup = new SettingGroup(contentEl).setHeading("Keyboard");

        const keyboardMap = new Map<string, number>();
        Object.each(this.plugin.settings.keyboardStatistics, (value, key) => {
            keyboardMap.set(key, value);
        });
        const sortedKeyboardMap = new Map([...keyboardMap.entries()].sort((a, b) => b[1] - a[1]));

        sortedKeyboardMap.forEach((value, key) => {
            const command: Command = this.plugin.app.commands.findCommand(key);
            if (!command) return;
            keyboardGroup.addSetting(setting => {
                setting
                    .setName(command.name)
                    .setDesc(this.plugin.getHotkeysForCommand(command).join())
                    .controlEl.createSpan({text: String(value)});
               setting.addExtraButton(button => {
                  button
                      .setIcon('command')
                      .setTooltip('Assign new hotkey')
                      .onClick(() => {
                          this.close();
                          this.app.setting.open();
                          const hotkeySettings = this.app.setting.openTabById('hotkeys');
                          hotkeySettings.setQuery(command.id);
                      });
               });
            });
        });
    }
}
