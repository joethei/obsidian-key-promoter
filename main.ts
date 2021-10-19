import {Command, Hotkey, Notice, Platform, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface KeyPromoterSettings {
	showUnassigned: boolean;
	showAssigned: boolean;
	threshold: number;
}

const DEFAULT_SETTINGS: KeyPromoterSettings = {
	showUnassigned: true,
	showAssigned: true,
	threshold: 0,
}


export default class KeyPromoterPlugin extends Plugin {
	settings: KeyPromoterSettings;

	async onload() {
		console.log('loading plugin key promoter');
		await this.loadSettings();

		this.addSettingTab(new KeyPromoterSettingsTab(this));

		this.registerDomEvent(document, 'click', (event: MouseEvent) => {
			if(event.target == undefined) return;
			//don't handle anything if there is nothing to show.
			if(!this.settings.showAssigned && !this.settings.showUnassigned) return;

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
						new Notice("Hotkey for \"" + command.name + "\" is not set");
					}
					return;
				}
				if(this.settings.showAssigned) {
					command.hotkeys.forEach((hotkey: Hotkey) => {
						const modifiers = hotkey.modifiers.join("+").replace('Mod',  Platform.isMacOS ? 'Cmd' : 'Ctrl');
						new Notice("Hotkey for \"" + command.name + "\" is \"" + modifiers + " + " + hotkey.key + "\"");
					});
				}
			});
		});
	}

	onunload() {
		console.log('unloading plugin key promoter');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class KeyPromoterSettingsTab extends PluginSettingTab {
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
	}
}
