import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Minimize2,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { InventoryRecord, DashboardMetrics, FilterState } from '../types';
import { answerDashboardQuestion } from '../utils/chatbotLocalEngine';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  source?: 'gemini' | 'local';
}

interface InventoryChatbotProps {
  data: InventoryRecord[];
  allData: InventoryRecord[];
  metrics: DashboardMetrics;
  filters: FilterState;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Which drug has the highest revenue?',
  'How many SKUs are below reorder point?',
  'Which batches expire within 90 days?',
  'What is the MED-143 data quality flag?',
  'Which state hub has the lowest sales?',
  'What is the total revenue and units sold?',
];

export const InventoryChatbot: React.FC<InventoryChatbotProps> = ({
  data,
  allData,
  metrics,
  filters,
  isOpen: controlledIsOpen,
  onClose,
  onOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (onOpen) onOpen();
    setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) onClose();
    setInternalIsOpen(false);
  };

  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `👋 **Hello! I'm your MedSupply Africa Inventory AI.**\n\nI can answer any questions regarding our **207 pharmaceutical batches** across **10 Nigerian state hubs**, live reorder shortfalls, expiry risks, and supplier trends.\n\nClick a suggestion below or type your question!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'local',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Prepare concise dashboard context for Gemini API
      const dashboardContext = {
        activeFilterCount: data.length,
        totalDatasetCount: allData.length,
        totalRevenue: metrics.totalRevenue,
        totalUnitsSold: metrics.totalUnitsSold,
        belowReorderCount: metrics.belowReorderCount,
        belowReorderPercent: metrics.belowReorderPercent,
        expiring90dCount: metrics.expiring90dCount,
        averagePricePerUnit: metrics.averagePricePerUnit,
        excludeOutliers: filters.excludeOutliers,
        selectedStates: filters.selectedStates,
        selectedCategories: filters.selectedCategories,
        sampleUrgentShortfalls: data
          .filter((r) => r.Below_Reorder_Point)
          .slice(0, 3)
          .map((r) => ({
            drug: r.Drug_Name,
            state: r.State,
            deficit: r.Shortfall,
            supplier: r.Supplier,
          })),
        sampleExpiringBatches: [...data]
          .sort((a, b) => a.Expiry_Date.getTime() - b.Expiry_Date.getTime())
          .slice(0, 3)
          .map((r) => ({
            drug: r.Drug_Name,
            batch: r.Batch_No,
            state: r.State,
            expiry: r.Expiry_Date.toISOString().slice(0, 10),
            daysLeft: r.daysToExpiry,
          })),
      };

      // 2. Call server endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          history: messages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text,
          })),
          dashboardContext,
        }),
      });

      let botReply = '';
      let replySource: 'gemini' | 'local' = 'gemini';

      if (response.ok) {
        const json = await response.json();
        if (json.reply && !json.fallback) {
          botReply = json.reply;
        } else {
          // Fallback to local intelligent knowledge engine
          botReply = answerDashboardQuestion(question, data, allData, metrics, filters);
          replySource = 'local';
        }
      } else {
        // Fallback to local intelligent knowledge engine
        botReply = answerDashboardQuestion(question, data, allData, metrics, filters);
        replySource = 'local';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: replySource,
        },
      ]);
    } catch (err) {
      console.warn('Chat API error, generating local answer:', err);
      const localReply = answerDashboardQuestion(question, data, allData, metrics, filters);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: localReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'local',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: `Chat cleared! Ask me anything about the **MedSupply Africa** inventory dashboard, sales metrics, or distribution hubs across Nigeria.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'local',
      },
    ]);
  };

  // Helper to render markdown bold and line breaks safely
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Split by markdown bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={lineIdx} className={line.startsWith('•') || line.startsWith('-') ? 'pl-2' : ''}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-emerald-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={pIdx} className="text-zinc-600">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Light Green and White) */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.35)] border-2 border-white transition-all transform hover:scale-105 active:scale-95 group"
          title="Open Inventory Chatbot"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-emerald-500 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">Ask Inventory AI</span>
          <span className="text-[10px] font-semibold bg-white text-emerald-700 px-2 py-0.5 rounded-full shadow-xs">
            Live
          </span>
        </button>
      )}

      {/* Chat Window (Light Green and White Theme) */}
      {isOpen && (
        <div
          className={`fixed right-4 sm:right-6 bottom-4 sm:bottom-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] bg-white rounded-2xl shadow-2xl border-2 border-emerald-300 flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized ? 'h-[62px]' : 'h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header: Light Green with White Typography */}
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between border-b border-emerald-700/30 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/40 shadow-inner">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Inventory Assistant</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 font-medium">
                  Direct Q&A on 207 Batches • Nigeria Hubs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white">
              <button
                onClick={handleResetChat}
                className="p-1 rounded hover:bg-emerald-700/60 text-white/90 hover:text-white transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-emerald-700/60 text-white/90 hover:text-white transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1 rounded hover:bg-emerald-700/60 text-white/90 hover:text-white transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Suggestion Pills (Light Green and White) */}
              <div className="bg-emerald-50/70 border-b border-emerald-100 px-3 py-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Ask:
                  </span>
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      disabled={isLoading}
                      className="px-2.5 py-0.5 rounded-full bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-medium shadow-xs transition-colors shrink-0 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Container (Crisp White and Light Green) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FCFA]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${
                      m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                        m.sender === 'user'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white border border-emerald-300 text-emerald-600 shadow-xs'
                      }`}
                    >
                      {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[82%] text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-sm'
                          : 'bg-white text-zinc-800 border border-emerald-200/90 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">{renderMessageText(m.text)}</div>
                      <div
                        className={`flex items-center justify-between gap-2 mt-1.5 pt-1 text-[10px] ${
                          m.sender === 'user'
                            ? 'text-emerald-100 border-t border-emerald-400/40'
                            : 'text-emerald-700/60 border-t border-emerald-100'
                        }`}
                      >
                        <span>{m.timestamp}</span>
                        {m.sender === 'bot' && (
                          <span className="font-medium text-emerald-600 text-[9px] uppercase tracking-wider">
                            {m.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Inventory Engine'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-600 flex items-center justify-center shadow-xs">
                      <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs shadow-xs flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="text-[11px] font-medium text-emerald-800 ml-1.5">
                        Evaluating inventory data...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Light Green and White) */}
              <div className="p-3 bg-white border-t border-emerald-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about revenue, stockouts, expiry, state hubs..."
                    disabled={isLoading}
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/60 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all flex items-center justify-center shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-700/70 px-1">
                  <span>Dynamic answers synced with active dashboard filters</span>
                  <span className="font-semibold text-emerald-700">Nigeria MedSupply AI</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
