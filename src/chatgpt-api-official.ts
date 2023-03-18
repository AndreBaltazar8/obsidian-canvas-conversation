import { AChatGPTAPI } from "src/chatgpt-api";
import { SendMessageOptions, ChatResponse } from "src/chatgpt-types";

export class ChatGPTAPIOfficial extends AChatGPTAPI {
	apiKey: string;
	constructor(opts: { apiKey: string }) {
		super();
		this.apiKey = opts.apiKey;
	}

	initSession(): Promise<void> {
		// not needed for official API
		return Promise.resolve();
	}
	sendMessage(
		message: string,
		opts?: SendMessageOptions | undefined
	): Promise<ChatResponse> {
		throw new Error("Method not implemented.");
	}

	getIsAuthenticated(): Promise<boolean> {
		// not needed for official API
		return Promise.resolve(true);
	}
	refreshSession(): Promise<any> {
		// not needed for official API
		return Promise.resolve();
	}
	closeSession(): Promise<void> {
		// not needed for official API
		return Promise.resolve();
	}
}
