/**
 * Utilitários para cálculos de Renda Fixa e CDI
 * CDI de referência padrão de mercado (10.65% a.a. / Selic meta 10.75% a.a.)
 */

export const CURRENT_CDI_ANNUAL_DEFAULT = 10.65; // % a.a.

/**
 * Converte string 'YYYY-MM-DD' em Date local seguro (ao meio-dia),
 * evitando bugs de fuso horário UTC (ex: UTC-3 Brasil) onde a data retrocede 1 dia.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Retorna a data efetiva de apuração do CDI considerando a regra de mercado brasileiro (B3/CETIP):
 * - O rendimento diário de ativos pós-fixados (CDB 100%, 120%, 140% CDI) é apurado e creditado
 *   em dias úteis às 11:00 (11h).
 * - Se hoje for dia útil:
 *   - A partir das 11:00: o rendimento de hoje já está apurado e incorporado ao saldo.
 *   - Antes das 11:00: o rendimento oficial acumulado reflete até o dia útil anterior às 11h.
 * - Em fins de semana (sábado/domingo): o rendimento reflete a sexta-feira anterior às 11h.
 */
export function getEffectiveCdiAccrualDate(now: Date = new Date()): string {
  const d = new Date(now);
  const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
  const hours = d.getHours();

  if (dayOfWeek === 6) {
    // Sábado -> recua para sexta-feira
    d.setDate(d.getDate() - 1);
  } else if (dayOfWeek === 0) {
    // Domingo -> recua para sexta-feira
    d.setDate(d.getDate() - 2);
  } else if (dayOfWeek === 1 && hours < 11) {
    // Segunda-feira antes das 11h -> recua para sexta-feira anterior
    d.setDate(d.getDate() - 3);
  } else if (hours < 11) {
    // Terça a Sexta antes das 11h -> apuração oficial fechada até ontem
    d.setDate(d.getDate() - 1);
  }
  // Se for dia útil (seg-sex) após 11:00 -> 'd' é a data de hoje!

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Informações detalhadas do status do cronograma de atualização das 11h do CDI
 */
export function getCdiAccrualScheduleInfo(now: Date = new Date()): {
  lastAccrualText: string;
  nextAccrualText: string;
  isUpdatedToday: boolean;
  effectiveDate: string;
  dailyRatePercent: number;
} {
  const dayOfWeek = now.getDay();
  const hours = now.getHours();
  const effectiveDate = getEffectiveCdiAccrualDate(now);

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isUpdatedToday = !isWeekend && hours >= 11;

  let lastAccrualText = '';
  let nextAccrualText = '';

  if (isUpdatedToday) {
    lastAccrualText = 'Hoje às 11:00 (B3/CETIP)';
    nextAccrualText = dayOfWeek === 5 ? 'Segunda-feira às 11:00' : 'Amanhã às 11:00';
  } else if (isWeekend) {
    lastAccrualText = 'Sexta-feira às 11:00';
    nextAccrualText = 'Segunda-feira às 11:00';
  } else if (dayOfWeek === 1 && hours < 11) {
    lastAccrualText = 'Sexta-feira às 11:00';
    nextAccrualText = 'Hoje às 11:00';
  } else {
    lastAccrualText = 'Ontem às 11:00';
    nextAccrualText = 'Hoje às 11:00';
  }

  // Taxa diária de referência para 100% do CDI
  const dailyRatePercent = (Math.pow(1 + CURRENT_CDI_ANNUAL_DEFAULT / 100, 1 / 252) - 1) * 100;

  return {
    lastAccrualText,
    nextAccrualText,
    isUpdatedToday,
    effectiveDate,
    dailyRatePercent,
  };
}

/**
 * Converte taxa anual CDI em taxa diária considerando 252 dias úteis
 * CDI_diario = (1 + (CDI_anual * percentualCDI / 100))^(1/252) - 1
 */
export function calculateDailyCdiRate(
  cdiAnnualPercent: number = CURRENT_CDI_ANNUAL_DEFAULT,
  multiplierPercent: number = 100
): number {
  const effectiveAnnualRate = (cdiAnnualPercent / 100) * (multiplierPercent / 100);
  return Math.pow(1 + effectiveAnnualRate, 1 / 252) - 1;
}

/**
 * Calcula quantidade exata de dias úteis entre duas datas (convenção bancária 252 dias úteis)
 */
export function estimateBusinessDays(startDateStr: string, endDateStr: string): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);
  cur.setDate(cur.getDate() + 1);

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

/**
 * Calcula quantidade total de dias corridos entre duas datas
 */
