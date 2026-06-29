import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  { text: "How do I sign up as a tutor?", label: "Become a Tutor" },
  { text: "Is my child safe? NID Verification?", label: "Safety & Security" },
  { text: "How does live GPS tracking work?", label: "Live GPS Tracking" },
  { text: "How do payments and cash outs work?", label: "Payments & bKash" }
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am **EduTrack AI**, your friendly virtual assistant powered by **Groq LLaMA 3.3**.\n\nI can help you learn how Bangladesh's most secure home tutoring platform works. Feel free to select a suggested question below or ask me anything!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput('');
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Map existing messages to API schema
      const chatHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: chatHistory })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "I am here to help you! Let me know if you need anything else.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("[Groq Chat Error]:", err);
      setError("Unable to reach the AI assistant. Please try again or check your server configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // Helper to parse simple markdown (**bold** and \n\n) safely
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    
    // Split into paragraphs by double newlines
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, paraIdx) => {
      // Split paragraph by newline to handle bullet points and single line breaks
      const lines = para.split('\n');
      
      const parsedLines = lines.map((line, lineIdx) => {
        // Bullet points starting with "- " or "* "
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line;
        
        // Parse bold text (**text**)
        const parts = [];
        let remaining = cleanLine;
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;

        while ((match = boldRegex.exec(cleanLine)) !== null) {
          // Push text before the bold match
          if (match.index > lastIndex) {
            parts.push(cleanLine.substring(lastIndex, match.index));
          }
          // Push bolded element
          parts.push(
            <strong key={`bold-${match.index}`} className="font-bold text-slate-950 dark:text-white">
              {match[1]}
            </strong>
          );
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < cleanLine.length) {
          parts.push(cleanLine.substring(lastIndex));
        }

        const renderedLine = parts.length > 0 ? parts : cleanLine;

        if (isBullet) {
          return (
            <li key={`line-${lineIdx}`} className="ml-4 list-disc text-slate-600 dark:text-slate-300 mb-1 pl-1">
              {renderedLine}
            </li>
          );
        }

        return (
          <span key={`line-${lineIdx}`} className="block text-slate-600 dark:text-slate-300">
            {renderedLine}
          </span>
        );
      });

      const hasBullet = lines.some(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));

      if (hasBullet) {
        return (
          <ul key={`para-${paraIdx}`} className="space-y-1 my-3">
            {parsedLines}
          </ul>
        );
      }

      return (
        <p key={`para-${paraIdx}`} className="mb-3 leading-relaxed text-slate-600 dark:text-slate-300">
          {parsedLines}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
      {/* Floating Action Button (FAB) */}
      <motion.button
        id="groq-chat-fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg cursor-pointer text-white transition-all duration-300 relative focus:outline-none ${
          isOpen 
            ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-300/50' 
            : 'bg-[#0D5BFF] hover:bg-[#004BE6] shadow-blue-300/50'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat-icon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center justify-center"
            >
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0D5BFF] rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="groq-chat-window"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="absolute bottom-20 right-0 w-[380px] h-[580px] max-w-[calc(100vw-32px)] max-h-[80vh] bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0D5BFF] to-[#3B82F6] p-5 text-white flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center relative">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0D5BFF] rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                    EduTrack AI
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-100 font-medium">
                    <span>Groq LLaMA 3.3</span>
                    <span className="w-1 h-1 bg-blue-200 rounded-full" />
                    <span className="text-emerald-300">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/25">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Icon Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    m.role === 'user' 
                      ? 'bg-blue-50 text-[#0D5BFF]' 
                      : 'bg-white dark:bg-[#1C2541] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800'
                  }`}>
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1">
                    <div className={`p-4 rounded-3xl text-sm ${
                      m.role === 'user'
                        ? 'bg-[#0D5BFF] text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#1C2541] text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100/50 dark:border-slate-800 shadow-sm'
                    }`}>
                      {m.role === 'user' ? m.content : parseMarkdown(m.content)}
                    </div>
                    <span className={`block text-[9px] text-slate-400 dark:text-slate-500 ${
                      m.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Loader */}
              {isLoading && (
                <div className="flex gap-3 max-w-[80%] mr-auto">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1C2541] border border-slate-100 dark:border-slate-800 text-slate-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-[#1C2541] p-4 rounded-3xl rounded-tl-none border border-slate-100/50 dark:border-slate-800 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs rounded-2xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts Grid */}
            {messages.length === 1 && (
              <div className="p-4 bg-white dark:bg-[#0B132B] border-t border-slate-50 dark:border-slate-900 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-2 px-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0D5BFF]" />
                  Suggested Questions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt.text)}
                      className="text-left p-2.5 rounded-2xl bg-slate-50 hover:bg-[#0D5BFF]/5 dark:bg-slate-900/40 dark:hover:bg-blue-950/30 border border-slate-100 dark:border-slate-800 hover:border-[#0D5BFF]/30 transition-all text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer flex items-center justify-between group"
                    >
                      <span>{prompt.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0D5BFF] transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer Form */}
            <form 
              onSubmit={handleSubmit}
              className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0B132B] flex gap-2 items-center shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about EduTrack..."
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  input.trim() && !isLoading
                    ? 'bg-[#0D5BFF] hover:bg-[#004BE6] text-white shadow-md shadow-blue-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
