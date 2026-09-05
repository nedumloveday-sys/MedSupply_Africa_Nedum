import React, { useState, useRef, useEffect } from 'react';
import { Search, RotateCcw, ChevronDown, Check, X, Filter } from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableStates: string[];
  availableCategories: string[];
  availableSuppliers: string[];
  availableStorage: string[];
  availableMonths: string[];
  totalRecords: number;
  filteredRecords: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableStates,
  availableCategories,
  availableSuppliers,
  availableStorage,
  availableMonths,
  totalRecords,
  filteredRecords,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.selectedStates.length > 0 ||
    filters.selectedCategories.length > 0 ||
    filters.selectedSuppliers.length > 0 ||
    filters.selectedStorage.length > 0 ||
    filters.selectedMonths.length > 0 ||
    filters.onlyBelowReorder ||
    filters.onlyExpiringSoon ||
    filters.onlyDataQualityFlagged;

  const handleReset = () => {
    onFilterChange({
      searchQuery: '',
      selectedStates: [],
      selectedCategories: [],
      selectedSuppliers: [],
      selectedStorage: [],
      selectedMonths: [],
      onlyBelowReorder: false,
      onlyExpiringSoon: false,
      onlyDataQualityFlagged: false,
      excludeOutliers: filters.excludeOutliers, // keep user outlier preference
    });
    setOpenDropdown(null);
  };

  const toggleMultiSelect = (
    category: 'selectedStates' | 'selectedCategories' | 'selectedSuppliers' | 'selectedStorage' | 'selectedMonths',
    value: string
  ) => {
    const current = filters[category];
    const exists = current.includes(value);
    const updated = exists ? current.filter((item) => item !== value) : [...current, value];
    onFilterChange({ ...filters, [category]: updated });
  };

  const renderDropdown = (
    label: string,
    key: 'selectedStates' | 'selectedCategories' | 'selectedSuppliers' | 'selectedStorage' | 'selectedMonths',
    options: string[]
  ) => {
    const selected = filters[key];
    const isOpen = openDropdown === key;

    return (
      <div className="flex flex-col gap-1 relative text-left">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : key)}
          className={`px-2.5 py-1 text-xs rounded border outline-none transition-all flex items-center justify-between gap-1.5 min-w-[110px] ${
            selected.length > 0
              ? 'bg-[#1c1b22] border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(139,92,246,0.15)] font-medium'
              : 'bg-[#1c1b22] border-zinc-700 text-zinc-300 hover:border-zinc-500'
          }`}
        >
          <span className="truncate">
            {selected.length === 0
              ? `All ${label}s`
              : selected.length === 1
              ? selected[0]
              : `${selected.length} ${label}s`}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
              isOpen ? 'rotate-180 text-purple-400' : 'text-zinc-500'
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-[100%] mt-1 w-56 max-h-64 overflow-y-auto rounded-lg bg-[#17161C] border border-zinc-800 shadow-[0_10px_25px_rgba(0,0,0,0.8)] z-50 p-1.5 divide-y divide-zinc-800">
            <div className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider flex justify-between items-center bg-[#212028] rounded-t">
              <span>{label} Filter</span>
              {selected.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterChange({ ...filters, [key]: [] });
                  }}
                  className="text-[9px] text-zinc-400 hover:text-purple-300 underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="pt-1 space-y-0.5">
              {options.map((opt) => {
                const isChecked = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMultiSelect(key, opt)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      isChecked
                        ? 'bg-purple-900/40 text-white font-medium'
                        : 'text-zinc-300 hover:bg-purple-900/20 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-30 bg-[#111016] border-b border-zinc-800 px-6 py-3 transition-all text-xs"
    >
      <div className="max-w-[1700px] mx-auto space-y-2.5">
        {/* Main Row: Search + Structured Filter Selects + Reset */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Search box */}
          <div className="flex flex-col gap-1 flex-grow min-w-[200px]">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              Search Product / Batch / State
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="e.g. BTH-6826, Amoxicillin, Lagos..."
                value={filters.searchQuery}
                onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
                className="w-full pl-8 pr-7 py-1 bg-[#1c1b22] text-xs text-zinc-300 placeholder-zinc-500 rounded border border-zinc-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns styled like Immersive UI selects */}
          <div className="flex flex-wrap items-end gap-3">
            {renderDropdown('State', 'selectedStates', availableStates)}
            {renderDropdown('Category', 'selectedCategories', availableCategories)}
            {renderDropdown('Supplier', 'selectedSuppliers', availableSuppliers)}
            {renderDropdown('Storage', 'selectedStorage', availableStorage)}
            {renderDropdown('Month', 'selectedMonths', availableMonths)}

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-3 py-1 text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded bg-[#1c1b22] transition-all flex items-center gap-1.5 h-[28px]"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets & Active Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800 text-xs">
          {/* Quick Segment Presets */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-purple-400" />
              Presets:
            </span>
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  onlyBelowReorder: !filters.onlyBelowReorder,
                })
              }
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                filters.onlyBelowReorder
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_8px_#8B5CF6]'
                  : 'bg-[#1c1b22] text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              Critical Reorder Only
            </button>
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  onlyExpiringSoon: !filters.onlyExpiringSoon,
                })
              }
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                filters.onlyExpiringSoon
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_8px_#8B5CF6]'
                  : 'bg-[#1c1b22] text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              Expiring Window (&lt;90d)
            </button>
            <button
              onClick={() =>
                onFilterChange({
                  ...filters,
                  onlyDataQualityFlagged: !filters.onlyDataQualityFlagged,
                })
              }
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                filters.onlyDataQualityFlagged
                  ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_8px_#8B5CF6]'
                  : 'bg-[#1c1b22] text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              Quality Flagged (44)
            </button>
          </div>

          {/* Active filter summary chips */}
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-1.5">
              {filters.selectedStates.map((s) => (
                <span
                  key={`state-${s}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#17161C] text-purple-300 text-[10px] border border-purple-900/60"
                >
                  State: {s}
                  <button onClick={() => toggleMultiSelect('selectedStates', s)}>
                    <X className="w-3 h-3 hover:text-white" />
                  </button>
                </span>
              ))}
              {filters.selectedCategories.map((c) => (
                <span
                  key={`cat-${c}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#17161C] text-purple-300 text-[10px] border border-purple-900/60"
                >
                  Cat: {c}
                  <button onClick={() => toggleMultiSelect('selectedCategories', c)}>
                    <X className="w-3 h-3 hover:text-white" />
                  </button>
                </span>
              ))}
              {filters.selectedSuppliers.map((sup) => (
                <span
                  key={`sup-${sup}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#17161C] text-purple-300 text-[10px] border border-purple-900/60"
                >
                  Supplier: {sup}
                  <button onClick={() => toggleMultiSelect('selectedSuppliers', sup)}>
                    <X className="w-3 h-3 hover:text-white" />
                  </button>
                </span>
              ))}
              {filters.selectedStorage.map((st) => (
                <span
                  key={`st-${st}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#17161C] text-purple-300 text-[10px] border border-purple-900/60"
                >
                  Storage: {st}
                  <button onClick={() => toggleMultiSelect('selectedStorage', st)}>
                    <X className="w-3 h-3 hover:text-white" />
                  </button>
                </span>
              ))}
              {filters.selectedMonths.map((m) => (
                <span
                  key={`month-${m}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#17161C] text-purple-300 text-[10px] border border-purple-900/60"
                >
                  Month: {m}
                  <button onClick={() => toggleMultiSelect('selectedMonths', m)}>
                    <X className="w-3 h-3 hover:text-white" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
