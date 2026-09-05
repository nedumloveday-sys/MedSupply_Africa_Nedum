import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { InventoryRecord } from '../types';
import { formatNaira, formatNumber } from '../utils/formatters';
import { BarChart3, TrendingUp, Layers, Building2, Thermometer, ShieldAlert } from 'lucide-react';

interface ChartsGridProps {
  data: InventoryRecord[];
  onSelectStateFilter: (state: string) => void;
  onSelectCategoryFilter: (category: string) => void;
  selectedState?: string;
  selectedCategory?: string;
}

// Strictly purple & monochrome tones for charts
const PURPLE_SCALE = [
  '#C084FC', // Light vibrant purple
  '#A855F7', // Primary rich purple
  '#8B5CF6', // Purple violet
  '#7C3AED', // Deep violet
  '#6D28D9', // Dark purple
  '#581C87', // Very dark purple
  '#DDD6FE', // Pale lavender
  '#E9D5FF', // Soft lilac
  '#4C1D95', // Indigo violet
  '#A78BFA', // Medium lavender
];

const STORAGE_COLORS: Record<string, string> = {
  Ambient: '#8B5CF6',
  'Cool & Dry': '#6D28D9',
  Refrigerated: '#DDD6FE',
};

// Custom dark purple tooltip component
const CustomChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c1b22] border border-zinc-700 rounded-lg p-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.8)] text-xs">
        <p className="font-semibold text-white mb-1.5 border-b border-zinc-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          const val = entry.value;
          const isCurrency = entry.name?.toLowerCase().includes('revenue') || entry.name?.toLowerCase().includes('price');
          const formatted = isCurrency ? formatNaira(val, 0) : formatNumber(val);
          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-zinc-300 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || '#8B5CF6' }}></span>
                <span className="text-zinc-400">{entry.name}:</span>
              </span>
              <span className="font-semibold text-white">
                {prefix}
                {formatted}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const ChartsGrid: React.FC<ChartsGridProps> = ({
  data,
  onSelectStateFilter,
  onSelectCategoryFilter,
  selectedState,
  selectedCategory,
}) => {
  const [topDrugsMetric, setTopDrugsMetric] = useState<'revenue' | 'units'>('revenue');
  const [stockHealthGrouping, setStockHealthGrouping] = useState<'category' | 'state'>('category');

  // 1. Revenue by State
  const revenueByState = useMemo(() => {
    const map: Record<string, { state: string; revenue: number; units: number; count: number }> = {};
    data.forEach((r) => {
      if (!map[r.State]) {
        map[r.State] = { state: r.State, revenue: 0, units: 0, count: 0 };
      }
      map[r.State].revenue += r.Revenue_NGN;
      map[r.State].units += r.Units_Sold;
      map[r.State].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // 2. Revenue by Category
  const revenueByCategory = useMemo(() => {
    const map: Record<string, { category: string; revenue: number; units: number; count: number }> = {};
    data.forEach((r) => {
      if (!map[r.Category]) {
        map[r.Category] = { category: r.Category, revenue: 0, units: 0, count: 0 };
      }
      map[r.Category].revenue += r.Revenue_NGN;
      map[r.Category].units += r.Units_Sold;
      map[r.Category].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // 3. Revenue by Supplier
  const revenueBySupplier = useMemo(() => {
    const map: Record<string, { supplier: string; revenue: number; units: number; count: number }> = {};
    data.forEach((r) => {
      if (!map[r.Supplier]) {
        map[r.Supplier] = { supplier: r.Supplier, revenue: 0, units: 0, count: 0 };
      }
      map[r.Supplier].revenue += r.Revenue_NGN;
      map[r.Supplier].units += r.Units_Sold;
      map[r.Supplier].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // 4. Monthly Trend (Jan 2024 - Dec 2024)
  const monthlyTrend = useMemo(() => {
    const months = [
      'Jan-2024',
      'Feb-2024',
      'Mar-2024',
      'Apr-2024',
      'May-2024',
      'Jun-2024',
      'Jul-2024',
      'Aug-2024',
      'Sep-2024',
      'Oct-2024',
      'Nov-2024',
      'Dec-2024',
    ];
    const map: Record<string, { month: string; monthOrder: number; revenue: number; units: number }> = {};
    months.forEach((m, idx) => {
      map[m] = { month: m.replace('-2024', ''), monthOrder: idx + 1, revenue: 0, units: 0 };
    });

    data.forEach((r) => {
      if (map[r.Month]) {
        map[r.Month].revenue += r.Revenue_NGN;
        map[r.Month].units += r.Units_Sold;
      }
    });

    return Object.values(map).sort((a, b) => a.monthOrder - b.monthOrder);
  }, [data]);

  // 5. Top 10 Drugs
  const top10Drugs = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; units: number; category: string }> = {};
    data.forEach((r) => {
      if (!map[r.Drug_Name]) {
        map[r.Drug_Name] = { name: r.Drug_Name, revenue: 0, units: 0, category: r.Category };
      }
      map[r.Drug_Name].revenue += r.Revenue_NGN;
      map[r.Drug_Name].units += r.Units_Sold;
    });
    const list = Object.values(map);
    if (topDrugsMetric === 'revenue') {
      return list.sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    }
    return list.sort((a, b) => b.units - a.units).slice(0, 10);
  }, [data, topDrugsMetric]);

  // 6. Stock Health (Stock Remaining vs Reorder Point)
  const stockHealthData = useMemo(() => {
    const keyProp = stockHealthGrouping === 'category' ? 'Category' : 'State';
    const map: Record<
      string,
      {
        name: string;
        totalStock: number;
        totalReorder: number;
        belowCount: number;
        totalCount: number;
        shortfall: number;
      }
    > = {};

    data.forEach((r) => {
      const k = r[keyProp];
      if (!map[k]) {
        map[k] = {
          name: k,
          totalStock: 0,
          totalReorder: 0,
          belowCount: 0,
          totalCount: 0,
          shortfall: 0,
        };
      }
      map[k].totalStock += r.Stock_Remaining;
      map[k].totalReorder += r.Reorder_Point;
      map[k].totalCount += 1;
      if (r.Below_Reorder_Point) {
        map[k].belowCount += 1;
        map[k].shortfall += r.Shortfall;
      }
    });

    return Object.values(map).sort((a, b) => b.belowCount - a.belowCount);
  }, [data, stockHealthGrouping]);

  // 7. Storage Condition Breakdown
  const storageBreakdown = useMemo(() => {
    const map: Record<string, { condition: string; revenue: number; skuCount: number; units: number }> = {
      Ambient: { condition: 'Ambient', revenue: 0, skuCount: 0, units: 0 },
      'Cool & Dry': { condition: 'Cool & Dry', revenue: 0, skuCount: 0, units: 0 },
      Refrigerated: { condition: 'Refrigerated', revenue: 0, skuCount: 0, units: 0 },
    };

    data.forEach((r) => {
      if (map[r.Storage_Condition]) {
        map[r.Storage_Condition].revenue += r.Revenue_NGN;
        map[r.Storage_Condition].skuCount += 1;
        map[r.Storage_Condition].units += r.Units_Sold;
      }
    });

    return Object.values(map);
  }, [data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* SVG Gradient definitions for Recharts */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C084FC" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="deepPurpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9333EA" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#4C1D95" stopOpacity={0.65} />
          </linearGradient>
          <linearGradient id="lavenderGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E9D5FF" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#A855F7" stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#A855F7" stopOpacity={0.0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Row 1: Revenue by State & Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 1: Revenue by State */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Revenue by State</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Sorted descending • Click a bar to isolate that State
              </p>
            </div>
            {selectedState && (
              <button
                onClick={() => onSelectStateFilter(selectedState)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#212028] text-purple-300 border border-zinc-700 hover:border-zinc-500"
              >
                Clear State Filter ({selectedState})
              </button>
            )}
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueByState}
                margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    onSelectStateFilter(e.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="state"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(val) => `₦${(val / 1000000).toFixed(1)}M`}
                  width={60}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue (NGN)"
                  fill="url(#purpleBarGrad)"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                >
                  {revenueByState.map((entry) => (
                    <Cell
                      key={`cell-${entry.state}`}
                      fill={selectedState === entry.state ? '#E9D5FF' : 'url(#purpleBarGrad)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Revenue by Category */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Revenue by Category</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                8 therapeutic categories • Click to drill into category
              </p>
            </div>
            {selectedCategory && (
              <button
                onClick={() => onSelectCategoryFilter(selectedCategory)}
                className="text-[10px] px-2 py-0.5 rounded bg-[#212028] text-purple-300 border border-zinc-700 hover:border-zinc-500"
              >
                Clear Category ({selectedCategory})
              </button>
            )}
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueByCategory}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                onClick={(e) => {
                  if (e && e.activeLabel) {
                    onSelectCategoryFilter(e.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(val) => `₦${(val / 1000000).toFixed(0)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fill: '#d4d4d8', fontSize: 10 }}
                  width={95}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue (NGN)"
                  fill="url(#deepPurpleGrad)"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                >
                  {revenueByCategory.map((entry, idx) => (
                    <Cell
                      key={`cat-cell-${entry.category}`}
                      fill={selectedCategory === entry.category ? '#E9D5FF' : PURPLE_SCALE[idx % PURPLE_SCALE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Monthly Revenue & Volume Trend (2024) */}
      <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Monthly Trend: Revenue vs Units Sold (Jan-2024 to Dec-2024)</span>
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Dual-axis trajectory tracking seasonal demand patterns across all 12 operational months
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-purple-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Revenue (₦)
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
              Units Sold
            </span>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrend} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              {/* Primary Y Axis: Revenue */}
              <YAxis
                yAxisId="left"
                tick={{ fill: '#c084fc', fontSize: 10 }}
                tickFormatter={(val) => `₦${(val / 1000000).toFixed(0)}M`}
                width={65}
              />
              {/* Secondary Y Axis: Units Sold */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#d4d4d8', fontSize: 10 }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Revenue"
                fill="url(#purpleBarGrad)"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="units"
                name="Units Sold"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8B5CF6', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#E9D5FF' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Top 10 Drugs Performance & Supplier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 4: Top 10 Drugs (Toggleable Revenue vs Units) */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>Top 10 Drug Performance</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Ranked highest contributors to inventory metrics
              </p>
            </div>
            {/* Metric Toggle */}
            <div className="inline-flex rounded p-0.5 bg-[#1c1b22] border border-zinc-700">
              <button
                onClick={() => setTopDrugsMetric('revenue')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                  topDrugsMetric === 'revenue'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Revenue
              </button>
              <button
                onClick={() => setTopDrugsMetric('units')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                  topDrugsMetric === 'units'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Volume
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Drugs}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(val) =>
                    topDrugsMetric === 'revenue'
                      ? `₦${(val / 1000000).toFixed(0)}M`
                      : `${(val / 1000).toFixed(0)}k`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#d4d4d8', fontSize: 10 }}
                  width={120}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey={topDrugsMetric === 'revenue' ? 'revenue' : 'units'}
                  name={topDrugsMetric === 'revenue' ? 'Revenue (NGN)' : 'Units Sold'}
                  fill="url(#purpleBarGrad)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Revenue by Supplier */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Revenue by Supplier</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                5 contracted pharmaceutical supply partners
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySupplier} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="supplier" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(val) => `₦${(val / 1000000).toFixed(0)}M`}
                  width={60}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Revenue (NGN)"
                  fill="url(#deepPurpleGrad)"
                  radius={[4, 4, 0, 0]}
                >
                  {revenueBySupplier.map((entry, idx) => (
                    <Cell key={`sup-cell-${entry.supplier}`} fill={PURPLE_SCALE[idx % PURPLE_SCALE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Stock Health (Stock Remaining vs Reorder Point) & Storage Condition Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 6: Stock Health vs Reorder Point */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>Stock Health: Remaining vs Reorder Threshold</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Comparing available warehouse inventory with critical restock baseline
              </p>
            </div>
            {/* Toggle Grouping */}
            <div className="inline-flex rounded p-0.5 bg-[#1c1b22] border border-zinc-700">
              <button
                onClick={() => setStockHealthGrouping('category')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                  stockHealthGrouping === 'category'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setStockHealthGrouping('state')}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                  stockHealthGrouping === 'state'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                By State
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockHealthData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  formatter={(value) => <span className="text-zinc-300">{value}</span>}
                />
                <Bar
                  dataKey="totalStock"
                  name="Stock Remaining"
                  fill="#8B5CF6"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="totalReorder"
                  name="Reorder Point"
                  fill="#4C1D95"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Storage Condition Breakdown */}
        <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-purple-400" />
                <span>Storage Condition Distribution</span>
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Revenue & SKU count by required ambient vs cold-chain storage
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#1c1b22] border border-zinc-700 rounded-lg p-2.5 shadow-xl text-xs">
                          <p className="font-semibold text-white mb-1">{d.condition}</p>
                          <p className="text-zinc-300">Revenue: {formatNaira(d.revenue, 0)}</p>
                          <p className="text-zinc-300">SKU Count: {d.skuCount} batches</p>
                          <p className="text-zinc-300">Units Sold: {formatNumber(d.units)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={storageBreakdown}
                  dataKey="revenue"
                  nameKey="condition"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="#17161C"
                  strokeWidth={2}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {storageBreakdown.map((entry) => (
                    <Cell
                      key={`storage-${entry.condition}`}
                      fill={STORAGE_COLORS[entry.condition] || '#8B5CF6'}
                    />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-zinc-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
