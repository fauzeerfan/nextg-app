import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyNode {
  id: string;
  name: string;
  type: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
}

const SankeyChart: React.FC<SankeyChartProps> = ({
  nodes,
  links,
  width = 900,
  height = 600,
  nodeWidth = 20,
  nodePadding = 30,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Bersihkan SVG sebelumnya
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', 'transparent');

    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([[10, 10], [width - 10, height - 10]]);

    // Format data untuk sankey
    const sankeyData = {
      nodes: nodes.map(node => ({ ...node, name: node.name })),
      links: links.map(link => ({ source: link.source, target: link.target, value: link.value })),
    };

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator(sankeyData);

    // Warna berdasarkan tipe node
    const color = d3.scaleOrdinal<string>()
      .domain(['employee', 'line', 'station'])
      .range(['#3b82f6', '#10b981', '#f59e0b']);

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'sankey-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '6px 10px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '100');

    // Draw links
    svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('stroke-opacity', 0.5)
      .on('mouseover', function(event, d) {
        tooltip.style('visibility', 'visible')
          .html(`Flow: ${d.value} movements`);
        d3.select(this).attr('stroke', '#f59e0b').attr('stroke-opacity', 0.8);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#94a3b8').attr('stroke-opacity', 0.5);
      });

    // Draw nodes
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(sankeyNodes)
      .join('g');

    nodeGroup.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => color(d.type))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .on('mouseover', function(event, d) {
        tooltip.style('visibility', 'visible')
          .html(`${d.name}<br/>Type: ${d.type}`);
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        d3.select(this).attr('stroke', '#1e293b').attr('stroke-width', 1);
      });

    // Label untuk node employee di kiri (x < nodeWidth + 10)
    nodeGroup.append('text')
      .attr('x', d => d.x0 - 8)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', '#0f172a')
      .style('font-weight', d => d.type === 'employee' ? 'bold' : 'normal')
      .text(d => d.type === 'employee' ? d.name : '')
      .each(function(d) {
        if (d.type !== 'employee') d3.select(this).remove();
      });

    // Label untuk node line dan station di dalam atau di kanan
    nodeGroup.append('text')
      .attr('x', d => d.x1 + 6)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .style('font-size', '11px')
      .style('fill', '#334155')
      .text(d => d.type !== 'employee' ? d.name : '')
      .each(function(d) {
        if (d.type === 'employee') d3.select(this).remove();
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [nodes, links, width, height, nodeWidth, nodePadding]);

  return <svg ref={svgRef} width="100%" height={height} style={{ overflow: 'visible' }} />;
};

export default SankeyChart;