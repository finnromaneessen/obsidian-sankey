import { parseYaml, Plugin } from 'obsidian';
import * as d3san from 'd3-sankey';
import * as d3 from 'd3';
import { SankeySettingTab } from 'src/settings';
import { RenderSankey } from './render';


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
    let num = Math.round(0xffffff * Math.random());
    let r = num >> 16;
    let g = num >> 8 & 255;
    let b = num & 255;
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
            color = (link.target as SNode).color!;
            break;

        default:
            color = 'black';
            break;
    }

    return color;
}

export function createSankey(source: string, settings: SankeySettings): SVGSVGElement {
    const yamlData = parseYaml(source) as YamlData;
    const sankeyData = parseSankeyData(yamlData);

    return generateSVG(sankeyData, settings);
}

function parseSankeyData(yamlData: YamlData): SankeyData {
    const sankeyData = { nodes: yamlData.nodes, links: yamlData.links };

    if (sankeyData.nodes == null) {
        sankeyData.nodes = [];
    }

    if (sankeyData.links == null) {
        sankeyData.links = [];
    }

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

    return sankeyData;
}

function generateSVG(data: SankeyData, settings: SankeySettings): SVGSVGElement {
    const dimensions = {
        height: 600,
        width: 900,
        margins: 10
    }

    // Create Sankey generator
    const generator = d3san.sankey()
        .nodes(data.nodes)
        .links(data.links)
        .nodeAlign(nodeAlign[settings.nodeAlign])
        .nodeWidth(settings.nodeWidth)
        .extent([
            [dimensions.margins, dimensions.margins],
            [
                dimensions.width - dimensions.margins * 2,
                dimensions.height - dimensions.margins * 2
            ]
        ])
        .nodeId((d) => (d as SNode).name)
        .nodePadding(settings.nodePadding);

    generator(data);

    //Create SVG
    const svg = d3.create('svg')
        .attr("height", dimensions.height)
        .attr("width", dimensions.width)
        .attr("overflow", "visible")
        .style('background', 'white');

    // Add nodes
    svg.append("g")
        .selectAll("rect")
        .data(data.nodes)
        .join("rect")
        .attr("x", (d) => d.x0!)
        .attr("y", (d) => d.y0!)
        .attr("fill", (d) => d.color!)
        .attr("height", (d) => d.y1! - d.y0!)
        .attr("width", (d) => d.x1! - d.x0!);

    // Add links
    svg.append("g")
        .selectAll()
        .data(data.links)
        .join("path")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.3)
        .attr("stroke", (d) => linkColor(d, settings.linkColor))
        .attr("d", d3san.sankeyLinkHorizontal())
        .attr("stroke-width", (d) => d.width!);

    // Add text to nodes
    svg.append("g")
        .selectAll()
        .data(data.nodes)
        .join("text")
        .attr("x", d => d.x0! < dimensions.width / 2 ? d.x1! + 6 : d.x0! - 6)
        .attr("y", d => (d.y1! + d.y0!) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0! < dimensions.width / 2 ? "start" : "end")
        .text(d => `${d.name}: ${d.value}`);

    return svg.node()!;
}

export default class SankeyPlugin extends Plugin {
    settings: SankeySettings;

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
            ctx.addChild(new RenderSankey(this, el, source));
        });
    }
}
