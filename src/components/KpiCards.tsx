import React from 'react';
import { TrendingUp, Package, AlertTriangle, Clock, CircleDollarSign, ShieldAlert } from 'lucide-react';
import { DashboardMetrics } from '../types';
import { formatNaira, formatNumber, formatPercent } from '../utils/formatters';

interface KpiCardsProps {
  metrics: DashboardMetrics;
  excludeOutliers: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, excludeOutliers }) => {
  const trustScore = Math.max(0, 100 - metrics.dataQualityFlaggedPercent).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
      {/* 1. Total Revenue */}
      <div className="bg-[#17161C] border border-zinc-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
          <div className="w-12 h-12 border-4 border-purple-500 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Revenue</p>
          <div className="w-6 h-6 rounded bg-[#212028] text-purple-400 flex items-center justify-center border border-zinc-800">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
          {formatNaira(metrics.totalRevenue, 0)}
        </h3>
        <p className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_#8B5CF6]"></span>
          <span>{excludeOutliers ? 'Clean baseline (excl. 99k)' : 'Raw transaction total'}</span>
        </p>
      </div>

      {/* 2. Units Sold */}
      <div className="bg-[#17161C] border border-zinc-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Units Sold</p>
          <div className="w-6 h-6 rounded bg-[#212028] text-purple-400 flex items-center justify-center border border-zinc-800">
            <Package className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
          {formatNumber(metrics.totalUnitsSold)}
          <span className="text-xs text-zinc-500 font-normal ml-1">units</span>
        </h3>
        <p className="text-[10px] text-zinc-400 mt-1">
          across {metrics.totalSKUs} product line batches
        </p>
      </div>

      {/* 3. Critical Stock (Below Reorder Point) */}
      <div className="bg-[#17161C] border border-purple-900/50 p-3.5 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden group hover:border-purple-800/80 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Critical Stock</p>
          <div className="w-6 h-6 rounded bg-purple-600 text-white flex items-center justify-center shadow-[0_0_8px_#8B5CF6]">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-purple-400 tracking-tight">
          {metrics.belowReorderCount}{' '}
          <span className="text-xs text-zinc-500 font-normal">
            ({formatPercent(metrics.belowReorderPercent)})
          </span>
        </h3>
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-purple-500 shadow-[0_0_8px_#8B5CF6] transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.belowReorderPercent)}%` }}
          ></div>
        </div>
      </div>

      {/* 4. Expiring Window */}
      <div className="bg-[#17161C] border border-zinc-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Expiry Risk</p>
          <div className="w-6 h-6 rounded bg-[#212028] text-purple-400 flex items-center justify-center border border-zinc-800">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
          {metrics.expiring90dCount}{' '}
          <span className="text-xs text-zinc-500 font-normal">
            ({formatPercent(metrics.expiring90dPercent)})
          </span>
        </h3>
        <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-purple-700 transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.expiring90dPercent)}%` }}
          ></div>
        </div>
      </div>

      {/* 5. Avg Price Per Unit */}
      <div className="bg-[#17161C] border border-zinc-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Avg Unit Price</p>
          <div className="w-6 h-6 rounded bg-[#212028] text-purple-400 flex items-center justify-center border border-zinc-800">
            <CircleDollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
          {formatNaira(metrics.averagePricePerUnit, 2)}
        </h3>
        <p className="text-[10px] text-zinc-400 mt-1">
          Range: ₦50.28 to ₦599.26
        </p>
      </div>

      {/* 6. Data Trust Score */}
      <div className="bg-[#17161C] border border-zinc-800 p-3.5 rounded-xl shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Data Trust Score</p>
          <div className="w-6 h-6 rounded bg-[#212028] text-purple-400 flex items-center justify-center border border-zinc-800">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
          {trustScore}%
        </h3>
        <p className="text-[10px] text-zinc-400 mt-1">
          {metrics.dataQualityFlaggedCount} records flagged
        </p>
      </div>
    </div>
  );
};
