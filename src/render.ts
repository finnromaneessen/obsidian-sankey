import { MarkdownRenderChild } from "obsidian";
import SankeyPlugin, { createSankey } from 'src/main';

export class RenderSankey extends MarkdownRenderChild {
    plugin: SankeyPlugin;
    source: string;

    constructor(plugin: SankeyPlugin, containerEl: HTMLElement, source: string) {
        super(containerEl);

        this.plugin = plugin;
        this.source = source;

        this.display();
    }

    onload(): void {
        this.registerEvent(this.plugin.app.workspace.on("rerender-sankey", this.display.bind(this)));
    }

    display(): void {
        this.containerEl.empty();
        this.containerEl.appendChild(createSankey(this.source, this.plugin.settings));
    }
}