import { ItemView, Menu, Plugin } from "obsidian";

let canvasPrototype: any;
let originalCanvasOnSelectionContextMenu: any;

let canvasNodePrototype: any;
let originalCanvasNodeShowMenu: any;

function onCanvasMenu(menu: Menu) {
	let node = this;
	originalCanvasNodeShowMenu.apply(this, arguments);
	this.canvas.app.workspace.trigger(
		"canvas-conversation:canvas-menu",
		node,
		menu
	);
}

export function performCanvasMonkeyPatch(plugin: Plugin) {
	const view = app.workspace.getActiveViewOfType(ItemView);
	checkCanvasMonkeyPatch(view);

	if (!canvasNodePrototype) {
		plugin.registerEvent(
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
		if (!canvasPrototype) {
			canvasPrototype = Object.getPrototypeOf(canvas);
			originalCanvasOnSelectionContextMenu =
				canvasPrototype.onSelectionContextMenu;
			canvasPrototype.onSelectionContextMenu = function (e: MouseEvent) {
				let canvas = this;
				const originalShowAtMouseEvent =
					Menu.prototype.showAtMouseEvent;
				Menu.prototype.showAtMouseEvent = function (e: MouseEvent) {
					const menu = this;
					canvas.app.workspace.trigger(
						"canvas-conversation:canvas-selection-menu",
						this.canvas,
						menu,
						Array.from(canvas.selection.values())
					);
					originalShowAtMouseEvent.apply(this, arguments);
					Menu.prototype.showAtMouseEvent = originalShowAtMouseEvent;
					return menu;
				};
				return originalCanvasOnSelectionContextMenu.apply(
					this,
					arguments
				);
			};
		}
		const nodes = canvas.nodes as Map<string, any>;
		if (nodes.size > 0) {
			const node = nodes.values().next().value;
			const nodePrototype = Object.getPrototypeOf(node);
			if (nodePrototype.showMenu != onCanvasMenu) {
				canvasNodePrototype = nodePrototype;
				originalCanvasNodeShowMenu = nodePrototype.showMenu;
				nodePrototype.showMenu = onCanvasMenu;
			}
		}
	}
}

export function removeCanvasMonkeyPatch() {
	if (canvasPrototype) {
		canvasPrototype.onSelectionContextMenu =
			originalCanvasOnSelectionContextMenu;
		canvasPrototype = null;
	}

	if (canvasNodePrototype) {
		canvasNodePrototype.showMenu = originalCanvasNodeShowMenu;
		canvasNodePrototype = null;
	}
}
