import {Command, Hotkey, normalizePath, Notice, Platform, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, KeyPromoterSettings, KeyPromoterSettingsTab} from "./settings";
import {around, dedupe} from "monkey-around";
import {StatisticsModal} from "./StatisticsModal";


export default class KeyPromoterPlugin extends Plugin {
	settings: KeyPromoterSettings;
    uninstallCommand: any;

	hasParentSelector(el: HTMLElement, clazz: string) : boolean {
		return Boolean(el.closest(clazz));
	}

	async onload() : Promise<void> {
		console.log('loading plugin key promoter');
		await this.loadSettings();

		if(this.settings.descriptionOfActions) {
			//@ts-ignore
			this.uninstallCommand = around(this.app.commands,{
				executeCommandById(oldMethod: Function) {
					return dedupe("key-promoter", oldMethod, function(...args: any) {
						const result = oldMethod && oldMethod.apply(this, args);

						//@ts-ignore
						const command: Command = this.app.commands.findCommand(args[0]);
						//@ts-ignore
						const keyPromoterPlugin: KeyPromoterPlugin = this.app.plugins.plugins["key-promoter"];

						if(keyPromoterPlugin.settings.keyboardStatistics[command.id]) {
							keyPromoterPlugin.settings.keyboardStatistics[command.id]++;
						}else {
							keyPromoterPlugin.settings.keyboardStatistics[command.id] = 1;
						}
						keyPromoterPlugin.saveSettings();

						const hotkeys: string[] = [];
						command.hotkeys.forEach((hotkey: Hotkey) => {
							let hotkeyDescription = "";
							hotkeyDescription += hotkey.modifiers.map(modifier => {
								if(modifier === "Mod") {
									return "Ctrl/Cmd";
								}
								if(modifier === "Meta") {
									return "Win/Cmd";
								}
								return modifier;
							}).join("+");
							hotkeyDescription += "+" + hotkey.key;
							hotkeys.push(hotkeyDescription);
						});

						const timeout = keyPromoterPlugin.settings.notificationTimeout;
						new Notice(command.name + " via " + hotkeys.join(), timeout  * 1000);
						return result;
					})
				}
			});
		}


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
			name: 'Export Hotkeys',
			callback: async () => {
				if(this.app.vault.getAbstractFileByPath("hotkeys-export.md")) {
					new Notice("there is already a exported file");
					return;
				}

				//@ts-ignore
				const commands: Command[] = Object.values(this.app.commands.commands);
				let content = "";
				commands.forEach((command: Command) => {
					let hotkeys = "";
					if(!command.hotkeys && !this.settings.showUnassigned) {
						return;
					}
					if(command.hotkeys && !this.settings.showAssigned) {
						return;
					}


					if(command.hotkeys) {
						command.hotkeys.forEach((hotkey: Hotkey) => {
							if(hotkey.modifiers) {
								const modifiers = hotkey.modifiers.join("+").replace('Mod',  Platform.isMacOS ? 'Cmd' : 'Ctrl');
								hotkeys = hotkeys.concat(modifiers + " + " + hotkey.key);
							}else {
								hotkeys = hotkeys.concat(hotkey.key);
							}
						});
					}
					if(hotkeys.length == 0) {
						if(!this.settings.showUnassigned) {
							return;
						}
						hotkeys = "No hotkey defined";
					}

					const singleCommand = this.settings.template
						.replace('{{commandId}}', command.id)
						.replace('{{commandName}}', command.name)
						.replace('{{hotkey}}', hotkeys);
					content = content.concat(singleCommand);
				});

				const file = await this.app.vault.create(normalizePath("hotkeys-export.md"), content);
				await this.app.workspace.activeLeaf.openFile(file, {
					state: {mode: 'edit'},
				})

				new Notice("exported hotkeys");
			}
		});

		this.registerDomEvent(document, 'click', (event: MouseEvent) => {
			if(event.target == undefined) return;
			//don't handle anything if there is nothing to show.
			//if(!this.settings.showAssigned && !this.settings.showUnassigned) return;


			//@ts-ignore
			let label = event.target.ariaLabel;
			//@ts-ignore
			if(!label) label = event.target.innerText;
			if(!label) return;

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
			for (let ignoredSelector of ignoredSelectors) {
				if(this.hasParentSelector(event.target as HTMLElement, ignoredSelector)) return;
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
			if(this.settings.threshold != 0 && commands.length > this.settings.threshold) {
				new Notice("there are to many hotkeys that could fit the action named \"" + label +  "\"");
				return;
			}

			commands.forEach((command) => {
				if(this.settings.mouseStatistics[command.id]) {
					this.settings.mouseStatistics[command.id]++;
				}else {
					this.settings.mouseStatistics[command.id] = 1;
				}
				this.saveSettings();

				if(command.hotkeys == undefined) {
					if(this.settings.showUnassigned) {
						new Notice("Hotkey for \"" + command.name + "\" is not set", this.settings.notificationTimeout * 1000);
					}
					return;
				}
				if(this.settings.showAssigned) {
					command.hotkeys.forEach((hotkey: Hotkey) => {
						const modifiers = hotkey.modifiers.join("+").replace('Mod',  Platform.isMacOS ? 'Cmd' : 'Ctrl');
						new Notice("Hotkey for \"" + command.name + "\" is \"" + modifiers + " + " + hotkey.key + "\"", this.settings.notificationTimeout * 1000);
					});
				}
			});
		});
	}

	onunload() : void {
		if(this.uninstallCommand) {
			this.uninstallCommand();
		}
		console.log('unloading plugin key promoter');
	}

	async loadSettings() : Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		if(!this.settings.keyboardStatistics) {
			this.settings.keyboardStatistics = {};
		}
		if(!this.settings.mouseStatistics) {
			this.settings.mouseStatistics = {};
		}
		await this.saveSettings();
	}

	async saveSettings() : Promise<void> {
		await this.saveData(this.settings);
	}
}
