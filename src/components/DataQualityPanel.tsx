import React, { useState, useMemo } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, Search, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { InventoryRecord } from '../types';
import { exportToCsv, formatDate, formatNumber } from '../utils/formatters';

interface DataQualityPanelProps {
  records: InventoryRecord[];
  onSelectDrug: (drugName: string) => void;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({ records, onSelectDrug }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'outlier' | 'date'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter only rows with non-empty Data_Quality_Flag
  const flaggedRecords = useMemo(() => {
    return records.filter((r) => r.Data_Quality_Flag && r.Data_Quality_Flag.trim() !== '');
  }, [records]);

  const filtered = useMemo(() => {
    let list = flaggedRecords;
    if (typeFilter === 'outlier') {
      list = list.filter((r) => r.isOutlier);
    } else if (typeFilter === 'date') {
      list = list.filter((r) => !r.isOutlier);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.Product_ID.toLowerCase().includes(q) ||
          r.Drug_Name.toLowerCase().includes(q) ||
          r.Data_Quality_Flag.toLowerCase().includes(q) ||
          r.rawExpiryDate.toLowerCase().includes(q)
      );
    }
    return list;
  }, [flaggedRecords, typeFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-[#17161C] rounded-xl border border-zinc-800 shadow-lg overflow-hidden transition-all">
      {/* Collapsible Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors border-b border-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#212028] text-purple-400 border border-zinc-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Data Quality & Trust Audit Panel
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#212028] text-purple-300 border border-zinc-700">
                {flaggedRecords.length} Rows Flagged (21.3%)
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Audit log of 43 assumed slash dates and 1 volume outlier (MED-143: 99,999 units) requiring source verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle panel"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Quick Filter Pills */}
            <div className="inline-flex rounded p-0.5 bg-[#1c1b22] border border-zinc-700">
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  typeFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Flags ({flaggedRecords.length})
              </button>
              <button
                onClick={() => {
                  setTypeFilter('outlier');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  typeFilter === 'outlier'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Typo Outliers (1)
              </button>
              <button
                onClick={() => {
                  setTypeFilter('date');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  typeFilter === 'date'
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_#8B5CF6]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Assumed Dates (43)
              </button>
            </div>

            {/* Search & Export */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[170px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter audit notes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1 bg-[#1c1b22] border border-zinc-700 rounded text-zinc-300 placeholder-zinc-500 text-xs outline-none focus:border-purple-500 transition-all"
                />
              </div>
              <button
                onClick={() => exportToCsv(filtered, 'data_quality_flagged_records.csv')}
                className="px-2.5 py-1 rounded text-xs font-medium bg-[#1c1b22] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1.5 transition-all"
                title="Export flagged rows for audit"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Export Flags</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#212028] text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Product ID</th>
                  <th className="py-2.5 px-3">Drug Name</th>
                  <th className="py-2.5 px-3">Raw Value</th>
                  <th className="py-2.5 px-3">Parsed Standard</th>
                  <th className="py-2.5 px-3">Quality Flag / Anomaly Note</th>
                  <th className="py-2.5 px-3 text-center">Verification Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {pageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No data quality flags match the active filter.
                    </td>
                  </tr>
                ) : (
                  pageRecords.map((r) => {
                    const isTypo = r.isOutlier;
                    return (
                      <tr
                        key={`flag-${r.Product_ID}-${r.Batch_No}`}
                        className={`transition-colors ${
                          isTypo ? 'bg-purple-900/20 font-semibold' : 'hover:bg-purple-900/10'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-purple-300 font-medium">
                          {r.Product_ID}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">
                          <button
                            onClick={() => onSelectDrug(r.Drug_Name)}
                            className="hover:underline hover:text-purple-300 text-left"
                          >
                            {r.Drug_Name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-300">
                          {isTypo ? `${formatNumber(r.Units_Sold)} units` : r.rawExpiryDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-purple-200">
                          {isTypo ? 'Pending Verification' : formatDate(r.Expiry_Date)}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            {isTypo ? (
                              <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                            )}
                            <span className={isTypo ? 'text-purple-200' : 'text-zinc-300'}>
                              {r.Data_Quality_Flag}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                              isTypo
                                ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_8px_#8B5CF6]'
                                : 'bg-[#1c1b22] text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {isTypo ? 'Check Invoice / ERP' : 'Confirm DD/MM format'}
                          </span>
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
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} flagged records
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs"
                >
                  Prev
                </button>
                <span className="px-2 text-xs font-medium text-zinc-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-[#1c1b22] border border-zinc-700 disabled:opacity-30 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
