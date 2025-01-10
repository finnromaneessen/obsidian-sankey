# Sankey Diagrams for Obsidian

Create Sankey diagrams in Obsidian.

## Usage

To generate a Sankey diagram, create a `sankey` code block.
Sankey diagrams consist of links and nodes that can be specified using YAML.

#### Links
Links are created using a source, a target and a value.

![image](images/links.png)

#### Nodes
Nodes can be explicitly created to add a specific color to a node.
If none or not all nodes are added to the code block, the rest of the nodes will be inferred from the link targets and sources.

![image](images/nodes.png)


## Examples
#### Basic Example
A simple example using only links.


![image](images/code_block_01.png)
Results in:


![image](images/sankey_example_01.png)


#### Node colors
An example specifying the colors for nodes A and B.


![image](images/code_block_02.png)
Results in:

![image](images/sankey_example_02.png)
