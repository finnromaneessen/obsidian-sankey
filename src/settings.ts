import SankeyPlugin from 'src/main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export class SankeySettingTab extends PluginSettingTab {
    plugin: SankeyPlugin;

    constructor(app: App, plugin: SankeyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Link color')
            .setDesc('Color of the links')
            .addDropdown(dropDown => {
                dropDown
                    .addOptions({
                        'none': 'None',
                        'target': 'Target',
                        'source': 'Source'
                    })
                    .setValue(this.plugin.settings.linkColor)
                    .onChange(async (value) => {
                        this.plugin.settings.linkColor = value;
                        await this.plugin.saveSettings();

                        this.plugin.app.workspace.trigger('rerender-sankey');
                    });
            });

        new Setting(containerEl)
            .setName('Node width')
            .setDesc('Width of the nodes')
            .addText(text => {
                text.setValue(this.plugin.settings.nodeWidth.toString())
                    .onChange(async (value) => {
                        let n = +value;
                        if (!isNaN(n) && n > 0) {
                            this.plugin.settings.nodeWidth = n;
                            await this.plugin.saveSettings();

                            this.plugin.app.workspace.trigger('rerender-sankey');
                        }
                    })
            });

        new Setting(containerEl)
            .setName('Node alignment')
            .setDesc('Alignment method of the nodes')
            .addDropdown(dropDown => {
                dropDown
                    .addOptions({
                        'left': 'Left',
                        'right': 'Right',
                        'center': 'Center',
                        'justify': 'Justify'
                    })
                    .setValue(this.plugin.settings.nodeAlign)
                    .onChange(async (value) => {
                        this.plugin.settings.nodeAlign = value;
                        await this.plugin.saveSettings();

                        this.plugin.app.workspace.trigger('rerender-sankey');
                    });
            });

        new Setting(containerEl)
            .setName('Node padding')
            .setDesc('Padding between nodes')
            .addText(text => {
                text.setValue(this.plugin.settings.nodePadding.toString())
                    .onChange(async (value) => {
                        let n = +value;
                        if (!isNaN(n) && n > 0) {
                            this.plugin.settings.nodePadding = n;
                            await this.plugin.saveSettings();

                            this.plugin.app.workspace.trigger('rerender-sankey');
                        }
                    })
            });
    }
}