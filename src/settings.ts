import {Notice, PluginSettingTab, Setting, TextAreaComponent} from "obsidian";
import KeyPromoterPlugin from "./main";

export interface KeyPromoterSettings {
    showUnassigned: boolean;
    showAssigned: boolean;
    threshold: number;
    template: string;
}

export const DEFAULT_SETTINGS: KeyPromoterSettings = {
    showUnassigned: true,
    showAssigned: true,
    threshold: 0,
    template: "{{commandId}} - {{commandName}} - {{hotkey}}",
}

export class KeyPromoterSettingsTab extends PluginSettingTab {
    plugin: KeyPromoterPlugin;

    constructor(plugin: KeyPromoterPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Key Promoter Settings'});

        new Setting(containerEl)
            .setName('Show for assigned commands')
            .setDesc('show a notification for commands that do have a hotkey assigned')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.showAssigned)
                    .onChange(async (value) => {
                        this.plugin.settings.showAssigned = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Show for unassigned commands')
            .setDesc('show a notification for commands that do not have a hotkey assigned')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.showUnassigned)
                    .onChange(async (value) => {
                        this.plugin.settings.showUnassigned = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Threshold')
            .setDesc('Only show notification if there are less than X possible commands (use 0 to disable)')
            .addText(text => {
                text
                    .setValue(String(this.plugin.settings.threshold))
                    .onChange(async (value) => {
                        if(isNaN(Number(value)) || value === undefined) {
                            new Notice("please specify a valid number");
                            return;
                        }
                        this.plugin.settings.threshold = Number(value);
                        await this.plugin.saveSettings();
                    });

            });

        new Setting(containerEl)
            .setName("Export template")
            .setDesc('When creating a note from a rss feed item this gets processed. ' +
                'Available variables are: {{commandId}}, {{commandName}}, {{hotkey}}')
            .addTextArea((textArea: TextAreaComponent) => {
                textArea
                    .setValue(this.plugin.settings.template)
                    .setPlaceholder(DEFAULT_SETTINGS.template)
                    .onChange(async (value) => {
                       this.plugin.settings.template = value;
                       await this.plugin.saveSettings();
                    });
                textArea.inputEl.setAttr("rows", 8);
            });
    }
}
