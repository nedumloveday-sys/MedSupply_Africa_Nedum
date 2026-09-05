import React, { useState, useMemo } from 'react';
import { AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react';
import { InventoryRecord } from '../types';
import { formatNumber, exportToCsv } from '../utils/formatters';

interface ReorderAlertPanelProps {
  records: InventoryRecord[];
  onSelectDrug: (drugName: string) => void;
}

export const ReorderAlertPanel: React.FC<ReorderAlertPanelProps> = ({ records, onSelectDrug }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'Shortfall' | 'Stock_Remaining' | 'Reorder_Point' | 'Drug_Name' | 'State'>('Shortfall');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter only below reorder point rows
  const reorderRecords = useMemo(() => {
    return records.filter((r) => r.Below_Reorder_Point);
  }, [records]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return reorderRecords;
    const q = search.toLowerCase();
    return reorderRecords.filter(
      (r) =>
        r.Product_ID.toLowerCase().includes(q) ||
        r.Drug_Name.toLowerCase().includes(q) ||
        r.State.toLowerCase().includes(q) ||
        r.Supplier.toLowerCase().includes(q)
    );
  }, [reorderRecords, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];
      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });
  }, [filtered, sortField, sortAsc]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pageRecords = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-[0_0_8px_#8B5CF6]">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Reorder Alert Panel — Immediate Restock Priority
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/50 text-purple-300 border border-purple-700/60 shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                {reorderRecords.length} Batches Critical
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Showing SKUs where Stock Remaining &lt; Reorder Point, ranked by largest deficit
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search alert items..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#1c1b22] border border-zinc-700 rounded text-zinc-300 placeholder-zinc-500 outline-none focus:border-purple-500 transition-all"
            />
          </div>
          <button
            onClick={() => exportToCsv(sorted, 'critical_reorder_alerts.csv')}
            className="px-2.5 py-1 rounded text-xs font-medium bg-[#1c1b22] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1.5 transition-all"
            title="Download alerts as CSV"
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
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('State')}
              >
                <div className="flex items-center gap-1">
                  State Hub
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th className="py-2.5 px-3">Supplier</th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('Stock_Remaining')}
              >
                <div className="flex items-center justify-end gap-1">
                  Stock Left
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('Reorder_Point')}
              >
                <div className="flex items-center justify-end gap-1">
                  Reorder Threshold
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('Shortfall')}
              >
                <div className="flex items-center justify-end gap-1 text-purple-400">
                  Deficit / Shortfall
                  <ArrowUpDown className="w-3 h-3 text-purple-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {pageRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No stock items below reorder point matching current filters.
                </td>
              </tr>
            ) : (
              pageRecords.map((r) => (
                <tr
                  key={`reorder-${r.Product_ID}-${r.Batch_No}`}
                  className="hover:bg-purple-900/10 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-purple-300">{r.Product_ID}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{r.Drug_Name}</td>
                  <td className="py-2.5 px-3">{r.State}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{r.Supplier}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-zinc-200">
                    {formatNumber(r.Stock_Remaining)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">
                    {formatNumber(r.Reorder_Point)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/70">
                      -{formatNumber(r.Shortfall)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onSelectDrug(r.Drug_Name)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1c1b22] hover:bg-zinc-800 text-purple-300 hover:text-white border border-zinc-700 transition-all"
                      title="Isolate this drug in dashboard"
                    >
                      Filter
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} critical batches
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
