import { TransactionType } from '../types/finance';

export interface ParsedStatementTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  notes?: string;
}

// Auto-categorize by common merchant/keywords in Brazil
export function guessCategory(description: string, type: TransactionType): string {
  const desc = description.toLowerCase();

  if (type === 'income') {
    if (desc.includes('salario') || desc.includes('salário') || desc.includes('folha') || desc.includes('remunera')) {
      return 'Salário & Proventos';
    }
    if (desc.includes('rendimento') || desc.includes('divid') || desc.includes('juros') || desc.includes('jcp')) {
      return 'Dividendos & Rendimentos';
    }
    if (desc.includes('freelance') || desc.includes('consult') || desc.includes('prestacao') || desc.includes('servico')) {
      return 'Freelance & Consultoria';
    }
    if (desc.includes('reembolso') || desc.includes('estorno')) {
      return 'Reembolsos';
    }
    return 'Outras Receitas';
  }

  // Expenses
  if (
    desc.includes('supermercado') ||
    desc.includes('mercado') ||
    desc.includes('pao de acucar') ||
    desc.includes('carrefour') ||
    desc.includes('atacadao') ||
    desc.includes('hortifruti') ||
    desc.includes('padaria') ||
    desc.includes('acougue')
  ) {
    return 'Alimentação & Supermercado';
  }

  if (
    desc.includes('restaurante') ||
    desc.includes('ifood') ||
    desc.includes('uber eats') ||
    desc.includes('mcdonald') ||
    desc.includes('burger') ||
    desc.includes('cafe') ||
    desc.includes('bar ') ||
    desc.includes('pizzaria') ||
    desc.includes('churrascaria')
  ) {
    return 'Lazer & Restaurantes';
  }

  if (
    desc.includes('posto') ||
    desc.includes('combustivel') ||
    desc.includes('gasolina') ||
    desc.includes('ipiranga') ||
    desc.includes('shell') ||
    desc.includes('uber') ||
    desc.includes('99app') ||
    desc.includes('sem parar') ||
    desc.includes('estacionamento') ||
    desc.includes('pedagio')
  ) {
    return 'Transporte & Combustível';
  }

  if (
    desc.includes('aluguel') ||
    desc.includes('condominio') ||
    desc.includes('enel') ||
    desc.includes('cpfl') ||
    desc.includes('sabesp') ||
    desc.includes('luz') ||
    desc.includes('agua') ||
    desc.includes('gas') ||
    desc.includes('internet') ||
    desc.includes('claro') ||
    desc.includes('vivo') ||
    desc.includes('tim') ||
    desc.includes('iptu')
  ) {
    return 'Moradia & Contas';
  }

  if (
    desc.includes('farmacia') ||
    desc.includes('drogaria') ||
    desc.includes('drogasil') ||
    desc.includes('raia') ||
    desc.includes('unimed') ||
    desc.includes('bradesco saude') ||
    desc.includes('amil') ||
    desc.includes('sulamerica') ||
    desc.includes('hospital') ||
    desc.includes('laboratorio') ||
    desc.includes('consulta')
  ) {
    return 'Saúde & Farmácia';
  }

  if (
    desc.includes('netflix') ||
    desc.includes('spotify') ||
    desc.includes('amazon prime') ||
    desc.includes('apple') ||
    desc.includes('icloud') ||
    desc.includes('google storage') ||
    desc.includes('youtube') ||
    desc.includes('disney') ||
    desc.includes('hbo') ||
    desc.includes('globo')
  ) {
    return 'Assinaturas & Serviços';
  }

  if (
    desc.includes('invest') ||
    desc.includes('tesouro') ||
    desc.includes('cdb') ||
    desc.includes('poupanca') ||
    desc.includes('aporte') ||
    desc.includes('xp') ||
    desc.includes('btg')
  ) {
    return 'Aporte / Poupança';
  }

  if (
    desc.includes('curso') ||
    desc.includes('udemy') ||
    desc.includes('faculdade') ||
    desc.includes('escola') ||
    desc.includes('livraria')
  ) {
    return 'Educação & Cursos';
  }

  return 'Compras & Pessoal';
}

