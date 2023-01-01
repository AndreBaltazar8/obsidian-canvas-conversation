import CanvasConversationPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export interface CanvasConversationPluginSettings {
	userAgent: string;
	clearanceToken: string;
	sessionToken: string;
}

export const DEFAULT_SETTINGS: CanvasConversationPluginSettings = {
	userAgent: "",
	clearanceToken: "",
	sessionToken: "",
};

export class CanvasConversationSettingTab extends PluginSettingTab {
	plugin: CanvasConversationPlugin;

	constructor(app: App, plugin: CanvasConversationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Settings for Canvas Conversation Plugin",
		});

		new Setting(containerEl)
			.setName("User Agent")
			.setDesc(
				"The user agent to use when making requests - Get from your browser to match clearence token"
			)
			.addText((text) =>
				text
					.setPlaceholder("User Agent")
					.setValue(this.plugin.settings.userAgent)
					.onChange(async (value) => {
						this.plugin.settings.userAgent = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Clearance Token")
			.setDesc(
				"The clearance token from your browser cookies - cf_clearance"
			)
			.addText((text) =>
				text
					.setPlaceholder("Clearance Token")
					.setValue(this.plugin.settings.clearanceToken)
					.onChange(async (value) => {
						this.plugin.settings.clearanceToken = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Session Token")
			.setDesc(
				"The session token to use when making requests - __Secure-next-auth.session-token"
			)
			.addText((text) =>
				text
					.setPlaceholder("Session Token")
					.setValue(this.plugin.settings.sessionToken)
					.onChange(async (value) => {
						this.plugin.settings.sessionToken = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("p", {
			text: "These settings can be taken from your session of ChatGPT.",
		});
		containerEl.createEl("p", {
			text: "Open your browser in the ChatGPT page, inspect the page, go to Application and then Cookies, and take the appropiete values.",
		});
		containerEl.createEl("p", {
			text: "For the user agent you can take it from any request from the Network tab in the inspector. Or run `navigator.userAgent` in the console.",
		});
		containerEl.createEl("p", {
			text: "The tokens refresh every few hours. If you get an error, try refreshing the tokens.",
		});
	}
}
