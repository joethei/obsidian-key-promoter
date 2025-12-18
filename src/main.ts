import {Command, Hotkey, normalizePath, Notice, Platform, Plugin, TFile, UserEvent} from 'obsidian';
import {DEFAULT_SETTINGS, KeyPromoterSettings, KeyPromoterSettingsTab} from "./settings";
import {around, dedupe} from "monkey-around";
import {StatisticsModal} from "./StatisticsModal";

declare module "obsidian" {
    interface App {
        setting: SettingModal,
        commands: CommandManager,
        hotkeyManager: HotkeyManager,
    }
    interface SettingModal {
        open(): void;
        openTabById(id: string): HotkeySettingTab;
    }
    interface HotkeySettingTab {
        setQuery(query: string): void;
    }
    interface CommandManager {
        executeCommandById(id: string, evt?: UserEvent): boolean;
        findCommand(id: string): Command | undefined;
        commands: Record<string, Command>;
        editorCommands: Record<string, Command>;
    }
    interface CustomHotkey {
        modifiers: string[]
        key: string
    }
    interface HotkeyManager {
        customKeys: Record<string, CustomHotkey[]>;
    }
}


export default class KeyPromoterPlugin extends Plugin {
    settings: KeyPromoterSettings;
    uninstallCommand: any;

    hasParentSelector(el: HTMLElement, clazz: string): boolean {
        return Boolean(el.closest(clazz));
    }

    async onload(): Promise<void> {
        console.log('loading plugin Key Promoter ' + this.manifest.version);
        await this.loadSettings();


        this.uninstallCommand = around(this.app.commands, {
            //@ts-expect-error
            // eslint-disable-next-line @typescript-eslint/ban-types
            executeCommandById(oldMethod: Function) {
                return dedupe("key-promoter", oldMethod, function (...args: any) {
                    console.log("testing");
                    const result = oldMethod && oldMethod.apply(this, args);

                    //@ts-ignore
                    const command: Command = this.app.commands.findCommand(args[0]);
                    if(!command) {
                        return result;
                    }
                    //@ts-ignore
                    const keyPromoterPlugin: KeyPromoterPlugin = this.app.plugins.plugins["key-promoter"];

                    if (keyPromoterPlugin.settings.keyboardStatistics[command.id]) {
                        keyPromoterPlugin.settings.keyboardStatistics[command.id]++;
                    } else {
                        keyPromoterPlugin.settings.keyboardStatistics[command.id] = 1;
                    }
                    keyPromoterPlugin.saveSettings();

                    if(!keyPromoterPlugin.settings.descriptionOfActions) {
                        return result;
                    }

                    const timeout = keyPromoterPlugin.settings.notificationTimeout;
                    new Notice(command.name + " via " + this.app.plugins.plugins["key-promoter"].getHotkeysForCommand(command).join(), timeout * 1000);
                    return result;
                })
            }
        });

        this.addSettingTab(new KeyPromoterSettingsTab(this));

        this.addCommand({
            id: "statistics",
            name: "Statistics",
            callback: async () => {
                new StatisticsModal(this).open();
            }
        });

        this.addCommand({
            id: 'key-promoter',
            name: 'Export hotkeys',
            callback: async () => {
                if (this.app.vault.getAbstractFileByPath("hotkeys-export.md") instanceof TFile) {
                    new Notice("There is already a exported file, delete the hotkeys-export.md file from your vault first");
                    return;
                }
                let content = "";


                for (const command of this.getCommands()) {
                    const hotkeys = this.getHotkeysForCommand(command);

                    const singleCommand = this.settings.template
                        .replace('{{commandId}}', command.id)
                        .replace('{{commandName}}', command.name)
                        .replace('{{hotkey}}', hotkeys.join());
                    content = content.concat(singleCommand);
                }


                const file = await this.app.vault.create(normalizePath("hotkeys-export.md"), content);
                await this.app.workspace.getLeaf().openFile(file, {
                    state: {mode: 'edit'},
                })

                new Notice("Exported hotkeys");
            }
        });

        this.registerDomEvent(document, 'click', (event: MouseEvent) => {
            if (event.target == undefined) return;


            //@ts-ignore
            let label = event.target.ariaLabel;
            //@ts-ignore
            if (!label) label = event.target.innerText;
            if (!label) return;

            const ignoredSelectors = [
                ".mod-settings",
                ".nav-files-container",
                ".markdown-preview-view",
                ".markdown-source-view",
                ".cm-editor",
                ".CodeMirror-line",
                ".modal",
                ".rss-feeds-folders"
            ];

            //don't show notifications when in settings, file explorer, etc.
            for (const ignoredSelector of ignoredSelectors) {
                if (this.hasParentSelector(event.target as HTMLElement, ignoredSelector)) return;
            }

            //@ts-ignore
            let commands: Command[] = Object.values(this.app.commands.commands);
            commands = commands.filter((command: Command) => {
                /*
                due to different capitalisation and different text content check for contains, not equals
                i.e. the button named 'close' executes the command 'close active pane'
                 */
                return command.name.toLowerCase().contains(label.toLowerCase());
            });
            if (this.settings.threshold != 0 && commands.length > this.settings.threshold) {
                return;
            }

            commands.forEach((command) => {
                if (this.settings.mouseStatistics[command.id]) {
                    this.settings.mouseStatistics[command.id]++;
                } else {
                    this.settings.mouseStatistics[command.id] = 1;
                }
                this.saveSettings();

                const hotkeys = this.getHotkeysForCommand(command);
                if(hotkeys.length == 0) {
                    if (!this.settings.showUnassigned) {
                        return;
                    }
                    const notice = new Notice("", this.settings.notificationTimeout * 1000);
                    notice.messageEl.createEl('span', {text: 'Hotkey for '});
                    notice.messageEl.createEl('b', {text: command.name});
                    notice.messageEl.createEl('span', {text: ' is not set'});
                    notice.messageEl.onClickEvent(async () => {
                        this.app.setting.open();
                        const hotkeySettings = this.app.setting.openTabById('hotkeys');
                        hotkeySettings.setQuery(command.id);
                    });
                } else {
                    for (const hotkey of hotkeys) {
                        const notice = new Notice("", this.settings.notificationTimeout * 1000);
                        notice.messageEl.createEl('span', {text: 'Hotkey for '});
                        notice.messageEl.createEl('b', {text: command.name});
                        notice.messageEl.createEl('span', {text: ' is '});
                        notice.messageEl.createEl('code', {text: hotkey});
                        notice.messageEl.onClickEvent(async () => {
                            this.app.setting.open();
                            const hotkeySettings = this.app.setting.openTabById('hotkeys');
                            hotkeySettings.setQuery(command.id);
                        });
                    }

                }
            });
        });
    }

