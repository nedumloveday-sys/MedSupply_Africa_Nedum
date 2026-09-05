import React from 'react';
import { Download, Upload, RefreshCw, Sparkles, Bot } from 'lucide-react';

interface HeaderProps {
  totalRecords: number;
  filteredRecords: number;
  onOpenQuestionsDrawer: () => void;
  onOpenChatbot?: () => void;
  onExportFilteredData: () => void;
  onUploadFileClick: () => void;
  onResetToDefault: () => void;
  isCustomData?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalRecords,
  filteredRecords,
  onOpenQuestionsDrawer,
  onOpenChatbot,
  onExportFilteredData,
  onUploadFileClick,
  onResetToDefault,
  isCustomData = false,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0B0B0F] z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] shrink-0">
          <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            MedSupply Africa <span className="text-zinc-500 font-light">— Inventory Intelligence</span>
          </h1>
          <p className="text-[11px] text-zinc-500">
            Multi-state distribution operations across 10 Nigerian hubs • 12 therapeutic drug lines
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Live Connection Badge */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#17161C] border border-zinc-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_#8B5CF6]"></div>
          <span className="text-zinc-400">
            Live Connection:{' '}
            <span className="text-white font-medium">{filteredRecords}</span>
            {filteredRecords !== totalRecords && (
              <span className="text-zinc-500 font-normal"> / {totalRecords}</span>
            )}{' '}
            Records
          </span>
        </div>

        {/* 10 Business Answers */}
        <button
          onClick={onOpenQuestionsDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#17161C] hover:bg-[#212028] border border-purple-900/60 hover:border-purple-700 text-purple-400 hover:text-purple-300 font-medium transition-colors"
          title="Open 10 Core Strategic Business Answers"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>10 Key Answers</span>
        </button>

        {/* Interactive Chatbot (Light green & white) */}
        {onOpenChatbot && (
          <button
            onClick={onOpenChatbot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] active:scale-95"
            title="Ask Interactive AI Chatbot about Dashboard"
          >
            <Bot className="w-3.5 h-3.5 text-white" />
            <span>Ask AI Chat</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </button>
        )}

        {/* Load CSV / Reset */}
        {isCustomData ? (
          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#17161C] hover:bg-[#212028] border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
            title="Reset to default Cleaned_Inventory dataset"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset (207)</span>
          </button>
        ) : (
          <button
            onClick={onUploadFileClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#17161C] hover:bg-[#212028] border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
            title="Upload custom CSV or XLSX dataset"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Load CSV/XLSX</span>
          </button>
        )}

        {/* Export CSV button */}
        <button
          onClick={onExportFilteredData}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-1.5 active:scale-95"
          title="Download currently filtered records as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
    </header>
  );
};
