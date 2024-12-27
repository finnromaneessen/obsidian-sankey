import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as d3san from 'd3-sankey';
import * as d3 from 'd3';

interface SNodeExtra {
    nodeId: number;
    name: string;
}

interface SLinkExtra {
    source: number;
    target: number;
    value: number;
}

type SNode = d3san.SankeyNode<SNodeExtra, SLinkExtra>;
type SLink = d3san.SankeyLink<SNodeExtra, SLinkExtra>;

interface DAG {
    nodes: SNode[];
    links: SLink[];
}

//TODO More efficient solution
function mapNodeValues(data: DAG): Map<number, number> {
    let kv = new Map<number, number>;

    data.nodes.forEach((node) => {
        let input = 0;
        let output = 0;
        data.links.forEach((link) => {
            if (link.target == node.nodeId) {
                input += link.value;
            }
            if (link.source == node.nodeId) {
                output += link.value;
            }
        });
        kv.set(node.nodeId, Math.max(input, output));
    });
    return kv;
}

export default class SankeyPlugin extends Plugin {
    dimensions = {
        height: 600,
        width: 900,
        margins: 10
    }

    async onload() {
        this.registerMarkdownCodeBlockProcessor('sankey', (source, el, ctx) => {
            const sankeyData: DAG = { nodes: [], links: [] };

            const rows = source.split('\n').filter((row) => row.length > 0);
            const nodeMap = new Map<string, number>;
            let nodeCnt = 0;

            rows.forEach((row) => {
                const cols = row.split(',');

                if (cols.length != 3) {
                    return;
                }

                if (!nodeMap.has(cols[0])) {
                    nodeMap.set(cols[0], nodeCnt++);
                    sankeyData.nodes.push({ name: cols[0], nodeId: nodeMap.get(cols[0])! });
                }
                if (!nodeMap.has(cols[1])) {
                    nodeMap.set(cols[1], nodeCnt++);
                    sankeyData.nodes.push({ name: cols[1], nodeId: nodeMap.get(cols[1])! });
                }

                sankeyData.links.push({ source: nodeMap.get(cols[0])!, target: nodeMap.get(cols[1])!, value: +cols[2] });
            });

            const valueMap = mapNodeValues(sankeyData);

            const sankeyD = d3san.sankey()
                .nodes(sankeyData.nodes)
                .links(sankeyData.links)
                .nodeAlign(d3san.sankeyLeft)
                .nodeWidth(40)
                .extent([
                    [this.dimensions.margins, this.dimensions.margins],
                    [
                        this.dimensions.width - this.dimensions.margins * 2,
                        this.dimensions.height - this.dimensions.margins * 2
                    ]
                ])
                .nodePadding(16)
                .nodeSort(null);

            sankeyD(sankeyData);

            const color = d3.scaleSequential(d3.schemePuBuGn).domain(sankeyData.nodes.map((d) => d.height!));

            const svg = d3.create('svg')
                .attr("height", this.dimensions.height)
                .attr("width", this.dimensions.width)
                .attr("overflow", "visible")
                .style('background', 'white');

            const nodes = svg
                .append("g")
                .selectAll("rect")
                .data(sankeyData.nodes)
                .join("rect")
                .attr("x", (d) => d.x0!)
                .attr("y", (d) => d.y0!)
                .attr("fill", (d) => color(d.height!))
                .attr("height", (d) => d.y1! - d.y0!)
                .attr("width", (d) => d.x1! - d.x0!);

            const links = svg
                .append("g")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-opacity", 0.2)
                .selectAll("path")
                .data(sankeyData.links)
                .join("path")
                .attr("d", d3san.sankeyLinkHorizontal())
                // .attr("stroke", (d) =)
                .attr("stroke-width", (d) => d.width!);

            svg.append("g")
                .selectAll()
                .data(sankeyData.nodes)
                .join("text")
                .attr("x", d => d.x0! < this.dimensions.width / 2 ? d.x1! + 6 : d.x0! - 6)
                .attr("y", d => (d.y1! + d.y0!) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0! < this.dimensions.width / 2 ? "start" : "end")
                .text(d => `${d.name}: ${valueMap.get(nodeMap.get(d.name)!)}`);

            el.appendChild(svg.node()!);
        });
    }

    onunload() {

    }

}
