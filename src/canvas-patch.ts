import { ItemView, Menu, Plugin } from "obsidian";

let patchedPrototype: any;
let originalShowMenu: any;

function onCanvasMenu(menu: Menu) {
	let node = this;
	originalShowMenu.apply(this, arguments);
	this.canvas.app.workspace.trigger(
		"canvas-conversation:canvas-menu",
		node,
		menu
	);
}

export function performCanvasMonkeyPatch(plugin: Plugin) {
	const view = app.workspace.getActiveViewOfType(ItemView);
	checkCanvasMonkeyPatch(view);

	if (!patchedPrototype) {
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const view = app.workspace.getActiveViewOfType(ItemView);
				checkCanvasMonkeyPatch(view);
			})
		);
	}
}

function checkCanvasMonkeyPatch(view: ItemView | null) {
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

export function removeCanvasMonkeyPatch() {
	if (patchedPrototype) {
		patchedPrototype.showMenu = originalShowMenu;
		patchedPrototype = null;
	}
}
