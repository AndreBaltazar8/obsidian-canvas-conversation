import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Menu,
	MenuItem,
	ItemView,
} from "obsidian";
import { ChatGPTAPI } from "./chatgpt-api";
import { v4 as uuidv4 } from "uuid";

interface CanvasConversationPluginSettings {
	userAgent: string;
	clearanceToken: string;
	sessionToken: string;
}

const DEFAULT_SETTINGS: CanvasConversationPluginSettings = {
	userAgent: "",
	clearanceToken: "",
	sessionToken: "",
};

let api: ChatGPTAPI;
let patchedPrototype: any;
let originalShowMenu: any;
function onCanvasMenu(menu: Menu) {
	let node = this;
	originalShowMenu.apply(this, arguments);
	menu.addSeparator();
	menu.addItem((item: MenuItem) => {
		item.setTitle("Prompt ChatGPT")
			.setIcon("star")
			.onClick((evt: MouseEvent) => {
				const text = node.text;
				if (text.includes("AI: true")) {
					const noAIPrompt = node.canvas.createTextNode(
						{ x: node.x + node.width + 32, y: node.y },
						{ width: node.width, height: node.height },
						1
					);
					noAIPrompt.setText(`Cannot prompt AI results.`);
					return;
				}
				let textToPrompt: string = text;
				let conversationId: string | undefined,
					parentMessageId: string | undefined,
					messageId = uuidv4();
				let isNew = true;
				let hasDuplicateHeader = text.includes(
					"*Duplicated node for message tracking*\n"
				);
				if (hasDuplicateHeader) {
					textToPrompt = textToPrompt.replace(
						"*Duplicated node for message tracking*\n",
						""
					);
				}
				// if ^PROMPT BELOW THIS LINE^ exists, get the conversationId and messageId
				if (text.includes("^PROMPT BELOW THIS LINE^")) {
					const lines = text.split("\n");
					const conversationIdAndMessageId =
						lines[hasDuplicateHeader ? 1 : 0];
					const conversationIdAndMessageIdParts =
						conversationIdAndMessageId.split("|");
					conversationId = conversationIdAndMessageIdParts[0];
					parentMessageId = conversationIdAndMessageIdParts[1];
					// set the text to prompt to be everything below the ^PROMPT BELOW THIS LINE^ line
					textToPrompt = lines
						.slice(hasDuplicateHeader ? 3 : 2)
						.join("\n");
				}

				if (text.includes("Meta Data - DO NOT DELETE")) {
					conversationId = text.match(/Conversation-Id: (.*)/)[1];
					messageId = uuidv4();
					if (text.includes("Parent-Id: ")) {
						parentMessageId = text.match(/Parent-Id: (.*)/)[1];
					}
					const duplicatedNode = node.canvas.createTextNode(
						{ x: node.x + node.width + 32, y: node.y },
						{ width: node.width, height: node.height },
						1
					);
					duplicatedNode.setText(
						(hasDuplicateHeader
							? ""
							: "*Duplicated node for message tracking*\n") +
							node.text.replace(
								/Message-Id: (.*)/,
								`Message-Id: ${messageId}`
							)
					);
					node = duplicatedNode;
					// set text to prompt to be everything above the meta data
					textToPrompt = textToPrompt.substring(
						0,
						textToPrompt.indexOf("\n```\nMeta Data - DO NOT DELETE")
					);
					isNew = false;
				}

				if (!parentMessageId) parentMessageId = uuidv4();
				const newNode = node.canvas.createTextNode(
					{ x: node.x, y: node.y + node.height + 32 },
					{ width: node.width, height: node.height },
					1
				);
				newNode.setText(`Prompting...`);
				node.canvas.requestSave();
				api.sendMessage(textToPrompt, {
					conversationId,
					parentMessageId,
					messageId,
				})
					.then((response) => {
						if (!node.text.includes("Meta Data - DO NOT DELETE")) {
							node.setText(`${node.text}
\`\`\`
Meta Data - DO NOT DELETE
Conversation-Id: ${response.conversationId}
Message-Id: ${messageId}
Parent-Id: ${parentMessageId}
\`\`\``);
						}

						newNode.setText(
							`${response.response}
\`\`\`
Meta Data - DO NOT DELETE
Conversation-Id: ${response.conversationId}
Message-Id: ${response.messageId}
Parent-Id: ${messageId}
AI: true
\`\`\``
						);
						const newPrompt = node.canvas.createTextNode(
							{
								x: newNode.x,
								y: newNode.y + newNode.height + 32,
							},
							{ width: newNode.width, height: newNode.height },
							1
						);
						newPrompt.setText(
							`${response.conversationId}|${response.messageId}\n^PROMPT BELOW THIS LINE^\n`
						);
						node.canvas.requestSave();
					})
					.catch((error) => {
						newNode.setText(`Erorr: ${error}`);
						node.canvas.requestSave();
					});
			});
	});
	return true;
}

function checkMonkeyPatch(view: ItemView | null) {
	if (view?.getViewType() == "canvas") {
		const canvas = (view as any).canvas;
		const nodes = canvas.nodes as Map<string, any>;
		if (nodes.size > 0) {
			const node = nodes.values().next().value;
			const nodePrototype = Object.getPrototypeOf(node);
			if (nodePrototype.showMenu != onCanvasMenu) {
				patchedPrototype = nodePrototype;
				originalShowMenu = nodePrototype.showMenu;
				nodePrototype.showMenu = onCanvasMenu;
			}
		}
	}
}

export default class CanvasConversationPlugin extends Plugin {
	settings: CanvasConversationPluginSettings;

	initGPT() {
		api = new ChatGPTAPI({
			userAgent: this.settings.userAgent,
			clearanceToken: this.settings.clearanceToken,
			sessionToken: this.settings.sessionToken,
		});
	}

	async onload() {
		await this.loadSettings();
		this.initGPT();

		this.addSettingTab(new CanvasConversationSettingTab(this.app, this));

		const view = app.workspace.getActiveViewOfType(ItemView);
		checkMonkeyPatch(view);

		if (!patchedPrototype) {
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", () => {
					const view = app.workspace.getActiveViewOfType(ItemView);
					checkMonkeyPatch(view);
				})
			);
		}
	}

	onunload() {
		if (patchedPrototype) {
			patchedPrototype.showMenu = originalShowMenu;
			patchedPrototype = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initGPT();
	}
}

class CanvasConversationSettingTab extends PluginSettingTab {
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
