/**
 * Constantes e identificadores dos dados de demonstração (mock data).
 * Permite detecção e expurgo preciso de itens fictícios do Firestore e cache local.
 */

export const MOCK_ACCOUNT_IDS = ['acc_1', 'acc_2', 'acc_3', 'acc_4'];

export const MOCK_INVESTMENT_IDS = [
  'inv_1',
  'inv_2',
  'inv_cdi140',
  'inv_cdi_120',
  'inv_cdi_140',
  'inv_3',
  'inv_4',
  'inv_5',
  'inv_6',
  'inv_7',
  'inv_8',
  'inv_9',
];

export const MOCK_DIVIDEND_IDS = ['div_1', 'div_2', 'div_3', 'div_4', 'div_5', 'div_6'];

export const MOCK_GOAL_IDS = ['goal_1', 'goal_2', 'goal_3'];

export const MOCK_TRANSACTION_PREFIXES = [
  'tx_01', 'tx_02', 'tx_03', 'tx_04', 'tx_05', 'tx_06', 'tx_07', 'tx_08', 'tx_09', 'tx_10',
  'tx_11', 'tx_12', 'tx_13', 'tx_14', 'tx_15', 'tx_16', 'tx_17', 'tx_18', 'tx_19', 'tx_20',
  'tx_21', 'tx_22', 'tx_23', 'tx_24', 'tx_25', 'tx_26', 'tx_27', 'tx_28', 'tx_29', 'tx_30',
  'tx_31'
];

/**
 * Verifica se um ativo de investimento é proveniente do mock
 */
export function isMockInvestment(inv: { id: string; ticker?: string }): boolean {
  if (MOCK_INVESTMENT_IDS.includes(inv.id)) return true;
  // Checagem adicional por IDs com prefixo de mock inicial
  if (['TD-IPCA29', 'CDB-120', 'CDB-140', 'MXRF11', 'HGLG11', 'WEGE3', 'ITSA4', 'IVVB11', 'TD-SELIC'].includes(inv.ticker || '') && inv.id.startsWith('inv_')) {
    return MOCK_INVESTMENT_IDS.includes(inv.id);
  }
  return false;
}

/**
 * Verifica se uma conta é proveniente do mock
 */
export function isMockAccount(acc: { id: string }): boolean {
  return MOCK_ACCOUNT_IDS.includes(acc.id);
}

/**
 * Verifica se uma transação é proveniente do mock
 */
export function isMockTransaction(tx: { id: string }): boolean {
  if (MOCK_TRANSACTION_PREFIXES.includes(tx.id)) return true;
  if (
    tx.id.startsWith('tx_oct_') ||
    tx.id.startsWith('tx_prev_') ||
    tx.id.startsWith('tx_jul_') ||
    tx.id.startsWith('tx_jun_') ||
    tx.id.startsWith('tx_may_')
  ) {
    return true;
  }
  // Se for ID simples tx_1 até tx_35
  const match = tx.id.match(/^tx_(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num <= 35;
  }
  return false;
}

/**
 * Verifica se um provento é proveniente do mock
 */
export function isMockDividend(div: { id: string }): boolean {
  return MOCK_DIVIDEND_IDS.includes(div.id);
}

/**
 * Verifica se uma meta é proveniente do mock
 */
export function isMockGoal(goal: { id: string }): boolean {
  return MOCK_GOAL_IDS.includes(goal.id);
}
