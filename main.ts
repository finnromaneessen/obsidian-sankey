import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as d3san from 'd3-sankey';
import * as d3 from 'd3';

interface Data {
    nodes: d3san.SankeyNodeMinimal<any, any>[];
    links: { source: string, target: string, value: number }[]
}

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
function mapNodeValues(data: DAG): Map<string, number> {
    let kv = new Map<string, number>;

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
        kv.set(node.name, Math.max(input, output));
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

            const staticData2: DAG = {
                nodes: [{
                    nodeId: 0,
                    name: "node0"
                }, {
                    nodeId: 1,
                    name: "node1"
                }, {
                    nodeId: 2,
                    name: "node2"
                }, {
                    nodeId: 3,
                    name: "node3"
                }, {
                    nodeId: 4,
                    name: "node4"
                }], links: [{
                    source: 0,
                    target: 4,
                    value: 1,
                }, {
                    source: 0,
                    target: 1,
                    value: 4,
                }, {
                    source: 1,
                    target: 2,
                    value: 2,
                }, {
                    source: 1,
                    target: 3,
                    value: 2,
                }, {
                    source: 4,
                    target: 3,
                    value: 1,
                }]
            };

            const rows = source.split('\n').filter((row) => row.length > 0);
            const nodeMap = new Map<string, number>;
            let nodeCnt = 0;

            rows.forEach((row) => {
                const cols = row.split(',');

                if (cols.length != 3) {
                    return;
                }

                if (!nodeMap.has(cols[0])) { nodeMap.set(cols[0], nodeCnt++); }
                if (!nodeMap.has(cols[1])) { nodeMap.set(cols[1], nodeCnt++); }

                sankeyData.links.push({ source: nodeMap.get(cols[0])!, target: nodeMap.get(cols[1])!, value: +cols[2] });

                const nodesList = sankeyData.nodes.map((n) => n.name);
                if (!nodesList.includes(cols[0])) {
                    sankeyData.nodes.push({ name: cols[0], nodeId: nodeMap.get(cols[0])! });
                }
                if (!nodesList.includes(cols[1])) {
                    sankeyData.nodes.push({ name: cols[1], nodeId: nodeMap.get(cols[0])! });
                }
            });

            const valueMap = mapNodeValues(sankeyData);

            const sankeyD = d3san.sankey()
                .nodes(sankeyData.nodes)
                .links(sankeyData.links)
                .nodeAlign(d3san.sankeyJustify)
                .nodeWidth(100)
                .extent([
                    [this.dimensions.margins, this.dimensions.margins],
                    [
                        this.dimensions.width - this.dimensions.margins * 2,
                        this.dimensions.height - this.dimensions.margins * 2
                    ]
                ]);

            sankeyD(sankeyData);

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
                .attr("fill", 'dodgerblue')
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
                .attr("stroke-width", (d) => d.width!);

            svg.append("g")
                .selectAll()
                .data(sankeyData.nodes)
                .join("text")
                .attr("x", d => d.x0! < this.dimensions.width / 2 ? d.x1! + 6 : d.x0! - 6)
                .attr("y", d => (d.y1! + d.y0!) / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", d => d.x0! < this.dimensions.width / 2 ? "start" : "end")
                .text(d => `${d.name}: ${valueMap.get(d.name)}`);

            el.appendChild(svg.node()!);
        });
    }

    onunload() {

    }

}
