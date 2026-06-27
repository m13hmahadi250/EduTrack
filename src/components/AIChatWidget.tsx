import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  User, 
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_QUESTIONS = [
  "How are tutors verified?",
  "Is it safe? (GPS tracking)",
  "How to join as a tutor?",
  "How are payments handled?"
];

function formatMessageText(text: string, isAssistant: boolean) {
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const parseInlineStyles = (rawText: string) => {
    // Escape or clean any remaining markdown artifacts if present
    let cleanText = rawText;
    const parts = cleanText.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong 
            key={index} 
            className={`font-black tracking-wide ${
              isAssistant 
                ? 'text-[#0D5BFF] dark:text-blue-400' 
                : 'text-white underline decoration-white/30'
            }`}
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const flushList = (key: number) => {
    if (currentListItems.length > 0) {
      if (listType === 'ul') {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
            {currentListItems}
          </ul>
        );
      } else if (listType === 'ol') {
        renderedElements.push(
          <ol key={`list-${key}`} className="list-decimal pl-5 my-2 space-y-1.5 leading-relaxed text-slate-700 dark:text-slate-300">
            {currentListItems}
          </ol>
        );
      }
      currentListItems = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Support horizontal rules
    if (trimmedLine === '---' || trimmedLine === '***') {
      flushList(index);
      renderedElements.push(
        <hr key={index} className="my-4 border-t border-slate-100 dark:border-slate-800" />
      );
      return;
    }

    // Support headings
    if (trimmedLine.startsWith('#')) {
      flushList(index);
      const match = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        const headingClasses = level === 1 
          ? 'text-base sm:text-lg font-black text-slate-900 dark:text-white mt-4 mb-2' 
          : level === 2
          ? 'text-sm sm:text-base font-black text-slate-900 dark:text-white mt-3.5 mb-1.5'
          : 'text-xs sm:text-sm font-extrabold text-[#0D5BFF] dark:text-blue-400 mt-3 mb-1 uppercase tracking-wider';
        
        renderedElements.push(
          <div key={index} className={headingClasses}>
            {parseInlineStyles(headingText)}
          </div>
        );
        return;
      }
    }

    // Support Unordered list items (- , * , •)
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
      if (listType !== 'ul') {
        flushList(index);
        listType = 'ul';
      }
      const itemContent = trimmedLine.replace(/^([-•*])\s+/, '');
      currentListItems.push(
        <li key={index} className="text-xs sm:text-sm">
          {parseInlineStyles(itemContent)}
        </li>
      );
    } 
    // Support Ordered list items (1. , 2. )
    else if (/^\d+\.\s+/.test(trimmedLine)) {
      if (listType !== 'ol') {
        flushList(index);
        listType = 'ol';
      }
      const itemContent = trimmedLine.replace(/^\d+\.\s+/, '');
      currentListItems.push(
        <li key={index} className="text-xs sm:text-sm">
          {parseInlineStyles(itemContent)}
        </li>
      );
    } 
    // Plain text paragraphs or spacing
    else {
      flushList(index);
      if (trimmedLine) {
        renderedElements.push(
          <p key={index} className="mb-2 last:mb-0 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {parseInlineStyles(line)}
          </p>
        );
      } else {
        renderedElements.push(<div key={`spacer-${index}`} className="h-2" />);
      }
    }
  });

  flushList(lines.length);
  return <div className="space-y-1">{renderedElements}</div>;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Assalamu Alaikum! I am your EduTrack AI assistant. Ask me anything about NID manual verification, live GPS tracking, bKash payments, or how to get started on Bangladesh's most secure tutoring platform! How can I help you today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages list updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setError(null);
    setInputValue('');

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            text: m.text
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: data.reply
        }
      ]);
    } catch (err: any) {
      console.error("[AI Chat UI Error]:", err);
      setError(err.message || "Failed to connect to the assistant.");
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: "⚠️ Sorry, I encountered an error communicating with the server. Please ensure process.env.GEMINI_API_KEY is configured correctly under Settings > Secrets."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(inputValue);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans text-left">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-4 w-[360px] sm:w-[400px] h-[550px] bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(11,19,43,0.2)] flex flex-col overflow-hidden transition-colors"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-[#0D5BFF] to-[#0A48CC] text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                  <Bot className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center space-x-1">
                    <span>EduTrack AI Guide</span>
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  </h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] text-blue-100 font-medium tracking-wide">Ready to help 24/7</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center border border-white/5 cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Chat Body Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-[#0B132B]/20">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div 
                    key={msg.id}
                    className={`flex items-start space-x-2.5 ${isAssistant ? '' : 'flex-row-reverse space-x-reverse'}`}
                  >
                    {/* Avatar icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                      isAssistant 
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50 text-[#0D5BFF]' 
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#0B132B] dark:text-slate-300'
                    }`}>
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Chat Bubble */}
                    <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-white dark:bg-[#111A2E] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 shadow-sm'
                        : 'bg-[#0D5BFF] text-white font-medium shadow-[0_4px_12px_-4px_rgba(13,91,255,0.3)]'
                    }`}>
                      {formatMessageText(msg.text, isAssistant)}
                    </div>
                  </div>
                );
              })}

              {/* Server connection error feedback inside chat */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Connection Error</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Bot typing state indicator */}
              {isLoading && (
                <div className="flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[#0D5BFF]">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800 shadow-sm px-4 py-3.5 rounded-2xl flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips footer */}
            {messages.length === 1 && !isLoading && (
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#0B132B]/10 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#111A2E] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-[#0B132B] dark:text-slate-300 rounded-xl transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:text-[#0D5BFF]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-[#111A2E] border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2.5">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask EduTrack AI assistant..."
                disabled={isLoading}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm px-4 py-3 rounded-xl border border-transparent focus:border-[#0D5BFF] focus:bg-white focus:outline-none transition-all disabled:opacity-60"
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="w-11 h-11 rounded-xl bg-[#0D5BFF] hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all text-white flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl relative cursor-pointer group select-none border border-white/10 ${
          isOpen 
            ? 'bg-[#0B132B] dark:bg-slate-800' 
            : 'bg-[#0D5BFF] hover:bg-blue-600 shadow-blue-500/30'
        }`}
      >
        <div className="absolute inset-0 bg-white/10 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        {isOpen ? (
          <X className="w-6 h-6 animate-rotate" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
}
