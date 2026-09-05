import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InventoryRecord } from '../types';
import { formatDate, formatNaira, formatNumber, exportToCsv } from '../utils/formatters';

interface FullDataTableProps {
  records: InventoryRecord[];
  onSelectDrug: (drugName: string) => void;
  onSelectState: (state: string) => void;
  onSelectCategory: (category: string) => void;
}

export const FullDataTable: React.FC<FullDataTableProps> = ({
  records,
  onSelectDrug,
  onSelectState,
  onSelectCategory,
}) => {
  const [search, setSearch] = useState('');
  const [highlightBelowReorder, setHighlightBelowReorder] = useState(true);
  const [highlightFlags, setHighlightFlags] = useState(false);
  const [sortCol, setSortCol] = useState<keyof InventoryRecord>('Product_ID');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.Product_ID.toLowerCase().includes(q) ||
        r.Drug_Name.toLowerCase().includes(q) ||
        r.Category.toLowerCase().includes(q) ||
        r.State.toLowerCase().includes(q) ||
        r.Supplier.toLowerCase().includes(q) ||
        r.Batch_No.toLowerCase().includes(q) ||
        r.Month.toLowerCase().includes(q) ||
        r.Data_Quality_Flag.toLowerCase().includes(q)
    );
  }, [records, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const vA = a[sortCol];
      const vB = b[sortCol];

      if (vA instanceof Date && vB instanceof Date) {
        return sortAsc ? vA.getTime() - vB.getTime() : vB.getTime() - vA.getTime();
      }
      if (typeof vA === 'boolean' && typeof vB === 'boolean') {
        return sortAsc ? (vA === vB ? 0 : vA ? 1 : -1) : (vA === vB ? 0 : vA ? -1 : 1);
      }
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortAsc ? vA - vB : vB - vA;
      }
      const strA = String(vA ?? '');
      const strB = String(vB ?? '');
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filtered, sortCol, sortAsc]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const pageRecords = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (col: keyof InventoryRecord) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(col === 'Units_Sold' || col === 'Revenue_NGN' ? false : true);
    }
    setCurrentPage(1);
  };

  const renderSortHeader = (title: string, col: keyof InventoryRecord, align: 'left' | 'right' | 'center' = 'left') => {
    const isActive = sortCol === col;
    return (
      <th
        onClick={() => handleSort(col)}
        className={`py-3 px-3 cursor-pointer hover:text-white transition-colors select-none text-[10px] uppercase tracking-wider font-bold ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${isActive ? 'text-purple-300' : 'text-zinc-400'}`}
      >
        <div
          className={`flex items-center gap-1 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{title}</span>
          <ArrowUpDown
            className={`w-3 h-3 ${isActive ? 'text-purple-400 font-bold' : 'text-zinc-600 hover:text-zinc-400'}`}
          />
        </div>
      </th>
    );
  };

  return (
    <div className="bg-[#17161C] rounded-xl p-4 sm:p-5 border border-zinc-800 shadow-lg space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Full Cleaned Inventory Master Table</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#212028] text-purple-300 border border-zinc-700">
              {records.length} Records in View
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Complete 16-column dataset view with live sorting, pagination, and condition highlighting
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          {/* Highlight Below Reorder Toggle */}
          <label className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 text-zinc-300 cursor-pointer hover:border-zinc-500 select-none transition-all">
            <input
              type="checkbox"
              checked={highlightBelowReorder}
              onChange={(e) => setHighlightBelowReorder(e.target.checked)}
              className="rounded accent-purple-600 text-purple-600 bg-zinc-900 border-zinc-700"
            />
            <span className="text-[11px] font-medium">Highlight Below Reorder</span>
          </label>

          {/* Highlight Flags Toggle */}
          <label className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 text-zinc-300 cursor-pointer hover:border-zinc-500 select-none transition-all">
            <input
              type="checkbox"
              checked={highlightFlags}
              onChange={(e) => setHighlightFlags(e.target.checked)}
              className="rounded accent-purple-600 text-purple-600 bg-zinc-900 border-zinc-700"
            />
            <span className="text-[11px] font-medium">Highlight Quality Flags</span>
          </label>

          {/* Table Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 bg-[#1c1b22] border border-zinc-700 rounded text-zinc-300 placeholder-zinc-500 outline-none focus:border-purple-500 text-xs transition-all"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={() => exportToCsv(sorted, 'medsupply_master_inventory.csv')}
            className="px-3 py-1 rounded text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-[0_0_8px_#8B5CF6] transition-all"
            title="Download this exact table as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800 max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-[#212028] text-zinc-400 border-b border-zinc-800 shadow-sm font-bold">
            <tr>
              {renderSortHeader('Product ID', 'Product_ID')}
              {renderSortHeader('Drug Name', 'Drug_Name')}
              {renderSortHeader('Category', 'Category')}
              {renderSortHeader('State Hub', 'State')}
              {renderSortHeader('Supplier', 'Supplier')}
              {renderSortHeader('Units Sold', 'Units_Sold', 'right')}
              {renderSortHeader('Stock Left', 'Stock_Remaining', 'right')}
              {renderSortHeader('Reorder Pt', 'Reorder_Point', 'right')}
              {renderSortHeader('Unit Price (₦)', 'Price_Per_Unit_NGN', 'right')}
              {renderSortHeader('Revenue (₦)', 'Revenue_NGN', 'right')}
              {renderSortHeader('Month', 'Month')}
              {renderSortHeader('Expiry Date', 'Expiry_Date')}
              {renderSortHeader('Batch No', 'Batch_No')}
              {renderSortHeader('Storage', 'Storage_Condition')}
              {renderSortHeader('Below Reorder?', 'Below_Reorder_Point', 'center')}
              {renderSortHeader('Data Flag', 'Data_Quality_Flag')}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {pageRecords.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-12 text-center text-zinc-500">
                  No records match your filters or search criteria.
                </td>
              </tr>
            ) : (
              pageRecords.map((r) => {
                const isBelow = r.Below_Reorder_Point;
                const hasFlag = r.Data_Quality_Flag && r.Data_Quality_Flag.trim() !== '';

                let rowBg = 'hover:bg-purple-900/10';
                if (highlightBelowReorder && isBelow) {
                  rowBg = 'bg-purple-900/20 hover:bg-purple-900/30 border-l-2 border-l-purple-500';
                } else if (highlightFlags && hasFlag) {
                  rowBg = 'bg-[#221633]/30 hover:bg-[#221633]/50 border-l-2 border-l-purple-400';
                }

                return (
                  <tr key={`full-${r.Product_ID}-${r.Batch_No}`} className={`transition-colors ${rowBg}`}>
                    <td className="py-2 px-3 font-mono font-medium text-purple-300 whitespace-nowrap">
                      {r.Product_ID}
                    </td>
                    <td className="py-2 px-3 font-medium text-white whitespace-nowrap">
                      <button
                        onClick={() => onSelectDrug(r.Drug_Name)}
                        className="hover:underline hover:text-purple-300 text-left"
                      >
                        {r.Drug_Name}
                      </button>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectCategory(r.Category)}
                        className="hover:underline hover:text-purple-300 text-left text-zinc-300"
                      >
                        {r.Category}
                      </button>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectState(r.State)}
                        className="hover:underline hover:text-purple-300 text-left"
                      >
                        {r.State}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-zinc-400 whitespace-nowrap">{r.Supplier}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-zinc-200 whitespace-nowrap">
                      {formatNumber(r.Units_Sold)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        isBelow ? 'text-purple-300' : 'text-zinc-300'
                      }`}
                    >
                      {formatNumber(r.Stock_Remaining)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-zinc-400 whitespace-nowrap">
                      {formatNumber(r.Reorder_Point)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-zinc-300 whitespace-nowrap">
                      {formatNaira(r.Price_Per_Unit_NGN, 2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-white whitespace-nowrap">
                      {formatNaira(r.Revenue_NGN, 2)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-zinc-300">{r.Month}</td>
                    <td className="py-2 px-3 font-mono whitespace-nowrap text-zinc-300">
                      {formatDate(r.Expiry_Date)}
                    </td>
                    <td className="py-2 px-3 font-mono text-zinc-400 whitespace-nowrap">{r.Batch_No}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#1c1b22] border border-zinc-700 text-zinc-300">
                        {r.Storage_Condition}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {isBelow ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white shadow-[0_0_6px_#8B5CF6]">
                          TRUE
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-[10px]">FALSE</span>
                      )}
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate text-[11px] text-zinc-400" title={r.Data_Quality_Flag}>
                      {r.Data_Quality_Flag ? (
                        <span className="text-purple-300 font-medium">{r.Data_Quality_Flag}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500 pt-1">
        <div className="flex items-center gap-3">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} total entries
          </span>
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#1c1b22] border border-zinc-700 text-zinc-300 rounded px-2 py-0.5 text-xs outline-none focus:border-purple-500"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs transition-all"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 text-xs font-semibold text-zinc-200">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs transition-all"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};
