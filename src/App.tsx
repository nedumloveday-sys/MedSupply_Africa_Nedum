/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { INVENTORY_RAW_CSV } from './data/inventoryRawCsv';
import { parseInventoryCsv, parseXlsxFile, computeMetrics } from './data/dataParser';
import { InventoryRecord, FilterState } from './types';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { ChartsGrid } from './components/ChartsGrid';
import { ReorderAlertPanel } from './components/ReorderAlertPanel';
import { ExpiryRiskPanel } from './components/ExpiryRiskPanel';
import { DataQualityPanel } from './components/DataQualityPanel';
import { FullDataTable } from './components/FullDataTable';
import { ExecutiveQuestionsDrawer } from './components/ExecutiveQuestionsDrawer';
import { InventoryChatbot } from './components/InventoryChatbot';
import { exportToCsv } from './utils/formatters';
import { AlertCircle, FileSpreadsheet, Sparkles, RefreshCw, CheckCircle2, ChevronUp } from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  selectedStates: [],
  selectedCategories: [],
  selectedSuppliers: [],
  selectedStorage: [],
  selectedMonths: [],
  onlyBelowReorder: false,
  onlyExpiringSoon: false,
  onlyDataQualityFlagged: false,
  excludeOutliers: true, // Default to true so MED-143 typo does not skew totals
};

