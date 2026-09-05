import React, { useMemo } from 'react';
import { X, Sparkles, CheckCircle2, TrendingUp, AlertTriangle, Clock, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';
import { InventoryRecord, DashboardMetrics } from '../types';
import { formatNaira, formatNumber, formatPercent, formatDate } from '../utils/formatters';

interface ExecutiveQuestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: InventoryRecord[];
  allData: InventoryRecord[];
  metrics: DashboardMetrics;
  onJumpToSection: (sectionId: string) => void;
}

export const ExecutiveQuestionsDrawer: React.FC<ExecutiveQuestionsDrawerProps> = ({
  isOpen,
  onClose,
  data,
  allData,
  metrics,
  onJumpToSection,
}) => {
  if (!isOpen) return null;

  // Question 2: States, Categories, Suppliers ranking
  const rankingData = useMemo(() => {
    const statesMap: Record<string, number> = {};
    const catsMap: Record<string, number> = {};
    const supsMap: Record<string, number> = {};

    data.forEach((r) => {
      statesMap[r.State] = (statesMap[r.State] || 0) + r.Revenue_NGN;
      catsMap[r.Category] = (catsMap[r.Category] || 0) + r.Revenue_NGN;
      supsMap[r.Supplier] = (supsMap[r.Supplier] || 0) + r.Revenue_NGN;
    });

    const sortObj = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]);

    const statesSorted = sortObj(statesMap);
    const catsSorted = sortObj(catsMap);
    const supsSorted = sortObj(supsMap);

    return {
      topState: statesSorted[0] || ['N/A', 0],
      bottomState: statesSorted[statesSorted.length - 1] || ['N/A', 0],
      topCat: catsSorted[0] || ['N/A', 0],
      bottomCat: catsSorted[catsSorted.length - 1] || ['N/A', 0],
      topSup: supsSorted[0] || ['N/A', 0],
      bottomSup: supsSorted[supsSorted.length - 1] || ['N/A', 0],
    };
  }, [data]);

  // Question 3: Top drugs
  const topDrugs = useMemo(() => {
    const revMap: Record<string, number> = {};
    const volMap: Record<string, number> = {};
    data.forEach((r) => {
      revMap[r.Drug_Name] = (revMap[r.Drug_Name] || 0) + r.Revenue_NGN;
      volMap[r.Drug_Name] = (volMap[r.Drug_Name] || 0) + r.Units_Sold;
    });
    const revSorted = Object.entries(revMap).sort((a, b) => b[1] - a[1]);
    const volSorted = Object.entries(volMap).sort((a, b) => b[1] - a[1]);
    return {
      topRev: revSorted[0] || ['N/A', 0],
      topVol: volSorted[0] || ['N/A', 0],
    };
  }, [data]);

  // Question 5: Top 3 Critical Shortfalls
  const topShortfalls = useMemo(() => {
    return [...data]
      .filter((r) => r.Below_Reorder_Point)
      .sort((a, b) => b.Shortfall - a.Shortfall)
      .slice(0, 3);
  }, [data]);

  // Question 6: Batches closest to expiry
  const closestExpiry = useMemo(() => {
    return [...data].sort((a, b) => a.Expiry_Date.getTime() - b.Expiry_Date.getTime()).slice(0, 3);
  }, [data]);

  // Question 7: Storage condition breakdown
  const storageAnalysis = useMemo(() => {
    const stats: Record<string, { total: number; below: number; expCritical: number }> = {
      Ambient: { total: 0, below: 0, expCritical: 0 },
      'Cool & Dry': { total: 0, below: 0, expCritical: 0 },
      Refrigerated: { total: 0, below: 0, expCritical: 0 },
    };
    data.forEach((r) => {
      if (stats[r.Storage_Condition]) {
        stats[r.Storage_Condition].total += 1;
        if (r.Below_Reorder_Point) stats[r.Storage_Condition].below += 1;
        if (r.daysToExpiry <= 90) stats[r.Storage_Condition].expCritical += 1;
      }
    });
    return stats;
  }, [data]);

  // Question 9: Pricing by Category & Supplier
  const priceVariance = useMemo(() => {
    const catPrices: Record<string, { sum: number; count: number }> = {};
    const supPrices: Record<string, { sum: number; count: number }> = {};
    data.forEach((r) => {
      if (!catPrices[r.Category]) catPrices[r.Category] = { sum: 0, count: 0 };
      catPrices[r.Category].sum += r.Price_Per_Unit_NGN;
      catPrices[r.Category].count += 1;

      if (!supPrices[r.Supplier]) supPrices[r.Supplier] = { sum: 0, count: 0 };
      supPrices[r.Supplier].sum += r.Price_Per_Unit_NGN;
      supPrices[r.Supplier].count += 1;
    });

    const catAvg = Object.entries(catPrices)
      .map(([k, v]) => ({ name: k, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg);

    const supAvg = Object.entries(supPrices)
      .map(([k, v]) => ({ name: k, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg);

    return {
      highestCat: catAvg[0],
      lowestCat: catAvg[catAvg.length - 1],
      highestSup: supAvg[0],
      lowestSup: supAvg[supAvg.length - 1],
    };
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end transition-all">
      <div className="w-full max-w-2xl h-full bg-[#111016] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-[#17161C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-[0_0_8px_#8B5CF6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">10 Strategic Inventory Questions Answered</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Direct dynamic answers evaluated across {data.length} active records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Q1 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                1. Total Revenue & Units Sold (Overall & Filtered)
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onJumpToSection('kpi-section');
                }}
                className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View KPIs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Filtered Total Revenue is <strong className="text-white">{formatNaira(metrics.totalRevenue, 2)}</strong>{' '}
              with <strong className="text-white">{formatNumber(metrics.totalUnitsSold)} units</strong> distributed across{' '}
              <strong className="text-white">{data.length} product batches</strong>.
            </p>
          </div>

          {/* Q2 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                2. Top & Bottom Performing States, Categories, and Suppliers
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onJumpToSection('charts-section');
                }}
                className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Charts</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 space-y-1.5 text-zinc-300">
              <p>
                • <strong>States:</strong> Top is <span className="text-white font-medium">{rankingData.topState[0]}</span> ({formatNaira(rankingData.topState[1], 0)}); lowest is <span className="text-zinc-400">{rankingData.bottomState[0]}</span> ({formatNaira(rankingData.bottomState[1], 0)}).
              </p>
              <p>
                • <strong>Categories:</strong> Highest grossing is <span className="text-white font-medium">{rankingData.topCat[0]}</span> ({formatNaira(rankingData.topCat[1], 0)}); lowest is <span className="text-zinc-400">{rankingData.bottomCat[0]}</span> ({formatNaira(rankingData.bottomCat[1], 0)}).
              </p>
              <p>
                • <strong>Suppliers:</strong> Top supplier is <span className="text-white font-medium">{rankingData.topSup[0]}</span> ({formatNaira(rankingData.topSup[1], 0)}); lowest is <span className="text-zinc-400">{rankingData.bottomSup[0]}</span> ({formatNaira(rankingData.bottomSup[1], 0)}).
              </p>
            </div>
          </div>

          {/* Q3 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                3. Top Revenue & Top Volume Drugs
              </h3>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Top revenue generator is <strong className="text-white">{topDrugs.topRev[0]}</strong> with{' '}
              <strong className="text-white">{formatNaira(topDrugs.topRev[1], 0)}</strong> in sales.
              Top volume mover is <strong className="text-white">{topDrugs.topVol[0]}</strong> with{' '}
              <strong className="text-white">{formatNumber(topDrugs.topVol[1])} units sold</strong>.
            </p>
          </div>

          {/* Q4 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                4. Monthly Revenue & Volume Trend Over 2024
              </h3>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Inventory sales span continuously from Jan-2024 through Dec-2024 across all 10 state hubs. The dual-axis trajectory chart visually demonstrates volume peaks during high-demand monsoon & rainy season months (notably for Antimalarials and Rehydration).
            </p>
          </div>

          {/* Q5 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                5. SKUs Below Reorder Point & Urgent Restock Needs
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onJumpToSection('reorder-section');
                }}
                className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Alert Table</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Currently <strong className="text-purple-400">{metrics.belowReorderCount} SKUs ({formatPercent(metrics.belowReorderPercent)})</strong> are below threshold. The highest immediate supply shortfalls are:
            </p>
            <ul className="mt-1.5 space-y-1 text-zinc-300">
              {topShortfalls.map((s, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {s.Drug_Name} ({s.State} hub — {s.Supplier})
                  </span>
                  <strong className="text-purple-400">Deficit: -{s.Shortfall} units</strong>
                </li>
              ))}
            </ul>
          </div>

          {/* Q6 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                6. Batches Closest to Expiry & Storage Conditions
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onJumpToSection('expiry-section');
                }}
                className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Expiry Table</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Batches closest to expiration date require FIFO dispatch priority:
            </p>
            <ul className="mt-1.5 space-y-1 text-zinc-300">
              {closestExpiry.map((b, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {b.Drug_Name} (Batch {b.Batch_No}, {b.State})
                  </span>
                  <span className="font-mono text-purple-300">
                    {formatDate(b.Expiry_Date)} ({b.Storage_Condition})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Q7 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                7. Storage Condition vs Stock Health & Expiry Risk
              </h3>
            </div>
            <div className="mt-2 space-y-1.5 text-zinc-300">
              <p>
                • <strong>Ambient:</strong> {storageAnalysis.Ambient.total} batches ({storageAnalysis.Ambient.below} below reorder).
              </p>
              <p>
                • <strong>Cool & Dry:</strong> {storageAnalysis['Cool & Dry'].total} batches ({storageAnalysis['Cool & Dry'].below} below reorder).
              </p>
              <p>
                • <strong>Refrigerated:</strong> {storageAnalysis.Refrigerated.total} batches ({storageAnalysis.Refrigerated.below} below reorder) — cold-chain batches have strict monitoring requirements.
              </p>
            </div>
          </div>

          {/* Q8 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                8. Records Carrying a Data Quality Caveat
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onJumpToSection('quality-section');
                }}
                className="text-[10px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Quality Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Exactly <strong className="text-white">{metrics.dataQualityFlaggedCount} of {allData.length} records (21.3%)</strong> carry quality caveats: 43 rows with ambiguous slash date formats (where both day and month are ≤ 12, requiring format assumption) plus 1 extreme volume outlier (MED-143 with 99,999 units sold).
            </p>
          </div>

          {/* Q9 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                9. Average Price Per Unit & Pricing Variance
              </h3>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Filtered average unit price is <strong className="text-white">{formatNaira(metrics.averagePricePerUnit, 2)}</strong>.
              Highest priced category is <span className="text-white">{priceVariance.highestCat?.name}</span> (avg {formatNaira(priceVariance.highestCat?.avg || 0, 2)}) and lowest is <span className="text-zinc-400">{priceVariance.lowestCat?.name}</span> (avg {formatNaira(priceVariance.lowestCat?.avg || 0, 2)}).
            </p>
          </div>

          {/* Q10 */}
          <div className="p-4 rounded-xl bg-[#17161C] border border-zinc-800 hover:border-purple-600/60 transition-all shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm text-purple-300">
                10. Segment Profile in One Filtered View
              </h3>
            </div>
            <p className="mt-2 text-zinc-300 leading-relaxed">
              Clicking any bar in the State or Category charts, or selecting a filter in the sticky bar, immediately recalculates all 6 KPIs, re-ranks the charts, filters the Reorder Alert list, and updates the Expiry Risk table — giving a complete 360° profile of that segment in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
