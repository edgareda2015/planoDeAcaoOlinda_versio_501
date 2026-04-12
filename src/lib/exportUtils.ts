import { Action } from "@/hooks/useActions";
import { KeyAction } from "@/hooks/useKeyActions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper para formatar o status para um texto legível
const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    planning: "A Fazer",
    partial: "Pendente",
    completed: "Finalizado",
  };
  return statusMap[status] || status;
};

// Função para exportar para Excel
export const exportToExcel = (actions: Action[], fileName: string = "plano-de-acao.xlsx") => {
  const sortedActions = [...actions].sort((a, b) => 
    (a.sectors?.name || '').localeCompare(b.sectors?.name || '')
  );

  const worksheetData = sortedActions.map(action => ({
    'Área': action.sectors?.name || 'N/A',
    'Ação': action.description,
    'Como': action.how_to_do || 'N/A',
    'Data Início': action.start_date ? format(new Date(action.start_date.replace(/-/g, '/')), 'dd/MM/yyyy') : '-',
    'Data Término': action.end_date ? format(new Date(action.end_date.replace(/-/g, '/')), 'dd/MM/yyyy') : '-',
    'Responsável': action.responsible_name || 'N/A',
    'Status': formatStatus(action.status),
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Plano de Ação");

  // Ajusta a largura das colunas para melhor visualização
  const cols = [
    { wch: 20 }, // Área
    { wch: 50 }, // Ação
    { wch: 50 }, // Como
    { wch: 15 }, // Data Início
    { wch: 15 }, // Data Término
    { wch: 25 }, // Responsável
    { wch: 15 }, // Status
  ];
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, fileName);
};

// Função para exportar para PDF
export const exportToPdf = (actions: Action[], fileName: string = "plano-de-acao.pdf", sectorName?: string) => {
  const doc = new jsPDF({
    orientation: "landscape",
  });

  let title = "Plano de Ação - UNINASSAU OLINDA";
  if (sectorName) {
    title += ` - ${sectorName.toUpperCase()}`;
  }
  doc.text(title, 14, 16);

  const sortedActions = [...actions].sort((a, b) => 
    (a.sectors?.name || '').localeCompare(b.sectors?.name || '')
  );

  const tableHead = [['Área', 'Ação', 'Como', 'Início', 'Término', 'Responsável', 'Status']];
  const tableBody = sortedActions.map(action => [
    action.sectors?.name || 'N/A',
    action.description,
    action.how_to_do || 'N/A',
    action.start_date ? format(new Date(action.start_date.replace(/-/g, '/')), 'dd/MM/yy') : '-',
    action.end_date ? format(new Date(action.end_date.replace(/-/g, '/')), 'dd/MM/yy') : '-',
    action.responsible_name || 'N/A',
    formatStatus(action.status),
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 20,
    showHead: 'everyPage', // Garante que o cabeçalho se repita em todas as páginas
    didDrawPage: (data) => {
      // Adiciona o número da página no rodapé
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [21, 101, 192], // Azul UNINASSAU
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Área
      1: { cellWidth: 'auto' }, // Ação
      2: { cellWidth: 'auto' }, // Como
      3: { cellWidth: 18 }, // Início
      4: { cellWidth: 18 }, // Término
      5: { cellWidth: 30 }, // Responsável
      6: { cellWidth: 20 }, // Status
    },
  });

  doc.save(fileName);
};

// --- NOVAS FUNÇÕES ---

// Exportar Relatório Diário para PDF
export const exportDailyToPdf = (
  monthName: string,
  sectors: { id: string; name: string }[],
  rows: { [key: string]: string | number }[],
  totals: { [key: string]: string | number },
  fileName: string = "relatorio-diario.pdf"
) => {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.text(`Relatório Diário - ${monthName}`, 14, 16);

  const tableHead = [['Dia', ...sectors.map(s => s.name)]];
  const tableBody = rows.map(row => [
    row.day,
    ...sectors.map(s => row[s.id] ?? 0)
  ]);
  const tableFoot = [['Total', ...sectors.map(s => totals[s.id] ?? 0)]];

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    foot: tableFoot,
    startY: 20,
    showHead: 'everyPage',
    footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [21, 101, 192], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  doc.save(fileName);
};

// Interface para os dados do relatório mensal
interface MonthlyReportData {
  name: string;
  data: Record<string, { target: number; achieved: number }>;
  totalTarget: number;
  totalAchieved: number;
}

// Exportar Relatório Mensal para PDF
export const exportMonthlyReportToPdf = (
  reports: MonthlyReportData[],
  fileName: string = "relatorio-mensal.pdf"
) => {
  const doc = new jsPDF();
  doc.text("Relatório Mês a Mês", 14, 16);
  let startY = 25;

  reports.forEach((report, index) => {
    if (index > 0) {
      startY = (doc as any).lastAutoTable.finalY + 15;
    }
    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.text(report.name.toUpperCase(), 14, startY);

    const tableHead = [['Mês', 'Previsto', 'Realizado', 'Diferença', '%']];
    const sortedMonths = Object.keys(report.data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const tableBody = sortedMonths.map(month => {
      const { target, achieved } = report.data[month];
      const difference = achieved - target;
      const percentage = target > 0 ? ((achieved / target) * 100).toFixed(2) + '%' : '0.00%';
      const displayDate = new Date(month.replace(/-/g, '/'));
      return [format(displayDate, "MMMM", { locale: ptBR }), target, achieved, difference, percentage];
    });
    const tableFoot = [['TOTAL', report.totalTarget, report.totalAchieved, report.totalAchieved - report.totalTarget, report.totalTarget > 0 ? ((report.totalAchieved / report.totalTarget) * 100).toFixed(2) + '%' : '0.00%']];

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      foot: tableFoot,
      startY: startY + 5,
      theme: 'grid',
      headStyles: { fillColor: [21, 101, 192], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(fileName);
};

// --- NOVAS FUNÇÕES PARA AÇÕES PRINCIPAIS ---

// Exportar Ações Principais para Excel
export const exportKeyActionsToExcel = (actions: KeyAction[], fileName: string = "principais-acoes.xlsx") => {
  const sortedActions = [...actions].sort((a, b) => 
    new Date(a.action_date.replace(/-/g, '/')).getTime() - new Date(b.action_date.replace(/-/g, '/')).getTime()
  );

  const worksheetData = sortedActions.map(action => ({
    'Curso / Setor': action.course,
    'Target': action.target,
    'Data': format(new Date(action.action_date.replace(/-/g, '/')), 'dd/MM/yyyy'),
    'Leads Esperados': action.expected_leads,
    'Matrículas Esperadas': action.expected_enrollments,
    '% Verba': action.budget_percentage,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ações Principais");

  const cols = [
    { wch: 25 }, // Curso / Setor
    { wch: 50 }, // Target
    { wch: 15 }, // Data
    { wch: 20 }, // Leads Esperados
    { wch: 20 }, // Matrículas Esperadas
    { wch: 10 }, // % Verba
  ];
  worksheet['!cols'] = cols;

  XLSX.writeFile(workbook, fileName);
};

// Exportar Ações Principais para PDF
export const exportKeyActionsToPdf = (actions: KeyAction[], fileName: string = "principais-acoes.pdf") => {
  const doc = new jsPDF({
    orientation: "landscape",
  });

  doc.text("Principais Ações Comerciais - UNINASSAU OLINDA", 14, 16);

  const sortedActions = [...actions].sort((a, b) => 
    new Date(a.action_date.replace(/-/g, '/')).getTime() - new Date(b.action_date.replace(/-/g, '/')).getTime()
  );

  const tableHead = [['Curso / Setor', 'Target', 'Data', 'Leads Esp.', 'Matrículas Esp.', '% Verba']];
  const tableBody = sortedActions.map(action => [
    action.course,
    action.target,
    format(new Date(action.action_date.replace(/-/g, '/')), 'dd/MM/yy'),
    action.expected_leads,
    action.expected_enrollments,
    `${action.budget_percentage}%`,
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 20,
    showHead: 'everyPage',
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [21, 101, 192], // Azul UNINASSAU
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Curso / Setor
      1: { cellWidth: 'auto' }, // Target
      2: { cellWidth: 18 }, // Data
      3: { cellWidth: 25 }, // Leads Esp.
      4: { cellWidth: 25 }, // Matrículas Esp.
      5: { cellWidth: 20 }, // % Verba
    },
  });

  doc.save(fileName);
};