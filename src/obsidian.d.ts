import "obsidian";

declare module "obsidian" {
	interface Workspace {
		on(
			name: "rerender-sankey",
			callback: () => void
		): EventRef;
	}
}
