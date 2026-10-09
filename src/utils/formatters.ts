import { AssetClass } from '../types/finance';

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
};

export const formatNumber = (val: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
};

export const formatPercent = (val: number): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val) || 0);

  return `${val >= 0 ? '+' : '-'}${formatted}%`;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

export const formatMonthYear = (dateStr: string): string => {
  const [year, month] = dateStr.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex]} de ${year}`;
};

export const getAssetClassLabel = (assetClass: AssetClass): string => {
  const labels: Record<AssetClass, string> = {
    renda_fixa: 'Renda Fixa & Títulos',
    acoes_br: 'Ações Brasileiras (B3)',
    fiis: 'Fundos Imobiliários (FIIs)',
    internacional: 'Investimentos Globais (ETFs/BDRs)',
    cripto: 'Criptoativos',
    reserva_emergencia: 'Reserva de Emergência',
  };
  return labels[assetClass] || assetClass;
};

export const getAssetClassShortLabel = (assetClass: AssetClass): string => {
  const labels: Record<AssetClass, string> = {
    renda_fixa: 'Renda Fixa',
    acoes_br: 'Ações B3',
    fiis: 'FIIs',
    internacional: 'Global',
    cripto: 'Cripto',
    reserva_emergencia: 'Reserva',
  };
  return labels[assetClass] || assetClass;
};

export const getRecurrenceLabel = (interval?: string): string => {
  switch (interval) {
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quinzenal (15 dias)';
    case 'monthly':
      return 'Mensal';
    case 'quarterly':
      return 'Trimestral';
    case 'yearly':
      return 'Anual';
    default:
      return 'Única';
  }
};

export const addIntervalToDate = (
  baseDateStr: string,
  interval: string,
  step: number
): string => {
  if (step === 0 || !interval || interval === 'none') return baseDateStr;
  const parts = baseDateStr.split('-');
  if (parts.length !== 3) return baseDateStr;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-based
  const d = parseInt(parts[2], 10);

  if (interval === 'weekly') {
    const nextDate = new Date(y, m, d + step * 7);
    return formatIsoDate(nextDate);
  }

  if (interval === 'biweekly') {
    const nextDate = new Date(y, m, d + step * 14);
    return formatIsoDate(nextDate);
  }

  if (interval === 'monthly') {
    const totalMonths = m + step;
    const newYear = y + Math.floor(totalMonths / 12);
    const newMonth = ((totalMonths % 12) + 12) % 12;
    const daysInMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const newDay = Math.min(d, daysInMonth);
    return `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
  }

  if (interval === 'quarterly') {
    const totalMonths = m + step * 3;
    const newYear = y + Math.floor(totalMonths / 12);
    const newMonth = ((totalMonths % 12) + 12) % 12;
    const daysInMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const newDay = Math.min(d, daysInMonth);
    return `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
  }

  if (interval === 'yearly') {
    const newYear = y + step;
    const daysInMonth = new Date(newYear, m + 1, 0).getDate();
    const newDay = Math.min(d, daysInMonth);
    return `${newYear}-${String(m + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
  }

  return baseDateStr;
};

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
