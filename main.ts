import { Plugin, MenuItem, Notice } from "obsidian";
import { ChatGPTAPI } from "./src/chatgpt-api";
import {
	CanvasConversationPluginSettings,
	CanvasConversationSettingTab,
	DEFAULT_SETTINGS,
} from "./src/settings";
import { v4 as uuidv4 } from "uuid";
import {
	performCanvasMonkeyPatch,
	removeCanvasMonkeyPatch,
} from "src/canvas-patch";
import { ChatResponse } from "src/chatgpt-types";

let api: ChatGPTAPI;

export default class CanvasConversationPlugin extends Plugin {
	settings: CanvasConversationPluginSettings;

	initGPT() {
		if (
			!this.settings.clearanceToken ||
			!this.settings.sessionToken ||
			!this.settings.userAgent
		) {
			return;
		}
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

function onPromptChatGPT(node: any) {
	const text = node.text;
	const canvas = node.canvas;

	// Prevent prompting if the plugin is not configured
	if (!api) {
		new Notice(`Please configure the plugin.
Go to Settings > Canvas Conversation and fill the fields.`);
		return;
	}

	// Prevent prompting AI results
	if (text.includes("AI: true")) {
		new Notice(`Cannot prompt AI results.`);
		return;
	}

	let {
		textToPrompt,
		conversationId,
		parentMessageId,
		messageId,
		node: promptNode,
	} = preparePrompt(text, node);

	const newNode = createAIResponseNode(canvas, promptNode);

	// Perform the prompt
	api.sendMessage(textToPrompt, {
		conversationId,
		parentMessageId,
		messageId,
	})
		.then((response) => {
			onPromptResponse(
				promptNode,
				response,
				messageId,
				parentMessageId,
				newNode
			);
		})
		.catch((error) => {
			newNode.setText(`Erorr: ${error}`);
			canvas.requestSave();
		});
}

function preparePrompt(text: any, node: any) {
	let textToPrompt: string = text;
	let conversationId: string | undefined,
		parentMessageId: string | undefined,
		messageId = uuidv4();
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
		const conversationIdAndMessageId = lines[hasDuplicateHeader ? 1 : 0];
		const conversationIdAndMessageIdParts =
			conversationIdAndMessageId.split("|");
		conversationId = conversationIdAndMessageIdParts[0];
		parentMessageId = conversationIdAndMessageIdParts[1];
		// set the text to prompt to be everything below the ^PROMPT BELOW THIS LINE^ line
		textToPrompt = lines.slice(hasDuplicateHeader ? 3 : 2).join("\n");
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
	}

	if (!parentMessageId) parentMessageId = uuidv4();
	return { textToPrompt, conversationId, parentMessageId, messageId, node };
}

function createAIResponseNode(canvas: any, prompNode: any) {
	const node = canvas.createTextNode(
		{
			x: prompNode.x,
			y: prompNode.y + prompNode.height + 32,
		},
		{ width: prompNode.width, height: prompNode.height },
		1
	);
	node.setText(`Prompting...`);
	canvas.requestSave();
	return node;
}

function onPromptResponse(
	node: any,
	response: ChatResponse,
	messageId: string,
	parentMessageId: string | undefined,
	newNode: any
) {
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
}

declare module "obsidian" {
	interface Workspace {
		/**
		 * Fires when a canvas node is right-clicked.
		 *
		 * This is a custom event because the official API doens not support it.
		 *
		 * @param node The node that was right-clicked.
		 * @param menu The menu that will be shown.
		 */
		on(
			event: "canvas-conversation:canvas-menu",
			callback: (node: any, menu: Menu) => void
		): EventRef;
	}
}
