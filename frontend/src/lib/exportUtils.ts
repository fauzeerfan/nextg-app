// frontend/src/lib/exportUtils.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper: Format tanggal untuk nama file
const getTimestamp = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
};

// Format mata uang / angka
const formatNumber = (num: number) => num.toLocaleString('id-ID');

// ==================== EXPORT PDF (Enhanced) ====================
export const exportToPDF = (
  title: string,
  headers: string[],
  rows: any[][],
  summary?: any,
  filters?: { startDate?: string; endDate?: string; lineCode?: string; station?: string }
) => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

  let startY = 30;

  // Filters info
  if (filters) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    let filterText = '';
    if (filters.startDate) filterText += `Period: ${filters.startDate} to ${filters.endDate || 'now'} | `;
    if (filters.lineCode) filterText += `Line: ${filters.lineCode} | `;
    if (filters.station) filterText += `Station: ${filters.station}`;
    if (filterText) {
      doc.text(filterText, 14, startY);
      startY += 8;
    }
  }

  // Summary
  if (summary) {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let summaryText = '';
    if (summary.totalNg !== undefined) summaryText += `Total NG: ${formatNumber(summary.totalNg)} | `;
    if (summary.totalGood !== undefined) summaryText += `Total Good: ${formatNumber(summary.totalGood)} | `;
    if (summary.defectRate !== undefined) summaryText += `Defect Rate: ${summary.defectRate}% | `;
    if (summary.totalOps !== undefined) summaryText += `Total OPs: ${summary.totalOps}`;
    if (summaryText) {
      doc.text(summaryText, 14, startY);
      startY += 8;
    }
    if (summary.period) {
      doc.text(`Period: ${summary.period.start || '-'} to ${summary.period.end || '-'}`, 14, startY);
      startY += 8;
    }
  }

  // Tabel
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: startY,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { top: startY },
    alternateRowStyles: { fillColor: [240, 248, 255] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10);
    doc.text('NextG App - Production Report', 14, doc.internal.pageSize.getHeight() - 10);
  }

  // Simpan PDF
  doc.save(`${title.replace(/\s/g, '_')}_${getTimestamp()}.pdf`);
};

// ==================== EXPORT EXCEL (Enhanced) ====================
export const exportToExcel = (
  title: string,
  headers: string[],
  rows: any[][],
  summary?: any,
  filters?: { startDate?: string; endDate?: string; lineCode?: string; station?: string }
) => {
  // Siapkan data worksheet
  const wsData: any[] = [];

  // Judul dan timestamp
  wsData.push([title]);
  wsData.push([`Generated: ${new Date().toLocaleString()}`]);
  
  // Filters
  if (filters) {
    let filterLine = '';
    if (filters.startDate) filterLine += `Period: ${filters.startDate} to ${filters.endDate || 'now'}`;
    if (filters.lineCode) filterLine += ` | Line: ${filters.lineCode}`;
    if (filters.station) filterLine += ` | Station: ${filters.station}`;
    if (filterLine) wsData.push([filterLine]);
  }
  
  wsData.push([]); // baris kosong

  // Summary
  if (summary) {
    let summaryLine = '';
    if (summary.totalNg !== undefined) summaryLine += `Total NG: ${formatNumber(summary.totalNg)} | `;
    if (summary.totalGood !== undefined) summaryLine += `Total Good: ${formatNumber(summary.totalGood)} | `;
    if (summary.defectRate !== undefined) summaryLine += `Defect Rate: ${summary.defectRate}% | `;
    if (summary.totalOps !== undefined) summaryLine += `Total OPs: ${summary.totalOps}`;
    if (summaryLine) wsData.push([summaryLine]);
    if (summary.period) wsData.push([`Period: ${summary.period.start || '-'} to ${summary.period.end || '-'}`]);
    wsData.push([]);
  }

  // Header tabel
  wsData.push(headers);
  // Data
  rows.forEach(row => wsData.push(row));

  // Buat workbook dan worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Atur lebar kolom otomatis (opsional)
  const colWidths = headers.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${getTimestamp()}.xlsx`);
};

// ==================== Helper konversi data (existing, diperbaiki) ====================
export const convertNgAllToRows = (cuttingPond: any[], checkPanel: any[], qualityControl: any[]) => {
  const rows: any[][] = [];
  cuttingPond.forEach(op => {
    rows.push([op.opNumber, op.styleCode, op.lineCode, 'CUTTING_POND', op.totalNg, '-', '-']);
  });
  checkPanel.forEach(op => {
    rows.push([op.opNumber, op.styleCode, op.lineCode, 'CHECK_PANEL', op.totalNg, '-', '-']);
  });
  qualityControl.forEach(op => {
    rows.push([op.opNumber, op.styleCode, op.lineCode, 'QUALITY_CONTROL', op.totalNg, op.totalGood, '-']);
  });
  return rows;
};

export const convertLineCheckTimeToRows = (data: any[]) => {
  return data.map(item => [
    item.lineCode,
    item.opNumber,
    item.station,
    item.totalProcessed,
    new Date(item.firstEvent).toLocaleString(),
    new Date(item.lastEvent).toLocaleString(),
    item.avgCheckTimeHuman,
  ]);
};

export const convertStationPerformanceToRows = (stations: any[]) => {
  return stations.map(s => [
    s.station,
    s.totalQty,
    s.goodQty,
    s.ngQty,
    `${s.efficiency}%`,
    `${s.avgCycleTimeSec}s`,
    s.transactionCount,
  ]);
};

export const convertLinePerformanceToRows = (lines: any[]) => {
  return lines.map(l => [
    l.lineCode,
    l.totalOps,
    l.completedOps,
    l.wipOps,
    `${l.completionRate}%`,
    `${l.cpDefectRate}%`,
    `${l.qcDefectRate}%`,
    l.totalOutput,
  ]);
};

export const convertDailyProductionByDateToRows = (byDate: any[]) => {
  return byDate.map(d => [d.date, d.totalQty, d.totalBoxes]);
};