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
  height = 600,
  nodeWidth = 24, // Sedikit diperlebar agar lebih elegan
  nodePadding = 35, // Jarak antar node diperbesar agar tidak sesak
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // 1. Ekstrak semua tanggal unik untuk mensejajarkan node (kolom)
    const dateSet = new Set<string>();
    nodes.forEach(n => {
      if (n.type === 'line-date') {
        const match = n.name.match(/\((.*?)\)/);
        if (match && match[1]) dateSet.add(match[1]);
      }
    });
    const uniqueDates = Array.from(dateSet).sort();

    // 2. Buat Peta Layer/Kolom untuk setiap Node
    const nodeLayerMap = new Map<string, number>();
    nodes.forEach((n: any) => {
      if (n.type === 'employee') {
        nodeLayerMap.set(n.id, 0); // Karyawan selalu di kolom paling kiri (0)
      } else {
        const match = n.name.match(/\((.*?)\)/);
        const date = match ? match[1] : '';
        const idx = uniqueDates.indexOf(date);
        nodeLayerMap.set(n.id, idx >= 0 ? idx + 1 : 1);
      }
    });

    // 3. Resolve Topological Conflicts
    let resolved = false;
    let limit = 100;
    while (!resolved && limit > 0) {
      resolved = true;
      links.forEach((l: any) => {
        const sourceNode = nodes[l.source];
        const targetNode = nodes[l.target];
        if (sourceNode && targetNode) {
          const sLayer = nodeLayerMap.get(sourceNode.id) || 0;
          const tLayer = nodeLayerMap.get(targetNode.id) || 0;
          if (sLayer >= tLayer) {
            nodeLayerMap.set(targetNode.id, sLayer + 1);
            resolved = false;
          }
        }
      });
      limit--;
    }

    const alignByDate = (node: any) => {
      return nodeLayerMap.get(node.id) || 0;
    };

    // 4. Kalkulasi Lebar Dinamis & Margin
    const maxLayer = Math.max(0, ...Array.from(nodeLayerMap.values()));
    const columnSpacing = 160; 
    
    // Margin top dikembalikan normal karena header hanya berisi tanggal
    const margin = { top: 50, right: 120, bottom: 20, left: 180 };
    
    const dynamicWidth = margin.left + margin.right + (maxLayer * columnSpacing);
    const finalWidth = Math.max(800, dynamicWidth); 

    // Bersihkan SVG sebelumnya
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', finalWidth)
      .style('background', 'transparent');

    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .nodeAlign(alignByDate as any)
      .extent([[margin.left, margin.top], [dynamicWidth - margin.right, height - margin.bottom]]);

    const sankeyData = {
      nodes: nodes.map(node => ({ ...node, name: node.name })),
      links: links.map(link => ({ source: link.source, target: link.target, value: link.value })),
    };

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator(sankeyData);

    // Palet warna yang lebih modern & bervariasi
    const colorEmployee = d3.scaleOrdinal(d3.schemeCategory10);
    const getNodeColor = (d: any) => {
      if (d.type === 'employee') return colorEmployee(d.id);
      return '#10b981'; // Hijau emerald untuk line
    };

    // --- DEFS UNTUK GRADIENT ---
    const defs = svg.append('defs');
    const gradients = defs.selectAll('linearGradient')
      .data(sankeyLinks)
      .join('linearGradient')
      .attr('id', (d, i) => `gradient-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', d => d.source.x1)
      .attr('x2', d => d.target.x0);

    gradients.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d => getNodeColor(d.source));

    gradients.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d => getNodeColor(d.target));

    // --- POSISI KOLOM TANGGAL ---
    const layerDates = new Map<string, number>();
    
    sankeyNodes.forEach((n: any) => {
      if (n.type === 'line-date') {
        const dateMatch = n.name.match(/\((.*?)\)/);
        const date = dateMatch ? dateMatch[1] : null;
        
        if (date) {
          // Simpan posisi X dari node untuk dijadikan patokan Grid & Header
          if (!layerDates.has(date)) {
            layerDates.set(date, n.x0);
          }
        }
      }
    });

    // --- GAMBAR GARIS PEMISAH WAKTU (TIMELINE GRID) ---
    // Digambar sebelum flow links agar berada di belakang (background)
    const gridGroup = svg.append('g').attr('class', 'grid-lines');
    Array.from(layerDates.entries()).forEach(([date, xPos]) => {
       const centerX = xPos + nodeWidth / 2;
       
       gridGroup.append('line')
         .attr('x1', centerX)
         .attr('x2', centerX)
         .attr('y1', margin.top - 15) // Mulai tepat di bawah tanggal
         .attr('y2', height - margin.bottom + 10) // Memanjang sampai bawah area node
         .attr('stroke', '#cbd5e1') // Warna abu-abu soft elegan
         .attr('stroke-width', 1.5)
         .attr('stroke-dasharray', '6,4') // Efek putus-putus
         .style('opacity', 0.6); // Sedikit transparan
    });

    // --- TOOLTIP MODERN ---
    const tooltip = d3.select('body').append('div')
      .attr('class', 'sankey-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(255, 255, 255, 0.95)')
      .style('color', '#0f172a')
      .style('padding', '10px 14px')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('font-weight', '500')
      .style('box-shadow', '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)')
      .style('border', '1px solid #e2e8f0')
      .style('pointer-events', 'none')
      .style('z-index', '100')
      .style('backdrop-filter', 'blur(4px)');

    // --- MENGGAMBAR LINKS (ALIRAN) ---
    const linkGroup = svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d, i) => `url(#gradient-${i})`)
      .attr('stroke-width', d => Math.max(2, d.width))
      .attr('stroke-opacity', 0.4) // Opacity default
      .style('transition', 'stroke-opacity 0.2s ease'); // Animasi halus

    // Efek Interaktif pada Link
    linkGroup
      .on('mouseover', function(event, d) {
        // Redupkan semua link
        linkGroup.attr('stroke-opacity', 0.1);
        // Highlight link yang di-hover
        d3.select(this).attr('stroke-opacity', 0.9);
        
        // Buat nama source dan target bersih dari NIK/Tanggal
        const sourceName = d.source.name.replace(/\s*\(.*?\)/, '');
        const targetName = d.target.name.split(' ')[0];

        tooltip.style('visibility', 'visible')
          .html(`
            <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">Detail Perpindahan</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getNodeColor(d.source)}"></span>
              ${sourceName} 
              <span style="color:#94a3b8;">→</span>
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${getNodeColor(d.target)}"></span>
              ${targetName}
            </div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 15) + 'px')
               .style('left', (event.pageX + 15) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        // Kembalikan semua link ke opacity semula
        linkGroup.attr('stroke-opacity', 0.4);
      });

    // --- MENGGAMBAR NODES (KOTAK) ---
    const nodeGroup = svg.append('g')
      .selectAll('g')
      .data(sankeyNodes)
      .join('g');

    nodeGroup.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', '#ffffff') // Stroke putih agar terlihat clean
      .attr('stroke-width', 2)
      .attr('rx', 6) // Sudut membulat (Rounded)
      .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
      .on('mouseover', function(event, d) {
        // Highlight link yang terhubung dengan node ini
        linkGroup.attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.1);
        
        const cleanName = d.type === 'employee' 
          ? d.name.replace(/\s*\(.*?\)/, '') 
          : d.name.split(' ')[0];

        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 2px;">${cleanName}</div>
            <div style="font-size: 11px; color: #64748b;">${d.type === 'employee' ? 'Karyawan' : 'Area Kerja'}</div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 15) + 'px')
               .style('left', (event.pageX + 15) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        linkGroup.attr('stroke-opacity', 0.4); // Kembalikan opacity
      });

    // --- LABEL KARYAWAN (Kiri) Hapus NIK ---
    nodeGroup.append('text')
      .attr('x', d => d.x0 - 12)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#334155')
      .style('font-weight', '600')
      .text(d => {
        if (d.type === 'employee') {
           // Menghilangkan spasi dan string di dalam tanda kurung (NIK)
           return d.name.replace(/\s*\(.*?\)/, '');
        }
        return '';
      })
      .each(function(d) {
        if (d.type !== 'employee') d3.select(this).remove();
      });

    // --- LABEL LINE SAJA (Kanan) Dengan MP ---
    const lineLabels = nodeGroup.append('text')
      .attr('x', d => d.x1 + 10)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('text-anchor', 'start')
      .each(function(d) {
        if (d.type === 'employee') d3.select(this).remove();
      });

    // Baris 1: Nama Line (Contoh: K0WL)
    lineLabels.append('tspan')
      .attr('x', d => d.x1 + 10)
      .attr('dy', '-0.2em') // Geser sedikit ke atas
      .style('font-size', '11px')
      .style('fill', '#475569')
      .style('font-weight', '600')
      .text(d => d.type !== 'employee' ? d.name.split(' ')[0] : '');

    // Baris 2: Jumlah MP (Contoh: (10 MP))
    lineLabels.append('tspan')
      .attr('x', d => d.x1 + 10)
      .attr('dy', '1.3em') // Geser ke bawah sebagai baris baru
      .style('font-size', '10px')
      .style('fill', '#94a3b8')
      .style('font-weight', '500')
      // d.value di d3-sankey menyimpan total aliran/scan yang melewati node ini
      .text(d => d.type !== 'employee' ? `(${Math.round(d.value)} MP)` : '');

    // --- HEADER TANGGAL (Hanya Tanggal) ---
    const headerTexts = svg.append('g')
      .selectAll('text')
      .data(Array.from(layerDates.entries()))
      .join('text')
      .attr('x', d => d[1] + nodeWidth / 2) 
      .attr('y', 20) // Posisikan tanggal selalu konsisten di bagian atas
      .attr('text-anchor', 'middle') 
      .style('fill', '#64748b');

    // Tanggal (DD/MM/YYYY)
    headerTexts.append('tspan')
      .style('font-size', '13px')
      .style('font-weight', '700')
      .text(d => {
         const dateObj = new Date(d[0]);
         if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
         }
         return d[0];
      });

    return () => {
      tooltip.remove();
    };
  }, [nodes, links, height, nodeWidth, nodePadding]);

  return (
    <svg 
      ref={svgRef} 
      height={height} 
      style={{ overflow: 'visible', minWidth: '100%' }} 
    />
  );
};

export default SankeyChart;