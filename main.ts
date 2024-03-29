import { Plugin, MenuItem, Notice } from "obsidian";
import { AChatGPTAPI, ChatGPTAPI } from "./src/chatgpt-api";
import {
	CanvasConversationPluginSettings,
	CanvasConversationSettingTab,
	DEFAULT_SETTINGS,
} from "./src/settings";
import {
	performCanvasMonkeyPatch,
	removeCanvasMonkeyPatch,
} from "src/canvas-patch";
import { onPromptChatGPT } from "src/actions/prompt-chatgpt";
import {
	cleanUpChatGPTMetadata,
	nodeHasMetadata,
} from "src/actions/clean-metadata";
import { ChatGPTAPIOfficial } from "src/chatgpt-api-official";

export let api: AChatGPTAPI | null = null;

export default class CanvasConversationPlugin extends Plugin {
	settings: CanvasConversationPluginSettings;

	initGPT() {
		api = null;
		if (this.settings.useOfficialAPI) {
			if (!this.settings.apiKey) {
				new Notice(`Canvas Conversation failed: No API key provided.`);
				return;
			}
			api = new ChatGPTAPIOfficial({
				apiKey: this.settings.apiKey,
			});
		} else {
			if (
				!this.settings.clearanceToken ||
				!this.settings.sessionToken ||
				!this.settings.userAgent
			) {
				new Notice(
					`Canvas Conversation failed: Fill all the settings.`
				);
				return;
			}
			api = new ChatGPTAPI({
				userAgent: this.settings.userAgent,
				clearanceToken: this.settings.clearanceToken,
				sessionToken: this.settings.sessionToken,
			});
		}
		new Notice(`Canvas Conversation initialized.`);
	}

	async onload() {
		await this.loadSettings();
		this.initGPT();

		this.addSettingTab(new CanvasConversationSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on(
				"canvas-conversation:canvas-menu",
				(node, menu) => {
					menu.addSeparator();
					menu.addItem((item: MenuItem) => {
						item.setTitle("Prompt ChatGPT")
							.setIcon("star")
							.onClick(() => onPromptChatGPT(node));
					});

					if (nodeHasMetadata(node)) {
						menu.addItem((item: MenuItem) => {
							item.setTitle("Clean up ChatGPT metadata")
								.setIcon("trash")
								.onClick(() => cleanUpChatGPTMetadata(node));
						});
					}
				}
			)
		);

		this.registerEvent(
			this.app.workspace.on(
				"canvas-conversation:canvas-selection-menu",
				(canvas, menu, nodes) => {
					if (nodes.some((node) => nodeHasMetadata(node))) {
						menu.addSeparator();
						menu.addItem((item: MenuItem) => {
							item.setTitle("Clean up ChatGPT metadata")
								.setIcon("trash")
								.onClick(() => {
									nodes.forEach((node) => {
										cleanUpChatGPTMetadata(node);
									});
								});
						});
					}
				}
			)
		);

		performCanvasMonkeyPatch(this);
	}

	onunload() {
		removeCanvasMonkeyPatch();
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

declare module "obsidian" {
	interface Workspace {
		/**
		 * Fires when a canvas node is right-clicked.
		 *
		 * This is a custom event because the official API does not support it.
		 *
		 * @param node The node that was right-clicked.
		 * @param menu The menu that will be shown.
		 */
		on(
			event: "canvas-conversation:canvas-menu",
			callback: (node: any, menu: Menu) => void
		): EventRef;

		/**
		 * Fires when a selection of canvas nodes is right-clicked.
		 *
		 * This is a custom event because the official API does not support it.
		 *
		 * @param canvas The canvas that the nodes are on.
		 * @param menu The menu that will be shown.
		 * @param nodes The nodes that were selected.
		 */
		on(
			event: "canvas-conversation:canvas-selection-menu",
			callback: (canvas: any, menu: Menu, nodes: any[]) => void
		): EventRef;
	}
}
