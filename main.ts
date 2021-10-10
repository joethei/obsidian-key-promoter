import {Hotkey, Notice, Platform, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface KeyPromoterSettings {
	showUnassigned: boolean;
	showAssigned: boolean;
}

const DEFAULT_SETTINGS: KeyPromoterSettings = {
	showUnassigned: true,
	showAssigned: true
}


export default class KeyPromoterPlugin extends Plugin {
	settings: KeyPromoterSettings;

	async onload() {
		console.log('loading plugin key promoter');
		await this.loadSettings();

		this.addSettingTab(new KeyPromoterSettingsTab(this));

		this.registerDomEvent(document, 'click', (event: MouseEvent) => {
			if(event.target == undefined) return;
			//@ts-ignore
			const label = event.target.ariaLabel;
			if(label == undefined) return;

			//@ts-ignore
			let commands = Object.entries(this.app.commands.commands);
			commands = commands.filter((command: any[] ) => {
				/*
				due to different capitalisation and different text content check for contains, not equals
				i.e. the button named 'close' executes the command 'close active pane'
				 */
				return command[1].name.toLowerCase().contains(label.toLowerCase());
			});
			commands.forEach((command) => {
				const commandName = command[1].name;
				if(command[1].hotkeys == undefined) {
					if(this.settings.showUnassigned) {
						new Notice("Hotkey for " + commandName + " is not set");
					}
					return;
				}
				if(this.settings.showAssigned) {
					command[1].hotkeys.forEach((hotkey: Hotkey) => {
						const modifiers = hotkey.modifiers.join("+").replace('Mod',  Platform.isMacOS ? 'Cmd' : 'Ctrl');
						new Notice("Hotkey for " + commandName + " is " + modifiers + " + " + hotkey.key);
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
			.setDesc('show a notification for commands that don\'t have a hotkey assigned')
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.showUnassigned)
					.onChange(async (value) => {
						this.plugin.settings.showUnassigned = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