// Parse standard bank OFX statements (supported by Nubank, Itaú, Bradesco, Inter, Santander, BB, Caixa, etc.)
export function parseOFX(ofxContent: string): ParsedStatementTransaction[] {
  const transactions: ParsedStatementTransaction[] = [];

  // Match all <STMTTRN>...</STMTTRN> blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = trnRegex.exec(ofxContent)) !== null) {
    const block = match[1];

    // Extract TRNTYPE, DTPOSTED, TRNAMT, MEMO / NAME
    const typeMatch = block.match(/<TRNTYPE>([^\r\n<]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^\r\n<]+)/i);
    const amountMatch = block.match(/<TRNAMT>([^\r\n<]+)/i);
    const memoMatch = block.match(/<MEMO>([^\r\n<]+)/i);
    const nameMatch = block.match(/<NAME>([^\r\n<]+)/i);

    const description = (memoMatch ? memoMatch[1] : nameMatch ? nameMatch[1] : 'Lançamento bancário').trim();
    const rawAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    // In OFX, negative is debit/expense, positive is credit/income
    const isIncome = rawAmount > 0 || (typeMatch && typeMatch[1].toUpperCase() === 'CREDIT');
    const type: TransactionType = isIncome ? 'income' : 'expense';
    const amount = Math.abs(rawAmount);

    // Format date YYYYMMDD -> YYYY-MM-DD
    let dateStr = new Date().toISOString().split('T')[0];
    if (dateMatch && dateMatch[1].length >= 8) {
      const d = dateMatch[1].trim();
      const y = d.substring(0, 4);
      const m = d.substring(4, 6);
      const day = d.substring(6, 8);
      dateStr = `${y}-${m}-${day}`;
    }

    const category = guessCategory(description, type);

    transactions.push({
      date: dateStr,
      description,
      amount,
      type,
      category,
      notes: 'Importado via Extrato OFX',
    });
  }

  return transactions;
}

// Parse standard bank CSV statements (with delimiters ',' or ';')
export function parseCSV(csvContent: string): ParsedStatementTransaction[] {
  const transactions: ParsedStatementTransaction[] = [];
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) return [];

  // Determine delimiter: ';' or ','
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  // Find header indexes
  const headerCols = firstLine.split(delimiter).map(c => c.trim().toLowerCase().replace(/"/g, ''));
  const dateIdx = headerCols.findIndex(c => c.includes('data') || c.includes('date'));
  const descIdx = headerCols.findIndex(
    c => c.includes('desc') || c.includes('memo') || c.includes('historico') || c.includes('título') || c.includes('titulo')
  );
  const amountIdx = headerCols.findIndex(c => c.includes('valor') || c.includes('amount') || c.includes('quantia'));

  const startIndex = dateIdx !== -1 && amountIdx !== -1 ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));
    if (rawCols.length < 2) continue;

    let dateRaw = dateIdx !== -1 ? rawCols[dateIdx] : rawCols[0];
    let descRaw = descIdx !== -1 ? rawCols[descIdx] : rawCols[1] || 'Transação Importada';
    let amountRaw = amountIdx !== -1 ? rawCols[amountIdx] : rawCols[rawCols.length - 1];

    if (!amountRaw) continue;

    // Clean currency string
    const cleanAmountStr = amountRaw
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const numAmount = parseFloat(cleanAmountStr);
    if (isNaN(numAmount) || numAmount === 0) continue;

    const isIncome = numAmount > 0;
    const type: TransactionType = isIncome ? 'income' : 'expense';
    const amount = Math.abs(numAmount);

    // Parse date: can be DD/MM/YYYY or YYYY-MM-DD
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dateRaw) {
      if (dateRaw.includes('/')) {
        const parts = dateRaw.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) year = `20${year}`;
          formattedDate = `${year}-${month}-${day}`;
        }
      } else if (dateRaw.includes('-')) {
        const parts = dateRaw.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            formattedDate = dateRaw; // already YYYY-MM-DD
          } else {
            formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }
    }

    const category = guessCategory(descRaw, type);

    transactions.push({
      date: formattedDate,
      description: descRaw,
      amount,
      type,
      category,
      notes: 'Importado via Extrato CSV',
    });
  }

  return transactions;
}