export default function App() {
  const [allRecords, setAllRecords] = useState<InventoryRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isQuestionsDrawerOpen, setIsQuestionsDrawerOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reorder' | 'expiry' | 'quality' | 'table'>('overview');
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial raw CSV data
  useEffect(() => {
    try {
      const parsed = parseInventoryCsv(INVENTORY_RAW_CSV);
      setAllRecords(parsed);
    } catch (err) {
      console.error('Failed to parse initial inventory data:', err);
    }
  }, []);

  // Filter options based on all loaded records
  const availableOptions = useMemo(() => {
    const states = new Set<string>();
    const categories = new Set<string>();
    const suppliers = new Set<string>();
    const storage = new Set<string>();
    const months = new Set<string>();

    allRecords.forEach((r) => {
      if (r.State) states.add(r.State);
      if (r.Category) categories.add(r.Category);
      if (r.Supplier) suppliers.add(r.Supplier);
      if (r.Storage_Condition) storage.add(r.Storage_Condition);
      if (r.Month) months.add(r.Month);
    });

    const monthOrder = [
      'Jan-2024', 'Feb-2024', 'Mar-2024', 'Apr-2024',
      'May-2024', 'Jun-2024', 'Jul-2024', 'Aug-2024',
      'Sep-2024', 'Oct-2024', 'Nov-2024', 'Dec-2024',
    ];

    return {
      states: Array.from(states).sort(),
      categories: Array.from(categories).sort(),
      suppliers: Array.from(suppliers).sort(),
      storage: Array.from(storage).sort(),
      months: monthOrder.filter((m) => months.has(m)),
    };
  }, [allRecords]);

  // Handle uploaded file (.xlsx, .xls, .csv)
  const handleFileUpload = async (file: File) => {
    setUploadStatusMessage(`Parsing ${file.name}...`);
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const parsed = parseInventoryCsv(text);
        setAllRecords(parsed);
        setUploadStatusMessage(`Successfully loaded ${parsed.length} records from ${file.name}`);
      } else {
        const parsed = await parseXlsxFile(file);
        setAllRecords(parsed);
        setUploadStatusMessage(`Successfully loaded ${parsed.length} records from ${file.name}`);
      }
      setTimeout(() => setUploadStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadStatusMessage(`Error parsing file: ${err.message || 'Invalid format'}`);
      setTimeout(() => setUploadStatusMessage(null), 5000);
    }
  };

  const handleResetToDefault = () => {
    const parsed = parseInventoryCsv(INVENTORY_RAW_CSV);
    setAllRecords(parsed);
    setFilters(INITIAL_FILTERS);
    setUploadStatusMessage('Reset to original 207-row Cleaned_Inventory dataset.');
    setTimeout(() => setUploadStatusMessage(null), 3000);
  };

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      // 1. Outlier Exclusion
      if (filters.excludeOutliers && record.isOutlier) {
        return false;
      }

      // 2. Search Query (Drug_Name, Product_ID, Batch_No, Supplier, State)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const match =
          record.Product_ID.toLowerCase().includes(query) ||
          record.Drug_Name.toLowerCase().includes(query) ||
          record.Batch_No.toLowerCase().includes(query) ||
          record.Supplier.toLowerCase().includes(query) ||
          record.State.toLowerCase().includes(query) ||
          record.Category.toLowerCase().includes(query);
        if (!match) return false;
      }

      // 3. Multi-Select States
      if (filters.selectedStates.length > 0 && !filters.selectedStates.includes(record.State)) {
        return false;
      }

      // 4. Multi-Select Categories
      if (
        filters.selectedCategories.length > 0 &&
        !filters.selectedCategories.includes(record.Category)
      ) {
        return false;
      }

      // 5. Multi-Select Suppliers
      if (
        filters.selectedSuppliers.length > 0 &&
        !filters.selectedSuppliers.includes(record.Supplier)
      ) {
        return false;
      }

      // 6. Multi-Select Storage
      if (
        filters.selectedStorage.length > 0 &&
        !filters.selectedStorage.includes(record.Storage_Condition)
      ) {
        return false;
      }

      // 7. Multi-Select Months
      if (filters.selectedMonths.length > 0 && !filters.selectedMonths.includes(record.Month)) {
        return false;
      }

      // 8. Quick Presets
      if (filters.onlyBelowReorder && !record.Below_Reorder_Point) {
        return false;
      }
      if (filters.onlyExpiringSoon && record.daysToExpiry > 90) {
        return false;
      }
      if (filters.onlyDataQualityFlagged && (!record.Data_Quality_Flag || record.Data_Quality_Flag.trim() === '')) {
        return false;
      }

      return true;
    });
  }, [allRecords, filters]);

  // Compute live KPI metrics
  const metrics = useMemo(() => {
    return computeMetrics(filteredRecords);
  }, [filteredRecords]);

  // Drill-down helpers
  const handleToggleStateFilter = (state: string) => {
    const exists = filters.selectedStates.includes(state);
    const updated = exists
      ? filters.selectedStates.filter((s) => s !== state)
      : [...filters.selectedStates, state];
    setFilters({ ...filters, selectedStates: updated });
  };

  const handleToggleCategoryFilter = (cat: string) => {
    const exists = filters.selectedCategories.includes(cat);
    const updated = exists
      ? filters.selectedCategories.filter((c) => c !== cat)
      : [...filters.selectedCategories, cat];
    setFilters({ ...filters, selectedCategories: updated });
  };

  const handleSelectDrugSearch = (drugName: string) => {
    setFilters({ ...filters, searchQuery: drugName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-neutral-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Hidden File Input for Custom Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Main App Header */}
      <Header
        totalRecords={allRecords.length}
        filteredRecords={filteredRecords.length}
        onOpenQuestionsDrawer={() => setIsQuestionsDrawerOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        onExportFilteredData={() => exportToCsv(filteredRecords, 'medsupply_filtered_inventory.csv')}
        onUploadFileClick={() => fileInputRef.current?.click()}
        onResetToDefault={handleResetToDefault}
      />

      {/* Notification / Upload Banner */}
      {uploadStatusMessage && (
        <div className="bg-[#212028] border-b border-zinc-800 px-4 py-2 text-xs text-center text-purple-300 flex items-center justify-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{uploadStatusMessage}</span>
        </div>
      )}

      {/* Outlier Caution Alert Banner */}
      <div className="bg-[#17161C] border-b border-zinc-800 px-4 sm:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-zinc-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>
            <strong>Data Integrity Safeguard:</strong> Row MED-143 records 99,999 units sold (₦10.9M) — flagged as statistical data entry typo.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={filters.excludeOutliers}
              onChange={(e) => setFilters({ ...filters, excludeOutliers: e.target.checked })}
              className="accent-purple-600 rounded bg-zinc-900 border-zinc-700"
            />
            <span className="font-semibold text-purple-400">
              {filters.excludeOutliers ? 'Excluding Outlier (Clean View)' : 'Including Outlier (Raw Total)'}
            </span>
          </label>
        </div>
      </div>

      {/* Sticky Global Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        availableStates={availableOptions.states}
        availableCategories={availableOptions.categories}
        availableSuppliers={availableOptions.suppliers}
        availableStorage={availableOptions.storage}
        availableMonths={availableOptions.months}
        totalRecords={allRecords.length}
        filteredRecords={filteredRecords.length}
      />

      {/* Section Jump Quick Navigation Bar */}
      <div className="bg-[#121118] border-b border-zinc-800 px-4 sm:px-8 py-2 overflow-x-auto">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-[10px] text-zinc-500 font-medium mr-1">Jump to:</span>
            <button
              onClick={() => jumpToSection('kpi-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              KPI Summary
            </button>
            <button
              onClick={() => jumpToSection('charts-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              Visual Analytics
            </button>
            <button
              onClick={() => jumpToSection('reorder-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              Reorder Alerts ({metrics.belowReorderCount})
            </button>
            <button
              onClick={() => jumpToSection('expiry-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              Expiry Risk ({metrics.expiring90dCount})
            </button>
            <button
              onClick={() => jumpToSection('quality-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              Quality Audit ({metrics.dataQualityFlaggedCount})
            </button>
            <button
              onClick={() => jumpToSection('table-section')}
              className="px-2.5 py-1 rounded bg-[#1c1b22] hover:border-zinc-500 hover:text-white text-zinc-300 border border-zinc-700 transition-all text-xs"
            >
              Master Table
            </button>
          </div>

          <button
            onClick={() => setIsQuestionsDrawerOpen(true)}
            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 shrink-0 shadow-[0_0_8px_#8B5CF6] transition-all text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>10 Business Questions Answered</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 sm:space-y-8">
        {/* Section 1: KPI Cards */}
        <section id="kpi-section" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
              Live Executive KPIs • Dynamic Recalculation
            </h2>
            <span className="text-[10px] text-zinc-500">
              {filteredRecords.length} batches matching active filters
            </span>
          </div>
          <KpiCards metrics={metrics} excludeOutliers={filters.excludeOutliers} />
        </section>

        {/* Section 2: Visual Charts Grid */}
        <section id="charts-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Visual Analytics & Geographic Trends
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Cross-segment revenue, monthly demand cycles, SKU concentration, and inventory health
              </p>
            </div>
          </div>
          <ChartsGrid
            data={filteredRecords}
            onSelectStateFilter={handleToggleStateFilter}
            onSelectCategoryFilter={handleToggleCategoryFilter}
            selectedState={filters.selectedStates.length === 1 ? filters.selectedStates[0] : undefined}
            selectedCategory={
              filters.selectedCategories.length === 1 ? filters.selectedCategories[0] : undefined
            }
          />
        </section>

        {/* Section 3: Reorder Alert Panel */}
        <section id="reorder-section">
          <ReorderAlertPanel records={filteredRecords} onSelectDrug={handleSelectDrugSearch} />
        </section>

        {/* Section 4: Expiry Risk Panel */}
        <section id="expiry-section">
          <ExpiryRiskPanel records={filteredRecords} onSelectDrug={handleSelectDrugSearch} />
        </section>

        {/* Section 5: Data Quality & Trust Panel */}
        <section id="quality-section">
          <DataQualityPanel records={filteredRecords} onSelectDrug={handleSelectDrugSearch} />
        </section>

        {/* Section 6: Full Data Master Table */}
        <section id="table-section">
          <FullDataTable
            records={filteredRecords}
            onSelectDrug={handleSelectDrugSearch}
            onSelectState={handleToggleStateFilter}
            onSelectCategory={handleToggleCategoryFilter}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-800 bg-[#0B0B0F] py-6 px-4 sm:px-8 text-center text-xs text-zinc-500 space-y-1">
        <p>
          <strong className="text-zinc-300">MedSupply Africa</strong> • Pharmaceutical Inventory Intelligence System • Federal Republic of Nigeria
        </p>
        <p className="text-[10px] text-zinc-500">
          Cleaned_Inventory Dataset (207 Rows) • Lagos, Abuja, Kano, Ibadan, Port Harcourt, Kaduna, Benin, Enugu, Owerri, Sokoto Hubs
        </p>
      </footer>

      {/* Executive Questions Side Drawer */}
      <ExecutiveQuestionsDrawer
        isOpen={isQuestionsDrawerOpen}
        onClose={() => setIsQuestionsDrawerOpen(false)}
        data={filteredRecords}
        allData={allRecords}
        metrics={metrics}
        onJumpToSection={jumpToSection}
      />

      {/* Interactive Inventory Chatbot (Light Green & White) */}
      <InventoryChatbot
        data={filteredRecords}
        allData={allRecords}
        metrics={metrics}
        filters={filters}
        isOpen={isChatbotOpen}
        onOpen={() => setIsChatbotOpen(true)}
        onClose={() => setIsChatbotOpen(false)}
      />
    </div>
  );
}

