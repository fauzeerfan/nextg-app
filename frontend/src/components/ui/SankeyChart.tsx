import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyNode {
  id: string;
  name: string;
  type: string;
  employees?: Array<{ nik: string; name: string; exLine?: string }>;
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
  nodeWidth = 32,
  nodePadding = 45,
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

    // 4. Kalkulasi Lebar Dinamis & Margin
    const maxLayer = Math.max(0, ...Array.from(nodeLayerMap.values()));
    const columnSpacing = 200;

    const margin = { top: 70, right: 140, bottom: 20, left: 220 };

    const dynamicWidth = margin.left + margin.right + maxLayer * columnSpacing;
    const finalWidth = Math.max(800, dynamicWidth);

    // Bersihkan SVG sebelumnya
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', finalWidth)
      .style('background', 'transparent')
      .style('font-family', "'Poppins', sans-serif");

    // --- SANKEY GENERATOR (tanpa nodeAlign) ---
    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      // .nodeAlign(alignByDate as any)   // ❌ dihapus sesuai instruksi
      .extent([[margin.left, margin.top], [dynamicWidth - margin.right, height - margin.bottom]]);

    const sankeyData = {
      nodes: nodes.map(node => ({ ...node, name: node.name })),
      links: links.map(link => ({ source: link.source, target: link.target, value: link.value })),
    };

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator(sankeyData);

    // ===== PERBAIKAN: Atur ulang posisi X node berdasarkan kolom tanggal =====
    const layers = Array.from(nodeLayerMap.values());
    const maxLayerManual = Math.max(...layers, 0);
    const columnSpacingManual = (dynamicWidth - margin.left - margin.right) / Math.max(1, maxLayerManual);

    sankeyNodes.forEach((node: any) => {
      const layer = nodeLayerMap.get(node.id) ?? 0;
      node.x0 = margin.left + layer * columnSpacingManual;
      node.x1 = node.x0 + nodeWidth;
    });

    // Perbarui layout dengan posisi node yang sudah diatur ulang
    sankeyGenerator.update(sankeyData);
    // ===== AKHIR PERBAIKAN =====

    // --- PALET WARNA MODERN, SOLID, & EYE-CATCHING ---
    const vibrantColors = [
      "#EF4444", // Solid Red
      "#10B981", // Solid Emerald
      "#3B82F6", // Solid Blue
      "#F59E0B", // Solid Amber
      "#8B5CF6", // Solid Violet
      "#EC4899", // Solid Pink
      "#14B8A6", // Solid Teal
      "#F97316", // Solid Orange
      "#06B6D4", // Solid Cyan
      "#6366F1", // Solid Indigo
      "#EAB308"  // Solid Yellow
    ];
    const colorEmployee = d3.scaleOrdinal(vibrantColors);

    // Fungsi untuk mendapatkan warna node (karyawan = warna unik, line-date = default)
    const getNodeColor = (d: any) => {
      if (d.type === 'employee') return colorEmployee(d.id);
      return '#4338CA'; // Indigo Gelap & Solid untuk Area/Line
    };

    // --- MENENTUKAN WARNA KHAS UNTUK SETIAP KARYAWAN & ALIRANNYA ---
    // Map: node id → warna khas karyawan sumber (jika berasal dari karyawan)
    const employeeColorMap = new Map<string, string>();

    // 1. Assign warna untuk setiap node employee
    sankeyNodes.forEach((n: any) => {
      if (n.type === 'employee') {
        const color = colorEmployee(n.id);
        employeeColorMap.set(n.id, color);
      }
    });

    // 2. Propagasi warna ke node line-date melalui link (iteratif)
    let changed = true;
    while (changed) {
      changed = false;
      sankeyLinks.forEach((link: any) => {
        const sourceId = link.source.id;
        const targetId = link.target.id;
        const sourceColor = employeeColorMap.get(sourceId);
        if (sourceColor && !employeeColorMap.has(targetId)) {
          employeeColorMap.set(targetId, sourceColor);
          changed = true;
        }
      });
    }

    // Fungsi untuk mendapatkan warna alur berdasarkan node sumber
    const getLinkColor = (link: any): string => {
      // Gunakan warna khas karyawan dari node sumber (jika ada)
      const sourceColor = employeeColorMap.get(link.source.id);
      if (sourceColor) return sourceColor;
      // Fallback: jika sumber tidak memiliki warna khas (misal line-date tanpa karyawan asal)
      return '#94A3B8'; // Slate-400 netral
    };

    // --- DEFS (SHADOW NATIVE SVG) ---
    const defs = svg.append('defs');

    // Shadow Native untuk Node SVG
    const dropShadow = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');

    dropShadow.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '4')
      .attr('stdDeviation', '4')
      .attr('flood-color', '#0F172A')
      .attr('flood-opacity', '0.12');

    // --- POSISI KOLOM TANGGAL ---
    const layerDates = new Map<string, number>();

    sankeyNodes.forEach((n: any) => {
      if (n.type === 'line-date') {
        const dateMatch = n.name.match(/\((.*?)\)/);
        const date = dateMatch ? dateMatch[1] : null;

        if (date) {
          if (!layerDates.has(date)) {
            layerDates.set(date, n.x0);
          }
        }
      }
    });

    // --- GAMBAR GARIS PEMISAH WAKTU (TIMELINE GRID MODERN) ---
    const gridGroup = svg.append('g').attr('class', 'grid-lines');
    Array.from(layerDates.entries()).forEach(([date, xPos]) => {
      const centerX = xPos + nodeWidth / 2;

      gridGroup.append('line')
        .attr('x1', centerX)
        .attr('x2', centerX)
        .attr('y1', margin.top - 30)
        .attr('y2', height - margin.bottom + 10)
        .attr('stroke', '#CBD5E1')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,6')
        .style('opacity', 0.6);
    });

    // --- TOOLTIP MODERN (GLASSMORPHISM/CLEAN UI) ---
    const tooltip = d3.select('body').append('div')
      .attr('class', 'sankey-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(255, 255, 255, 0.98)')
      .style('color', '#0F172A')
      .style('padding', '14px 18px')
      .style('border-radius', '12px')
      .style('font-family', "'Poppins', sans-serif")
      .style('font-size', '13px')
      .style('box-shadow', '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)')
      .style('border', '1px solid #E2E8F0')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('transform', 'translateY(-50%)')
      .style('backdrop-filter', 'blur(8px)');

    // --- MENGGAMBAR LINKS (ALIRAN) DENGAN WARNA KHAS KARYAWAN ---
    const linkGroup = svg.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', d => getLinkColor(d))          // Warna solid khas karyawan
      .attr('stroke-width', d => Math.max(3, d.width))
      .attr('stroke-opacity', 0.55)                  // Opacity cukup untuk visibilitas
      .style('transition', 'stroke-opacity 0.25s ease-in-out');

    // Efek Interaktif pada Link
    linkGroup
      .on('mouseover', function(event, d) {
        linkGroup.attr('stroke-opacity', 0.08);
        d3.select(this)
          .attr('stroke-opacity', 0.95)
          .style('cursor', 'pointer');

        const sourceName = d.source.name.replace(/\s*\(.*?\)/, '');
        const targetName = d.target.name.split(' ')[0];

        tooltip.style('visibility', 'visible')
          .html(`
            <div style="color: #64748B; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Alur Perpindahan</div>
            <div style="display: flex; align-items: center; gap: 12px; font-weight: 600;">
              <span style="display:flex; align-items:center; gap:8px;">
                <span style="display:inline-block; width:12px; height:12px; border-radius:4px; background:${getNodeColor(d.source)}"></span>
                ${sourceName}
              </span>
              <span style="color:#94A3B8;">→</span>
              <span style="display:flex; align-items:center; gap:8px;">
                <span style="display:inline-block; width:12px; height:12px; border-radius:4px; background:${getNodeColor(d.target)}"></span>
                ${targetName}
              </span>
            </div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY) + 'px')
               .style('left', (event.pageX + 20) + 'px');
      })
      .on('mouseout', function(event, d) {
        tooltip.style('visibility', 'hidden');
        linkGroup.attr('stroke-opacity', 0.55);
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
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2.5)
      .attr('rx', 6)
      .attr('filter', 'url(#node-shadow)')
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s ease')
      .on('mouseover', function(event, d) {
        linkGroup.attr('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.85 : 0.08);

        const cleanName = d.type === 'employee'
          ? d.name.replace(/\s*\(.*?\)/, '')
          : d.name.split(' ')[0];

        // Bangun HTML tambahan jika node adalah line-date dan memiliki employees
        let additionalHtml = '';
        if (d.type === 'line-date' && d.employees && d.employees.length > 0) {
          // d.employees sekarang berupa array objek { nik, name, exLine }
          const employeeList = d.employees.map((emp: any) => {
            const displayName = emp.exLine ? `${emp.name} (${emp.exLine})` : emp.name;
            return `<div style="padding: 4px 8px; background: #f1f5f9; border-radius: 8px; margin: 4px 0; font-size: 12px; font-weight: 500;">${displayName}</div>`;
          }).join('');
          additionalHtml = `
            <div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">👥 Manpower (${d.employees.length}):</div>
              <div style="max-height: 200px; overflow-y: auto;">${employeeList}</div>
            </div>
          `;
        }

        tooltip.style('visibility', 'visible')
          .html(`
            <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px; color: ${getNodeColor(d)};">${cleanName}</div>
            <div style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
              ${d.type === 'employee' ? '• Karyawan Aktif' : '• Area / Line Kerja'}
            </div>
            ${additionalHtml}
          `);
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY) + 'px')
               .style('left', (event.pageX + 20) + 'px');
      })
      .on('mouseout', function() {
        tooltip.style('visibility', 'hidden');
        linkGroup.attr('stroke-opacity', 0.55);
      });

    // --- LABEL KARYAWAN (Kiri) ---
    nodeGroup.append('text')
      .attr('x', d => d.x0 - 18)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .style('font-size', '13px')
      .style('fill', '#0F172A')
      .style('font-weight', '600')
      .text(d => {
        if (d.type === 'employee') {
          return d.name.replace(/\s*\(.*?\)/, '');
        }
        return '';
      })
      .each(function(d) {
        if (d.type !== 'employee') d3.select(this).remove();
      });

    // --- LABEL LINE SAJA (Kanan) Dengan MP ---
    const lineLabels = nodeGroup.append('text')
      .attr('x', d => d.x1 + 18)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('text-anchor', 'start')
      .each(function(d) {
        if (d.type === 'employee') d3.select(this).remove();
      });

    // Baris 1: Nama Line
    lineLabels.append('tspan')
      .attr('x', d => d.x1 + 18)
      .attr('dy', '-0.4em')
      .style('font-size', '14px')
      .style('fill', '#0F172A')
      .style('font-weight', '700')
      .text(d => d.type !== 'employee' ? d.name.split(' ')[0] : '');

    // Baris 2: Jumlah MP
    lineLabels.append('tspan')
      .attr('x', d => d.x1 + 18)
      .attr('dy', '1.6em')
      .style('font-size', '12px')
      .style('fill', '#6366F1')
      .style('font-weight', '700')
      .text(d => d.type !== 'employee' ? `${Math.round(d.value)} MP Tersedia` : '');

    // --- HEADER TANGGAL (Hanya Tanggal) ---
    const headerTexts = svg.append('g')
      .selectAll('text')
      .data(Array.from(layerDates.entries()))
      .join('text')
      .attr('x', d => d[1] + nodeWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('fill', '#1E293B');

    // Tanggal Badge Look (Text styling)
    headerTexts.append('tspan')
      .style('font-size', '15px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.5px')
      .text(d => {
        const dateObj = new Date(d[0]);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return d[0];
      });

    return () => {
      tooltip.remove();
    };
  }, [nodes, links, height, nodeWidth, nodePadding]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Memastikan font Poppins di-load jika belum terpasang secara global */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          .sankey-tooltip * {
             margin: 0;
             padding: 0;
             box-sizing: border-box;
          }
        `}
      </style>
      <svg
        ref={svgRef}
        height={height}
        style={{ overflow: 'visible', minWidth: '100%', display: 'block' }}
      />
    </div>
  );
};

export default SankeyChart;