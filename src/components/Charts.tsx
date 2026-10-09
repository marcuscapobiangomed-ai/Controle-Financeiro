import React, { useState } from 'react';
import { formatCurrency, getAssetClassShortLabel } from '../utils/formatters';
import { AssetClass } from '../types/finance';

// Multi-month Cash Flow Bar Chart
interface CashFlowChartProps {
  data: {
    month: string;
    label: string;
    income: number;
    expense: number;
    balance: number;
  }[];
}

export const CashFlowBarChart: React.FC<CashFlowChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.income, d.expense)),
    1000
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-400">
          Evolução dos últimos 6 meses (Receitas vs Despesas)
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            Saídas
          </span>
        </div>
      </div>

      {/* SVG Bar Chart container */}
      <div className="h-48 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-800">
        {data.map((item, idx) => {
          const incHeight = (item.income / maxVal) * 100;
          const expHeight = (item.expense / maxVal) * 100;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-12 z-20 bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded shadow-xl whitespace-nowrap pointer-events-none">
                  <div className="font-semibold text-slate-100">{item.label}</div>
                  <div className="text-emerald-400 tabular-nums">+{formatCurrency(item.income)}</div>
                  <div className="text-rose-400 tabular-nums">-{formatCurrency(item.expense)}</div>
                  <div className="text-slate-300 font-mono border-t border-slate-700/60 pt-0.5 mt-0.5">
                    Saldo: {formatCurrency(item.balance)}
                  </div>
                </div>
              )}

              {/* Bars Pair */}
              <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                <div
                  style={{ height: `${Math.max(incHeight, 4)}%` }}
                  className="w-1/2 max-w-[20px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t-sm transition-all duration-200"
                />
                <div
                  style={{ height: `${Math.max(expHeight, 4)}%` }}
                  className="w-1/2 max-w-[20px] bg-rose-500/80 hover:bg-rose-400 rounded-t-sm transition-all duration-200"
                />
              </div>

              {/* Month label */}
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Expense Category Distribution Bars
interface CategoryExpensesProps {
  categories: { category: string; amount: number; percentage: number }[];
}

export const CategoryExpenseList: React.FC<CategoryExpensesProps> = ({ categories }) => {
  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Nenhuma despesa registrada neste período.
      </div>
    );
  }

  const colors = [
    'bg-emerald-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-orange-500',
  ];

  return (
    <div className="space-y-3">
      {categories.slice(0, 6).map((cat, idx) => {
        const color = colors[idx % colors.length];
        return (
          <div key={cat.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium truncate max-w-[65%]">
                {cat.category}
              </span>
              <div className="flex items-center gap-2 text-right">
                <span className="text-slate-400 font-mono text-[11px] tabular-nums">
                  {cat.percentage.toFixed(1)}%
                </span>
                <span className="text-slate-200 font-mono font-medium tabular-nums">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                className={`h-full ${color} rounded-full transition-all duration-300`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Asset Allocation Stacked Bar
interface AssetAllocationProps {
  allocations: {
    assetClass: AssetClass;
    currentValue: number;
    investedValue: number;
    profit: number;
    percentage: number;
  }[];
}

const CLASS_COLORS: Record<AssetClass, { bar: string; text: string }> = {
  renda_fixa: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  acoes_br: { bar: 'bg-sky-500', text: 'text-sky-400' },
  fiis: { bar: 'bg-amber-500', text: 'text-amber-400' },
  internacional: { bar: 'bg-purple-500', text: 'text-purple-400' },
  cripto: { bar: 'bg-orange-500', text: 'text-orange-400' },
  reserva_emergencia: { bar: 'bg-teal-400', text: 'text-teal-400' },
};

export const AssetAllocationVisual: React.FC<AssetAllocationProps> = ({ allocations }) => {
  const activeAllocations = allocations.filter(a => a.currentValue > 0);

  if (activeAllocations.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500">
        Nenhum ativo cadastrado na carteira.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Continuous Stacked Bar */}
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
        {activeAllocations.map(item => {
          const colorClass = CLASS_COLORS[item.assetClass]?.bar || 'bg-slate-400';
          return (
            <div
              key={item.assetClass}
              style={{ width: `${item.percentage}%` }}
              title={`${getAssetClassShortLabel(item.assetClass)}: ${item.percentage.toFixed(1)}%`}
              className={`h-full ${colorClass} first:rounded-l-full last:rounded-r-full transition-all duration-300`}
            />
          );
        })}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        {activeAllocations.map(item => {
          const color = CLASS_COLORS[item.assetClass];
          return (
            <div
              key={item.assetClass}
              className="p-2 rounded bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${color.bar}`} />
                <span className="text-[11px] font-medium text-slate-300 truncate">
                  {getAssetClassShortLabel(item.assetClass)}
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-mono text-slate-200 tabular-nums font-semibold">
                  {formatCurrency(item.currentValue)}
                </span>
                <span className="font-mono text-slate-400 text-[10px] tabular-nums">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
