import { jsPDF } from 'jspdf';
import { formatCurrency, formatPercent, formatDate } from './formatters';

export interface PDFReportData {
  selectedMonth: string; // YYYY-MM
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  monthlySavingsRate: number;
  totalNetWorth: number;
  totalCashInAccounts: number;
  totalInvestmentValue: number;
  totalInvestmentProfit: number;
  totalInvestmentProfitPercent: number;
  categoryExpenses: {
    category: string;
    amount: number;
    percentage: number;
    color?: string;
  }[];
  cashflowHistory: {
    month: string;
    label: string;
    income: number;
    expense: number;
    balance: number;
    savingsRate?: number;
  }[];
  assetAllocation: {
    assetClass: string;
    investedValue: number;
    currentValue: number;
    profit: number;
    profitPercent?: number;
    percentage: number;
  }[];
  transactions: {
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'settled' | 'pending';
  }[];
}

const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

export function generateMonthlyPDFReport(data: PDFReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const [yearStr, monthStr] = data.selectedMonth.split('-');
  const monthName = MONTH_NAMES_PT[monthStr] || monthStr;
  const competenceTitle = `${monthName} de ${yearStr}`;
  const generationTimestamp = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper colors
  const primaryDark = [15, 23, 42]; // slate-900
  const emerald = [16, 185, 129];
  const rose = [244, 63, 94];
  const slateText = [71, 85, 105];
  const borderGray = [226, 232, 240];
  const lightBg = [248, 250, 252];

  // ==========================================
  // PAGE 1: RESUMO DO MÊS, FLUXO & CATEGORIAS
  // ==========================================

  // Header Banner Background
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 34, 'F');

  // Emerald accent top line
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Brand and Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CAPITALCONTROL', margin, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('CENTRO FINANCEIRO & GESTAO DE PATRIMONIO', margin, 18);

  // Document Title & Competence on the Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`RELATORIO MENSAL: ${competenceTitle.toUpperCase()}`, pageWidth - margin, 13, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido em: ${generationTimestamp}`, pageWidth - margin, 19, { align: 'right' });

  let currentY = 40;

  // ------------------------------------------
  // SECTION 1: INDICADORES EXECUTIVOS (KPIS)
  // ------------------------------------------
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. RESUMO EXECUTIVO DO MES', margin, currentY);

  currentY += 4;

  const kpiWidth = (contentWidth - 9) / 4;
  const kpiHeight = 19;

  // Card 1: Receitas
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(margin, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('Receitas do Mes', margin + 3, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`+ ${formatCurrency(data.monthlyIncome)}`, margin + 3, currentY + 13.5);

  // Card 2: Despesas
  const xKpi2 = margin + kpiWidth + 3;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(xKpi2, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57); // rose-800
  doc.text('Despesas do Mes', xKpi2 + 3, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`- ${formatCurrency(data.monthlyExpense)}`, xKpi2 + 3, currentY + 13.5);

  // Card 3: Saldo do Mês
  const xKpi3 = margin + (kpiWidth + 3) * 2;
  const isPositiveBalance = data.monthlyBalance >= 0;
  doc.setFillColor(isPositiveBalance ? 240 : 255, isPositiveBalance ? 253 : 241, isPositiveBalance ? 244 : 242);
  doc.setDrawColor(isPositiveBalance ? 187 : 254, isPositiveBalance ? 247 : 205, isPositiveBalance ? 208 : 211);
  doc.roundedRect(xKpi3, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(isPositiveBalance ? 22 : 159, isPositiveBalance ? 101 : 18, isPositiveBalance ? 52 : 57);
  doc.text('Saldo Liquido', xKpi3 + 3, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(isPositiveBalance ? 5 : 225, isPositiveBalance ? 150 : 29, isPositiveBalance ? 105 : 72);
  doc.text(
    `${isPositiveBalance ? '+' : ''}${formatCurrency(data.monthlyBalance)}`,
    xKpi3 + 3,
    currentY + 13.5
  );

  // Card 4: Taxa de Poupança
  const xKpi4 = margin + (kpiWidth + 3) * 3;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(xKpi4, currentY, kpiWidth, kpiHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text('Taxa de Poupanca', xKpi4 + 3, currentY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`${data.monthlySavingsRate.toFixed(1)}%`, xKpi4 + 3, currentY + 13.5);

  currentY += kpiHeight + 4;

  // Sub-bar: Patrimônio Consolidado
  const subBarHeight = 12;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, currentY, contentWidth, subBarHeight, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Patrimonio Liquido Consolidado:', margin + 4, currentY + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totalNetWorth), margin + 55, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Em Contas/Caixa:', margin + 92, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.totalCashInAccounts), margin + 120, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Investido:', margin + 152, currentY + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(data.totalInvestmentValue), margin + 167, currentY + 7.5);

  currentY += subBarHeight + 7;

  // ------------------------------------------
  // SECTION 2: DESPESAS POR CATEGORIA (GRÁFICO DE BARRAS)
  // ------------------------------------------
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DISTRIBUICAO DE DESPESAS POR CATEGORIA', margin, currentY);

  currentY += 4;

  const categoryBoxHeight = 62;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, currentY, contentWidth, categoryBoxHeight, 2, 2, 'FD');

  const topCategories = data.categoryExpenses.slice(0, 6);
  const maxExpense = Math.max(...topCategories.map(c => c.amount), 1);
  let catY = currentY + 6;

  if (topCategories.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Nenhuma despesa registrada para este mes.', margin + 8, catY + 10);
  } else {
    topCategories.forEach((cat, idx) => {
      // Category label & percentage
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
      doc.text(cat.category, margin + 4, catY + 3.5);

      // Value & percentage on the right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const valStr = `${formatCurrency(cat.amount)}  (${cat.percentage.toFixed(1)}%)`;
      doc.text(valStr, pageWidth - margin - 4, catY + 3.5, { align: 'right' });

      // Visual progress bar
      const barTrackX = margin + 65;
      const barTrackWidth = contentWidth - 118;
      const barHeight = 3.5;

      // Track background
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barTrackX, catY, barTrackWidth, barHeight, 1.5, 1.5, 'F');

      // Filled bar
      const fillWidth = Math.max(2, (cat.amount / maxExpense) * barTrackWidth);
      const barColors = [
        [16, 185, 129], // emerald
        [14, 165, 233], // sky
        [245, 158, 11], // amber
        [168, 85, 247], // purple
        [236, 72, 153], // pink
        [99, 102, 241], // indigo
      ];
      const color = barColors[idx % barColors.length];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(barTrackX, catY, fillWidth, barHeight, 1.5, 1.5, 'F');

      catY += 9;
    });
  }

  currentY += categoryBoxHeight + 7;

  // ------------------------------------------
  // SECTION 3: EVOLUCAO DO FLUXO DE CAIXA (HISTORICO)
  // ------------------------------------------
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. HISTORICO DE FLUXO DE CAIXA (ULTIMOS MESES)', margin, currentY);

  currentY += 4;

  const tableBoxHeight = 58;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, currentY, contentWidth, tableBoxHeight, 2, 2, 'FD');

  // Table header
  let flowY = currentY + 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 1, currentY + 1, contentWidth - 2, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Competencia', margin + 4, flowY);
  doc.text('Receitas (+)', margin + 38, flowY);
  doc.text('Despesas (-)', margin + 74, flowY);
  doc.text('Saldo Liquido', margin + 110, flowY);
  doc.text('Poupanca (%)', margin + 150, flowY);

  flowY += 6;
  const recentHistory = data.cashflowHistory.slice(-5);

  recentHistory.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin + 1, flowY - 3.5, contentWidth - 2, 7.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(item.label, margin + 4, flowY + 1.5);

    doc.setTextColor(5, 150, 105);
    doc.text(formatCurrency(item.income), margin + 38, flowY + 1.5);

    doc.setTextColor(225, 29, 72);
    doc.text(formatCurrency(item.expense), margin + 74, flowY + 1.5);

    const isPos = item.balance >= 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPos ? 5 : 225, isPos ? 150 : 29, isPos ? 105 : 72);
    doc.text(formatCurrency(item.balance), margin + 110, flowY + 1.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const savingsPercent = item.savingsRate ?? (item.income > 0 ? Math.max(0, ((item.income - item.expense) / item.income) * 100) : 0);
    doc.text(`${savingsPercent.toFixed(1)}%`, margin + 150, flowY + 1.5);

    flowY += 8;
  });

  // Page 1 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.text('CapitalControl · Centro de Controle Financeiro & Carteira de Investimentos', margin, pageHeight - 7);
  doc.text('Pagina 1 de 2', pageWidth - margin, pageHeight - 7, { align: 'right' });

  // ==========================================
  // PAGE 2: CARTEIRA DE INVESTIMENTOS & EXTRATO
  // ==========================================
  doc.addPage();

  // Top header bar page 2
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 0, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`CAPITALCONTROL · CARTEIRA E EXTRATO CONSOLIDADO (${competenceTitle.toUpperCase()})`, margin, 10.5);

  currentY = 24;

  // ------------------------------------------
  // SECTION 4: ALOCACAO DA CARTEIRA DE INVESTIMENTOS
  // ------------------------------------------
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. ALOCACAO PATRIMONIAL & CARTEIRA DE ATIVOS', margin, currentY);

  currentY += 4;

  const invBoxHeight = 52;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, currentY, contentWidth, invBoxHeight, 2, 2, 'FD');

  let invY = currentY + 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 1, currentY + 1, contentWidth - 2, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Classe de Ativo', margin + 4, invY);
  doc.text('Alocacao (%)', margin + 65, invY);
  doc.text('Total Aplicado', margin + 110, invY);
  doc.text('Posicao Atual', margin + 145, invY);

  invY += 6;

  if (data.assetAllocation.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Nenhum ativo de investimento cadastrado na carteira.', margin + 4, invY + 4);
  } else {
    data.assetAllocation.slice(0, 5).forEach((asset, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin + 1, invY - 3.5, contentWidth - 2, 7.5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(asset.assetClass, margin + 4, invY + 1.5);

      // Mini bar and percent
      doc.setFont('helvetica', 'normal');
      doc.text(`${asset.percentage.toFixed(1)}%`, margin + 65, invY + 1.5);

      const miniBarX = margin + 78;
      const miniBarWidth = 24;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(miniBarX, invY - 1.5, miniBarWidth, 3, 1, 1, 'F');

      const fill = Math.max(1, (asset.percentage / 100) * miniBarWidth);
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(miniBarX, invY - 1.5, fill, 3, 1, 1, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(formatCurrency(asset.investedValue), margin + 110, invY + 1.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(asset.currentValue), margin + 145, invY + 1.5);

      invY += 8;
    });
  }

  currentY += invBoxHeight + 8;

  // ------------------------------------------
  // SECTION 5: EXTRATO DAS PRINCIPAIS TRANSACOES
  // ------------------------------------------
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. EXTRATO ANALITICO DO MES (AMOSTRA DOS LANCAMENTOS)', margin, currentY);

  currentY += 4;

  const txBoxHeight = 115;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, currentY, contentWidth, txBoxHeight, 2, 2, 'FD');

  let txY = currentY + 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 1, currentY + 1, contentWidth - 2, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Data', margin + 4, txY);
  doc.text('Descricao', margin + 25, txY);
  doc.text('Categoria', margin + 90, txY);
  doc.text('Status', margin + 138, txY);
  doc.text('Valor', pageWidth - margin - 4, txY, { align: 'right' });

  txY += 6;
  const monthTransactions = data.transactions.slice(0, 13);

  if (monthTransactions.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text('Nenhuma transacao registrada para este mes.', margin + 4, txY + 4);
  } else {
    monthTransactions.forEach((tx, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin + 1, txY - 3.5, contentWidth - 2, 7.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(formatDate(tx.date), margin + 4, txY + 1.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const desc = tx.description.length > 34 ? `${tx.description.substring(0, 32)}...` : tx.description;
      doc.text(desc, margin + 25, txY + 1.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const cat = tx.category.length > 25 ? `${tx.category.substring(0, 23)}...` : tx.category;
      doc.text(cat, margin + 90, txY + 1.5);

      doc.text(tx.status === 'settled' ? 'Efetivado' : 'Pendente', margin + 138, txY + 1.5);

      const isInc = tx.type === 'income';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isInc ? 5 : 225, isInc ? 150 : 29, isInc ? 105 : 72);
      const formattedVal = `${isInc ? '+' : '-'}${formatCurrency(tx.amount)}`;
      doc.text(formattedVal, pageWidth - margin - 4, txY + 1.5, { align: 'right' });

      txY += 7.8;
    });
  }

  // Page 2 Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.text('CapitalControl · Centro de Controle Financeiro & Carteira de Investimentos', margin, pageHeight - 7);
  doc.text('Pagina 2 de 2', pageWidth - margin, pageHeight - 7, { align: 'right' });

  // Download PDF
  const filename = `Resumo_Financeiro_${yearStr}_${monthStr}.pdf`;
  doc.save(filename);
}
