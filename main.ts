import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as d3san from 'd3-sankey';
import * as d3 from 'd3';
import { parse as yamlParse } from 'yaml';
import { SankeySettingTab } from 'settings';


interface SNodeExtra {
    name: string;
    color?: string;
    value?: number;
}

interface SLinkExtra {
    source: string;
    target: string;
    value: number;
}

interface SankeySettings {
    nodeWidth: number;
    linkColor: string; // ['source', 'target', 'none']
    nodeAlign: string; // ['left', 'right', 'center', justify']
    nodePadding: number;
}

const DEFAULT_SETTINGS: Partial<SankeySettings> = {
    nodeWidth: 40,
    linkColor: 'none',
    nodeAlign: 'left',
    nodePadding: 16
};

const nodeAlign: Record<string, (node: d3san.SankeyNode<{}, {}>, n: number) => number> = {
    'left': d3san.sankeyLeft,
    'right': d3san.sankeyRight,
    'center': d3san.sankeyCenter,
    'justify': d3san.sankeyJustify
}

type SNode = d3san.SankeyNode<SNodeExtra, SLinkExtra>;
type SLink = d3san.SankeyLink<SNodeExtra, SLinkExtra>;

interface YamlData {
    links: SLink[];
    nodes: SNode[];
    options: SankeySettings;
}

interface SankeyData {
    nodes: SNode[];
    links: SLink[];
}

/**
 * Prepares and validates the nodes
 * @param data Sankey links and nodes
 */
function prepareNodes(data: SankeyData): void {
    data.nodes.forEach((node) => {
        //Verify or add node color
        verifyColorOrRandom(node);

        //Calculate node value
        let input = 0;
        let output = 0;
        data.links.forEach((link) => {
            if (link.target == node.name) {
                input += link.value;
            }
            if (link.source == node.name) {
                output += link.value;
            }
        });
        node.value = Math.max(input, output)
    });
}

/**
 * Checks wheter a string is a valid css color.
 * @param color CSS color string to verify
 * @returns The verified color or a random color
 */
function verifyColorOrRandom(node: SNode): SNode {
    if (node.color) {
        const s = new Option().style;
        s.color = node.color;

        if (s.color !== '') {
            node.color = d3.rgb(node.color).toString();
            return node;
        }
    }

    //No valid color -> Add random color
    var num = Math.round(0xffffff * Math.random());
    var r = num >> 16;
    var g = num >> 8 & 255;
    var b = num & 255;
    node.color = 'rgb(' + r + ', ' + g + ', ' + b + ')';
    return node;
}

function linkColor(link: SLink, linkColor: string): string {
    let color;
    switch (linkColor.toLowerCase()) {
        case 'source':
            color = (link.source as SNode).color!;
            break;

        case 'target':
            console.log(link.target);
            color = (link.target as SNode).color!;
            break;

        default:
            color = 'black';
            break;
    }

    return color;
}

export default class SankeyPlugin extends Plugin {
    settings: SankeySettings;

    dimensions = {
        height: 600,
        width: 900,
        margins: 10
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SankeySettingTab(this.app, this));

        this.registerMarkdownCodeBlockProcessor('sankey', (source, el, ctx) => {
            const yamlData = yamlParse(source) as YamlData;
            const sankeyData: SankeyData = { nodes: yamlData.nodes, links: yamlData.links };
            const options: SankeySettings = yamlData.options;

            // Add all nodes to sankeyData
            sankeyData.links.forEach((link) => {
                if (!sankeyData.nodes.some((node) => node.name == link.source)) {
                    sankeyData.nodes.push({ name: link.source });
                }
                if (!sankeyData.nodes.some((node) => node.name == link.target)) {
                    sankeyData.nodes.push({ name: link.target });
                }
            });

            prepareNodes(sankeyData);

            // Create Sankey generator
            const sankeyGenerator = d3san.sankey()
                .nodes(sankeyData.nodes)
                .links(sankeyData.links)
                .nodeAlign(nodeAlign[this.settings.nodeAlign])
                .nodeWidth(this.settings.nodeWidth)
                .extent([
                    [this.dimensions.margins, this.dimensions.margins],
                    [
                        this.dimensions.width - this.dimensions.margins * 2,
                        this.dimensions.height - this.dimensions.margins * 2
                    ]
                ])
                .nodeId((d) => (d as SNode).name)
                .nodePadding(this.settings.nodePadding)
                .nodeSort(null);

            sankeyGenerator(sankeyData);

            //Create SVG
            const svg = d3.create('svg')
                .attr("height", this.dimensions.height)
                .attr("width", this.dimensions.width)
                .attr("overflow", "visible")
                .style('background', 'white');

            // Add nodes
            svg.append("g")
                .selectAll("rect")
                .data(sankeyData.nodes)
                .join("rect")
                .attr("x", (d) => d.x0!)
                .attr("y", (d) => d.y0!)
                .attr("fill", (d) => d.color!)
                .attr("height", (d) => d.y1! - d.y0!)
                .attr("width", (d) => d.x1! - d.x0!);

            // Add links
            svg.append("g")
                .selectAll()
                .data(sankeyData.links)
                .join("path")
                .attr("fill", "none")
                .attr("stroke-opacity", 0.3)
                .attr("stroke", (d) => linkColor(d, this.settings.linkColor))
                .attr("d", d3san.sankeyLinkHorizontal())
                .attr("stroke-width", (d) => d.width!);

            // Add text to nodes
            svg.append("g")
                .selectAll()
                .data(sankeyData.nodes)
                .join("text")
                .attr("x", d => d.x0! < this.dimensions.width / 2 ? d.x1! + 6 : d.x0! - 6)
                .attr("y", d => (d.y1! + d.y0!) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0! < this.dimensions.width / 2 ? "start" : "end")
                .text(d => `${d.name}: ${d.value}`);

            el.appendChild(svg.node()!);
        });
    }

    onunload() { }
}
