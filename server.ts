import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI with required server-side User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/ai/financial-analysis', async (req: Request, res: Response) => {
  try {
    const {
      totalNetWorth = 0,
      totalCashInAccounts = 0,
      monthlyIncome = 0,
      monthlyExpense = 0,
      monthlySavingsRate = 0,
      categoryExpenses = [],
      assetClassAllocation = [],
      recentTransactions = [],
      accounts = [],
      goals = [],
    } = req.body;

    const prompt = `
Analise o seguinte perfil e comportamento financeiro detalhado do usuário brasileiro:

1. Visão Geral:
- Patrimônio Líquido Total: R$ ${Number(totalNetWorth).toFixed(2)}
- Saldo em Contas/Liquidez: R$ ${Number(totalCashInAccounts).toFixed(2)}
- Receitas do Mês: R$ ${Number(monthlyIncome).toFixed(2)}
- Despesas do Mês: R$ ${Number(monthlyExpense).toFixed(2)}
- Taxa de Poupança: ${Number(monthlySavingsRate).toFixed(1)}%

2. Contas & Bancos:
${JSON.stringify(accounts, null, 2)}

3. Despesas por Categoria no Mês:
${JSON.stringify(categoryExpenses, null, 2)}

4. Alocação Atual da Carteira de Investimentos:
${JSON.stringify(assetClassAllocation, null, 2)}

5. Amostra de Lançamentos Recentes:
${JSON.stringify(recentTransactions, null, 2)}

6. Metas Financeiras:
${JSON.stringify(goals, null, 2)}

Retorne um diagnóstico perspicaz, com oportunidades de economia tangíveis e recomendações inteligentes de rebalanceamento da carteira de investimentos no cenário econômico brasileiro.
`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: `Você é um planejador financeiro CFP® (Certified Financial Planner) de elite e consultor de investimentos sênior no Brasil.
Seu objetivo é analisar minuciosamente o comportamento de gastos, taxa de poupança, diversificação patrimonial e alocação de ativos do usuário.
Você deve fornecer:
1. Um resumo executivo claro, empático e prático do momento financeiro atual.
2. Um score de saúde financeira de 0 a 100 com status (Excelente, Saudável, Atenção ou Crítico).
3. Principais insights do padrão de gastos e receitas (positivo, alerta ou oportunidade).
4. Sugestões práticas e objetivas de economia com categorias específicas, valor mensal estimado de economia (R$) e nível de impacto.
5. Recomendações estratégicas de realocação da carteira de investimentos (Renda Fixa, Ações B3, FIIs, Internacional, Cripto, Reserva de Emergência) com porcentagem atual vs. sugerida e justificativa fundamentada no contexto econômico brasileiro (Selic, inflação, reserva de segurança).
6. A principal ação prioritária recomendada para os próximos dias ("nextBestAction").

Responda SEMPRE em JSON válido com o seguinte formato exato:
{
  "summary": "Resumo objetivo e encorajador em 2-3 frases",
  "healthScore": 82,
  "healthStatus": "Saudável",
  "keyInsights": [
    {
      "title": "Título do insight",
      "description": "Explicação curta do comportamento identificado",
      "type": "positive"
    }
  ],
  "savingsSuggestions": [
    {
      "category": "Nome da Categoria",
      "potentialMonthlySavings": 250.00,
      "suggestion": "Sugestão prática de economia",
      "impact": "Alto"
    }
  ],
  "investmentReallocations": [
    {
      "assetClass": "Renda Fixa",
      "currentPercentage": 40,
      "targetPercentage": 35,
      "action": "Aumentar Aporte",
      "rationale": "Justificativa da recomendação"
    }
  ],
  "nextBestAction": "Ação imediata recomendada para o usuário"
}`,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          parsed = JSON.parse(text);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com ${modelName} falhou, tentando fallback...`, err?.message || err);
      }
    }

    if (!parsed) {
      throw lastError || new Error('Não foi possível obter resposta dos modelos Gemini disponíveis.');
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Erro na análise financeira com Gemini:', error);
    res.status(500).json({
      error: error?.message || 'Falha ao processar análise financeira com a IA Gemini.',
    });
  }
});

app.post('/api/ai/classify-category', async (req: Request, res: Response) => {
  try {
    const { description = '', type = 'expense' } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Descrição é obrigatória para classificação.' });
    }

    const prompt = `Classifique a seguinte transação financeira para um usuário brasileiro:
Descrição: "${description.trim()}"
Tipo atual indicado: ${type === 'income' ? 'Entrada (Receita)' : 'Saída (Despesa)'}

Categorias válidas para Receitas:
- Salário & Proventos
- Freelance & Consultoria
- Dividendos & Rendimentos
- Venda de Ativos
- Reembolsos
- Outras Receitas

Categorias válidas para Despesas:
- Moradia & Contas
- Alimentação & Supermercado
- Transporte & Combustível
- Saúde & Farmácia
- Educação & Cursos
- Lazer & Restaurantes
- Assinaturas & Serviços
- Compras & Pessoal
- Aporte / Poupança
- Outras Despesas

Retorne a categoria exata mais adequada da lista acima e se o tipo mais provável é 'income' ou 'expense'.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;
    let parsed: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: `Você é um classificador inteligente de finanças pessoais brasileiras.
Dada a descrição de uma despesa ou receita, sua tarefa é identificar com precisão a categoria financeira padronizada correspondente.
Exemplos de mapeamento:
- "iFood", "Padaria", "Supermercado Pão de Açúcar", "Feira", "Açougue", "Restaurante por quilo": "Alimentação & Supermercado"
- "Uber", "99", "Posto Ipiranga", "Gasolina", "Metrô", "Sem Parar", "Pedágio": "Transporte & Combustível"
- "Aluguel", "Condomínio", "Enel", "Conta de luz", "Sabesp", "IPTU", "Internet Claro": "Moradia & Contas"
- "Droga Raia", "Consulta Dr. Silva", "Unimed", "Exame de sangue", "Dentista": "Saúde & Farmácia"
- "Netflix", "Spotify", "Amazon Prime", "ChatGPT Plus", "iCloud", "YouTube Premium": "Assinaturas & Serviços"
- "Outback", "Cinema Kinoplex", "Bar do Zé", "Ingresso show", "Balada", "Chopp": "Lazer & Restaurantes"
- "Curso Udemy", "Mensalidade Faculdade", "Livro Amazon", "Alura", "Inglês": "Educação & Cursos"
- "Zara", "Shein", "Shopee", "Corte de cabelo", "Presente aniversário", "Mercado Livre compras": "Compras & Pessoal"
- "Depósito Tesouro Direto", "Aporte CDB", "Poupança", "Ações B3 aporte": "Aporte / Poupança"
- "Salário empresa X", "Adiantamento quinzenal", "Pró-labore": "Salário & Proventos"
- "Projeto freelance cliente Y", "Consultoria PJ", "Trabalho extra": "Freelance & Consultoria"
- "Dividendos PETR4", "Rendimentos MXRF11", "Juros sobre Capital Próprio": "Dividendos & Rendimentos"
- "Reembolso despesa viagem", "Devolução Pix": "Reembolsos"

Responda SEMPRE em JSON válido no formato:
{
  "category": "Nome Exato da Categoria",
  "suggestedType": "expense",
  "confidence": 0.95,
  "reasoning": "Breve justificativa"
}`,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          parsed = JSON.parse(text);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa de classificação com ${modelName} falhou, tentando fallback...`, err?.message || err);
      }
    }

    if (!parsed) {
      throw lastError || new Error('Não foi possível classificar a transação.');
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Erro na classificação de categoria com Gemini:', error);
    res.status(500).json({
      error: error?.message || 'Falha ao classificar categoria com a IA Gemini.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    // Disable HMR in AI Studio dev environment per platform guidelines
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