    onunload(): void {
        if (this.uninstallCommand) {
            this.uninstallCommand();
        }
        console.log('unloading plugin key promoter');
    }

    getCommands(): Set<Command> {
        const result = new Set<Command>();
        for (const command of Object.values(this.app.commands.commands)) {
            result.add(command);
        }
        for (const command of Object.values(this.app.commands.editorCommands)) {
            result.add(command);
        }
        return result;
}

    getHotkeysForCommand(command: Command): string[] {
        let hotkeys: string[] = [];
        if (this.app.hotkeyManager.customKeys[command.id]) {
            this.app.hotkeyManager.customKeys[command.id].forEach((hotkey: Hotkey) => {
                if (hotkey.modifiers) {
                    const modifiers = hotkey.modifiers.join("+").replace('Mod', Platform.isMacOS ? 'Cmd' : 'Ctrl');
                    hotkeys = hotkeys.concat(modifiers + " + " + hotkey.key);
                } else {
                    hotkeys = hotkeys.concat(hotkey.key);
                }
            })
        }else if (command.hotkeys){
            command.hotkeys.forEach((hotkey: Hotkey) => {
                if (hotkey.modifiers) {
                    const modifiers = hotkey.modifiers.join("+").replace('Mod', Platform.isMacOS ? 'Cmd' : 'Ctrl');
                    hotkeys = hotkeys.concat(modifiers + " + " + hotkey.key);
                }
            })
        }
        return hotkeys;
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (!this.settings.keyboardStatistics) {
            this.settings.keyboardStatistics = {};
        }
        if (!this.settings.mouseStatistics) {
            this.settings.mouseStatistics = {};
        }
        await this.saveSettings();
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
