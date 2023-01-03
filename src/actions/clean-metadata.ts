export function nodeHasMetadata(node: any) {
	return (
		node.text.includes("Meta Data - DO NOT DELETE") ||
		node.text.includes("^PROMPT BELOW THIS LINE^") ||
		node.text.includes("*Duplicated node for message tracking*")
	);
}

export function cleanUpChatGPTMetadata(node: any) {
	if (node.text.includes("Meta Data - DO NOT DELETE")) {
		const index = node.text.indexOf("\n```\nMeta Data - DO NOT DELETE");
		node.setText(
			node.text.substring(index, node.text.indexOf("```\n", index + 10))
		);
	}

	if (node.text.includes("*Duplicated node for message tracking*")) {
		node.setText(
			node.text.replace(/\*Duplicated node for message tracking\*\n/, "")
		);
	}

	if (node.text.includes("^PROMPT BELOW THIS LINE^")) {
		node.setText(
			node.text.substring(
				node.text.indexOf("^PROMPT BELOW THIS LINE^") + 25
			)
		);
	}
}
