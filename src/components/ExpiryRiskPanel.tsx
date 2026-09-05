import React, { useState, useMemo } from 'react';
import { Clock, ArrowUpDown, ChevronLeft, ChevronRight, Search, Download, Filter } from 'lucide-react';
import { InventoryRecord } from '../types';
import { formatDate, exportToCsv } from '../utils/formatters';

interface ExpiryRiskPanelProps {
  records: InventoryRecord[];
  onSelectDrug: (drugName: string) => void;
}

export const ExpiryRiskPanel: React.FC<ExpiryRiskPanelProps> = ({ records, onSelectDrug }) => {
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  const [sortAsc, setSortAsc] = useState(true);
  const [sortField, setSortField] = useState<'Expiry_Date' | 'Drug_Name' | 'State' | 'Storage_Condition'>('Expiry_Date');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Find dataset reference date (e.g. latest expiry date or min date)
  const maxDate = useMemo(() => {
    if (records.length === 0) return new Date(2027, 11, 29);
    const ts = records.map((r) => r.Expiry_Date.getTime()).filter((t) => !isNaN(t));
    return new Date(Math.max(...ts));
  }, [records]);

  const minDate = useMemo(() => {
    if (records.length === 0) return new Date(2025, 0, 5);
    const ts = records.map((r) => r.Expiry_Date.getTime()).filter((t) => !isNaN(t));
    return new Date(Math.min(...ts));
  }, [records]);

  // Compute records with urgency relative to earliest timeline (2025 start)
  const enhancedRecords = useMemo(() => {
    // Reference date: start of 2025 (when early batches start expiring)
    const baselineAnchor = new Date(2025, 0, 1).getTime();
    const dayMs = 1000 * 60 * 60 * 24;

    return records.map((r) => {
      const expTime = r.Expiry_Date.getTime();
      const daysFromAnchor = Math.round((expTime - baselineAnchor) / dayMs);

      // Urgency tier
      let urgencyTier: 'critical' | 'warning' | 'ok' = 'ok';
      let urgencyLabel = 'Safe / >180d';

      if (daysFromAnchor <= 30) {
        urgencyTier = 'critical';
        urgencyLabel = 'Expired risk';
      } else if (daysFromAnchor <= 90) {
        urgencyTier = 'critical';
        urgencyLabel = '<90 days';
      } else if (daysFromAnchor <= 180) {
        urgencyTier = 'warning';
        urgencyLabel = '<180 days';
      } else {
        urgencyTier = 'ok';
        urgencyLabel = 'OK (>180d)';
      }

      return {
        ...r,
        daysRemaining: daysFromAnchor,
        urgencyTier,
        urgencyLabel,
      };
    });
  }, [records]);

  // Filter
  const filtered = useMemo(() => {
    let list = enhancedRecords;
    if (urgencyFilter !== 'all') {
      list = list.filter((r) => r.urgencyTier === urgencyFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.Product_ID.toLowerCase().includes(q) ||
          r.Drug_Name.toLowerCase().includes(q) ||
          r.Batch_No.toLowerCase().includes(q) ||
          r.State.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enhancedRecords, urgencyFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortField === 'Expiry_Date') {
        const diff = a.Expiry_Date.getTime() - b.Expiry_Date.getTime();
        return sortAsc ? diff : -diff;
      }
      const vA = a[sortField];
      const vB = b[sortField];
      return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });
  }, [filtered, sortField, sortAsc]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pageRecords = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true); // default asc (soonest first)
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#212028] text-purple-400 border border-zinc-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Expiry Risk Panel — Batches Expiring Soonest
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#212028] text-purple-300 border border-zinc-700">
                Sorted Chronologically
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Inventory batches sorted by earliest expiration date (Jan 2025 to Dec 2027)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Urgency Quick Filter */}
          <div className="inline-flex rounded p-0.5 bg-[#1c1b22] border border-zinc-700 text-xs">
            <button
              onClick={() => {
                setUrgencyFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                urgencyFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setUrgencyFilter('critical');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                urgencyFilter === 'critical'
                  ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              &lt;90 Days
            </button>
            <button
              onClick={() => {
                setUrgencyFilter('warning');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                urgencyFilter === 'warning'
                  ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              &lt;180 Days
            </button>
          </div>

          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search batch or drug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#1c1b22] border border-zinc-700 rounded text-zinc-300 placeholder-zinc-500 outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <button
            onClick={() => exportToCsv(sorted, 'expiry_risk_batches.csv')}
            className="px-2.5 py-1 rounded text-xs font-medium bg-[#1c1b22] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1.5 transition-all"
            title="Download expiry risk list"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#212028] text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px] font-bold">
            <tr>
              <th className="py-2.5 px-3">Product ID</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('Drug_Name')}
              >
                <div className="flex items-center gap-1">
                  Drug Name
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Batch No</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('State')}
              >
                <div className="flex items-center gap-1">
                  Hub Location
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('Storage_Condition')}
              >
                <div className="flex items-center gap-1">
                  Storage Condition
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('Expiry_Date')}
              >
                <div className="flex items-center gap-1 text-purple-400">
                  Expiry Date
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right">Remaining Window</th>
              <th className="py-2.5 px-3 text-center">Urgency Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {pageRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No inventory records matching selected expiry criteria.
                </td>
              </tr>
            ) : (
              pageRecords.map((r) => {
                const isCritical = r.urgencyTier === 'critical';
                const isWarning = r.urgencyTier === 'warning';

                return (
                  <tr
                    key={`exp-${r.Product_ID}-${r.Batch_No}`}
                    className="hover:bg-purple-900/10 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-purple-300 font-medium">{r.Product_ID}</td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      <button
                        onClick={() => onSelectDrug(r.Drug_Name)}
                        className="hover:underline hover:text-purple-300 text-left"
                      >
                        {r.Drug_Name}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{r.Batch_No}</td>
                    <td className="py-2.5 px-3">{r.State}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-[#1c1b22] border border-zinc-700 text-zinc-300">
                        {r.Storage_Condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-purple-200">
                      {formatDate(r.Expiry_Date)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                      {r.daysRemaining > 0 ? `${r.daysRemaining} days` : 'Immediate'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isCritical ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]">
                          {r.urgencyLabel}
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 text-purple-300 border border-purple-800/70">
                          {r.urgencyLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal bg-[#1c1b22] text-zinc-400 border border-zinc-700">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} batches
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium text-zinc-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
