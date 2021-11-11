import {Command, Hotkey, normalizePath, Notice, Platform, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, KeyPromoterSettings, KeyPromoterSettingsTab} from "./settings";


export default class KeyPromoterPlugin extends Plugin {
	settings: KeyPromoterSettings;

	async onload() : Promise<void> {
		console.log('loading plugin key promoter');
		await this.loadSettings();

		this.addSettingTab(new KeyPromoterSettingsTab(this));

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
			if(!this.settings.showAssigned && !this.settings.showUnassigned) return;

			console.log(event);

			//@ts-ignore
			let label = event.target.ariaLabel;
			//@ts-ignore
			if(!label) label = event.target.innerText;
			if(!label) return;

			//@ts-ignore
			const offsetParent = event.target.offsetParent;

			//don't show notifications when in settings, file explorer, etc.
			if(offsetParent) {
				if(offsetParent.classList.contains("mod-settings")) return;
				if(offsetParent.classList.contains("nav-files-container")) return;
				if(offsetParent.classList.contains("markdown-preview-view")) return;
				if(offsetParent.classList.contains("CodeMirror-line")) return;
			}

			//@ts-ignore
			const path = event.target.path;
			//don't show if text nested in rss-feed
			if(path) {
				path.forEach((pathContent: Node) => {
					//@ts-ignore
					const classList = pathContent.classList;
					if(classList.contains("rss-feeds-folders")) return;
				});
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
		console.log('unloading plugin key promoter');
	}

	async loadSettings() : Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() : Promise<void> {
		await this.saveData(this.settings);
	}
}