export function calculateCalendarDays(startDateStr: string, endDateStr: string): number {
  const start = parseLocalDate(startDateStr);
  const end = parseLocalDate(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Alíquota regressiva do Imposto de Renda sobre Renda Fixa no Brasil:
 * - Até 180 dias: 22,5%
 * - De 181 a 360 dias: 20%
 * - De 361 a 720 dias: 17,5%
 * - Acima de 720 dias: 15%
 */
export function getFixedIncomeIrRate(calendarDays: number): number {
  if (calendarDays <= 180) return 0.225;
  if (calendarDays <= 360) return 0.20;
  if (calendarDays <= 720) return 0.175;
  return 0.15;
}

/**
 * Simula o rendimento acumulado de uma aplicação pós-fixada atrelada ao CDI
 */
export function calculateCdiAccruedValue(params: {
  principal: number;
  multiplierPercent: number; // Ex: 100, 110, 120, 140
  startDateStr: string;
  targetDateStr?: string;
  cdiAnnualPercent?: number; // Ex: 10.65
}): {
  businessDays: number;
  calendarDays: number;
  grossAmount: number;
  grossYield: number;
  grossYieldPercent: number;
  irRate: number;
  irAmount: number;
  netAmount: number;
  netYield: number;
  effectiveAnnualRate: number; // Taxa anual equivalente do título
  monthlyGrossRate: number;
} {
  const {
    principal,
    multiplierPercent,
    startDateStr,
    targetDateStr = getEffectiveCdiAccrualDate(),
    cdiAnnualPercent = CURRENT_CDI_ANNUAL_DEFAULT,
  } = params;

  if (principal <= 0) {
    return {
      businessDays: 0,
      calendarDays: 0,
      grossAmount: 0,
      grossYield: 0,
      grossYieldPercent: 0,
      irRate: 0.225,
      irAmount: 0,
      netAmount: 0,
      netYield: 0,
      effectiveAnnualRate: 0,
      monthlyGrossRate: 0,
    };
  }

  const businessDays = estimateBusinessDays(startDateStr, targetDateStr);
  const calendarDays = calculateCalendarDays(startDateStr, targetDateStr);

  const effectiveAnnualRate = (cdiAnnualPercent * multiplierPercent) / 100;
  // Taxa diária considerando 252 dias úteis
  const dailyRate = Math.pow(1 + effectiveAnnualRate / 100, 1 / 252) - 1;
  // Taxa mensal equivalente aproximada
  const monthlyGrossRate = (Math.pow(1 + effectiveAnnualRate / 100, 1 / 12) - 1) * 100;

  // Fator acumulado nos dias úteis decorridos
  const accumulatedFactor = Math.pow(1 + dailyRate, businessDays);
  const grossAmount = principal * accumulatedFactor;
  const grossYield = Math.max(0, grossAmount - principal);
  const grossYieldPercent = principal > 0 ? (grossYield / principal) * 100 : 0;

  const irRate = getFixedIncomeIrRate(calendarDays);
  const irAmount = grossYield * irRate;
  const netAmount = grossAmount - irAmount;
  const netYield = grossYield - irAmount;

  return {
    businessDays,
    calendarDays,
    grossAmount: Math.round(grossAmount * 100) / 100,
    grossYield: Math.round(grossYield * 100) / 100,
    grossYieldPercent,
    irRate,
    irAmount: Math.round(irAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    effectiveAnnualRate,
    monthlyGrossRate,
  };
}

/**
 * Retorna texto descritivo amigável da rentabilidade do ativo
 */
export function formatBenchmarkDescription(asset: {
  benchmarkType?: string;
  benchmarkRate?: number;
  additionalRate?: number;
  liquidity?: string;
}): string {
  if (!asset.benchmarkType) return '';

  const benchmark = asset.benchmarkType;
  const rate = asset.benchmarkRate;

  let rateText = '';
  if (benchmark === 'cdi') {
    rateText = `${rate || 100}% do CDI`;
  } else if (benchmark === 'ipca') {
    rateText = `IPCA + ${rate || 6}% a.a.`;
  } else if (benchmark === 'prefixado') {
    rateText = `${rate || 12}% a.a. Pré`;
  } else if (benchmark === 'selic') {
    rateText = rate && rate !== 100 ? `${rate}% da Selic` : '100% Selic';
  } else {
    rateText = `${rate || 0}%`;
  }

  let liqText = '';
  if (asset.liquidity === 'daily') {
    liqText = 'Liquidez Diária';
  } else if (asset.liquidity === 'maturity') {
    liqText = 'No Vencimento';
  } else if (asset.liquidity === 'd_plus_1') {
    liqText = 'D+1';
  } else if (asset.liquidity === 'd_plus_30') {
    liqText = 'D+30';
  }

  return [rateText, liqText].filter(Boolean).join(' • ');
}
