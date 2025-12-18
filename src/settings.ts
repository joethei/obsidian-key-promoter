import {Notice, PluginSettingTab, SettingGroup, TextAreaComponent} from "obsidian";
import KeyPromoterPlugin from "./main";


export interface KeyPromoterSettings {
    showUnassigned: boolean;
    showAssigned: boolean;
    threshold: number;
    template: string;
    notificationTimeout: number;
    descriptionOfActions: boolean;
    mouseStatistics: {[index: string]: number},
    keyboardStatistics: {[index: string]: number}
}

export const DEFAULT_SETTINGS: KeyPromoterSettings = {
    showUnassigned: true,
    showAssigned: true,
    threshold: 0,
    notificationTimeout: 5,
    template: "`{{commandId}}` - {{commandName}} - `{{hotkey}}`\n",
    descriptionOfActions: false,
    mouseStatistics: {},
    keyboardStatistics: {},
}

export class KeyPromoterSettingsTab extends PluginSettingTab {
    plugin: KeyPromoterPlugin;
    icon = 'keyboard';

    constructor(plugin: KeyPromoterPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new SettingGroup(containerEl)
            .addSetting(setting => {
                setting
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
            })
            .addSetting(setting => {
                setting
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
            })
            .addSetting(setting => {
                setting
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
            })
            .addSetting(setting => {
                setting
                    .setName('Description of actions')
                    .setDesc("Show name and Win/Mac shortcuts of any command you invoke")
                    .addToggle(toggle => {
                        toggle
                            .setValue(this.plugin.settings.descriptionOfActions)
                            .onChange(async (value) => {
                                this.plugin.settings.descriptionOfActions = value;
                                await this.plugin.saveSettings();
                            });
                    });
            })
            .addSetting(setting => {
                setting
                .setName('Notification timeout')
                        .setDesc('show notifications for x seconds')
                        .addText(text => {
                            text
                                .setValue(String(this.plugin.settings.notificationTimeout))
                                .onChange(async (value) => {
                                    if(isNaN(Number(value)) || value === undefined) {
                                        new Notice("please specify a valid number");
                                        return;
                                    }
                                    this.plugin.settings.notificationTimeout = Number(value);
                                    await this.plugin.saveSettings();
                                });

                        }).addExtraButton(button => {
                            button
                                .setIcon("rotate-ccw")
                                .setTooltip("Reset to default")
                                .onClick(async () => {
                                    this.plugin.settings.notificationTimeout = DEFAULT_SETTINGS.notificationTimeout;
                                    await this.plugin.saveSettings();
                                    this.display();
                                });
                        });
            })
            .addSetting(setting => {
                setting
                    .setName("Export template")
                    .setDesc('Available variables are: {{commandId}}, {{commandName}}, {{hotkey}}')
                    .addTextArea((textArea: TextAreaComponent) => {
                        textArea
                            .setValue(this.plugin.settings.template)
                            .setPlaceholder(DEFAULT_SETTINGS.template)
                            .onChange(async (value) => {
                                this.plugin.settings.template = value;
                                await this.plugin.saveSettings();
                            });
                        textArea.inputEl.setAttr("rows", 8);
                        textArea.inputEl.setAttr("cols", 50);
                    }).addExtraButton(button => {
                    button
                        .setIcon("rotate-ccw")
                        .setTooltip("Reset to default")
                        .onClick(async () => {
                            this.plugin.settings.template = DEFAULT_SETTINGS.template;
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            });
    }
}
