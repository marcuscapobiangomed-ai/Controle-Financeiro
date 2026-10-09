import { TransactionType, IncomeCategory, ExpenseCategory } from '../types/finance';

export interface ClassificationResult {
  category: string;
  suggestedType: TransactionType;
  confidence: number;
  reasoning?: string;
  source: 'gemini' | 'heuristic';
}

const MEMORY_CACHE = new Map<string, ClassificationResult>();

/**
 * Intelligent local heuristics for common Brazilian transaction keywords
 * Used as fallback or instant match when offline or prior to API response.
 */
function heuristicClassify(text: string, currentType?: TransactionType): ClassificationResult | null {
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Income heuristics
  if (norm.match(/salario|provento|holerite|folha de pagamento|adiantamento quinzenal|remuneracao|13o|decimo terceiro/)) {
    return {
      category: 'Salário & Proventos',
      suggestedType: 'income',
      confidence: 0.95,
      reasoning: 'Palavra-chave referente a remuneração ou salário.',
      source: 'heuristic',
    };
  }
  if (norm.match(/freela|freelance|consultoria|prestacao servico|trabalho extra|honorario/)) {
    return {
      category: 'Freelance & Consultoria',
      suggestedType: 'income',
      confidence: 0.9,
      reasoning: 'Serviço autônomo ou consultoria prestada.',
      source: 'heuristic',
    };
  }
  if (norm.match(/dividendo|rendimento|jcp|juros capital proprio|provento fii|rendimentos/)) {
    return {
      category: 'Dividendos & Rendimentos',
      suggestedType: 'income',
      confidence: 0.95,
      reasoning: 'Rendimento de investimento ou provento.',
      source: 'heuristic',
    };
  }
  if (norm.match(/reembolso|estorno|devolucao pix|ressarcimento/)) {
    return {
      category: 'Reembolsos',
      suggestedType: 'income',
      confidence: 0.88,
      reasoning: 'Reembolso ou devolução de valor.',
      source: 'heuristic',
    };
  }

  // Expense heuristics
  if (norm.match(/aluguel|condominio|iptu|enel|sabesp|cemig|copel|energia eletrica|conta de luz|conta de agua|gas encanado|comgas/)) {
    return {
      category: 'Moradia & Contas',
      suggestedType: 'expense',
      confidence: 0.95,
      reasoning: 'Despesa fixa residencial ou de utilidades.',
      source: 'heuristic',
    };
  }
  if (norm.match(/ifood|uber eats|supermercado|mercado|pao de acucar|carrefour|extra|acougue|padaria|hortifruti|sacolao|restaurante|mcdonald|burguer king|almoco|jantar|lanche/)) {
    return {
      category: 'Alimentação & Supermercado',
      suggestedType: 'expense',
      confidence: 0.92,
      reasoning: 'Alimentos, supermercado ou refeição.',
      source: 'heuristic',
    };
  }
  if (norm.match(/uber|99|taxi|posto|gasolina|etanol|combustivel|estacionamento|pedagio|sem parar|veloe|metro|onibus|passagem/)) {
    return {
      category: 'Transporte & Combustível',
      suggestedType: 'expense',
      confidence: 0.92,
      reasoning: 'Mobilidade urbana, combustível ou passagens.',
      source: 'heuristic',
    };
  }
  if (norm.match(/droga raia|drogasil|farmacia|medicamento|remedio|consulta|medico|unimed|bradesco saude|dentista|exame|laboratorio/)) {
    return {
      category: 'Saúde & Farmácia',
      suggestedType: 'expense',
      confidence: 0.94,
      reasoning: 'Cuidados de saúde, médicos ou farmácia.',
      source: 'heuristic',
    };
  }
  if (norm.match(/netflix|spotify|amazon prime|disney|hbo|max|chatgpt|openai|icloud|google one|youtube|assinatura|streaming/)) {
    return {
      category: 'Assinaturas & Serviços',
      suggestedType: 'expense',
      confidence: 0.95,
      reasoning: 'Serviço de assinatura digital ou streaming.',
      source: 'heuristic',
    };
  }
  if (norm.match(/cinema|bar|chopp|cerveja|balada|show|teatro|viagem|hotel|airbnb|parque|lazer/)) {
    return {
      category: 'Lazer & Restaurantes',
      suggestedType: 'expense',
      confidence: 0.88,
      reasoning: 'Entretenimento, diversão ou lazer.',
      source: 'heuristic',
    };
  }
  if (norm.match(/curso|faculdade|mensalidade escolar|udemy|alura|escola|livro|livraria|educacao/)) {
    return {
      category: 'Educação & Cursos',
      suggestedType: 'expense',
      confidence: 0.92,
      reasoning: 'Desenvolvimento pessoal, faculdade ou cursos.',
      source: 'heuristic',
    };
  }
  if (norm.match(/zara|shein|shopee|mercado livre|amazon compras|roupa|calcado|tenis|barbearia|salao|corte de cabelo|perfume/)) {
    return {
      category: 'Compras & Pessoal',
      suggestedType: 'expense',
      confidence: 0.88,
      reasoning: 'Compras de vestuário, eletrônicos ou cuidados pessoais.',
      source: 'heuristic',
    };
  }
  if (norm.match(/tesouro direto|cdb|lci|lca|aporte|poupanca|investimento|acoes|fii/)) {
    return {
      category: 'Aporte / Poupança',
      suggestedType: 'expense',
      confidence: 0.9,
      reasoning: 'Reserva financeira ou aporte para investimentos.',
      source: 'heuristic',
    };
  }

  return null;
}

/**
 * Classifies a transaction description using the Google Gemini API,
 * with fast memory caching and local heuristic fallback.
 *
 * @param description User entered transaction description
 * @param currentType Optional current transaction type ('income' | 'expense')
 * @returns Promise<ClassificationResult | null>
 */
export async function classifyTransactionCategory(
  description: string,
  currentType: TransactionType = 'expense'
): Promise<ClassificationResult | null> {
  const clean = description.trim();
  if (!clean || clean.length < 3) {
    return null;
  }

  const cacheKey = `${currentType}:${clean.toLowerCase()}`;
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  try {
    const response = await fetch('/api/ai/classify-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: clean,
        type: currentType,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.category) {
        const result: ClassificationResult = {
          category: data.category,
          suggestedType: data.suggestedType || currentType,
          confidence: data.confidence || 0.9,
          reasoning: data.reasoning,
          source: 'gemini',
        };
        MEMORY_CACHE.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Falha na classificação via Gemini API, usando heurística de fallback:', err);
  }

  // Fallback to local heuristic
  const fallback = heuristicClassify(clean, currentType);
  if (fallback) {
    MEMORY_CACHE.set(cacheKey, fallback);
    return fallback;
  }

  return null;
}
