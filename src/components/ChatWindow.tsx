import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useAppStore, Message, User } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Send, User as UserIcon, ShieldAlert, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistentInput } from '../hooks/usePersistentInput';

interface ChatWindowProps {
  recipientId: string;
  onBack?: () => void;
}

export default function ChatWindow({ recipientId, onBack }: ChatWindowProps) {
  const { messages, sendMessage, markMessagesAsRead, currentUser, users, typingStatus, setTyping } = useAppStore(useShallow((state) => ({
    messages: state.messages,
    sendMessage: state.sendMessage,
    markMessagesAsRead: state.markMessagesAsRead,
    currentUser: state.currentUser,
    users: state.users,
    typingStatus: state.typingStatus,
    setTyping: state.setTyping
  })));
  const draftKey = currentUser ? `chat_draft_${currentUser.id}_${recipientId}` : '';
  const [content, setContent] = usePersistentInput(draftKey, '');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recipient = useMemo(() => users.find(u => u.id === recipientId), [users, recipientId]);

  const isRecipientTyping = typingStatus[recipientId] === currentUser?.id;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types multiline messages
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [content]);

  // Handle typing indicator
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    if (!isTypingLocal && value.trim()) {
      setIsTypingLocal(true);
      setTyping(recipientId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      setTyping(recipientId, false);
    }, 2000);
  };

  // Allow Enter to go to new line, and Ctrl+Enter or Cmd+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Filter messages for this conversation
  const chatMessages = useMemo(() => messages
    .filter(m => (m.senderId === currentUser?.id && m.receiverId === recipientId) || 
                 (m.senderId === recipientId && m.receiverId === currentUser?.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [messages, currentUser?.id, recipientId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (recipientId) {
      markMessagesAsRead(recipientId);
    }
  }, [recipientId, messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !currentUser) return;

    await sendMessage({
      senderId: currentUser.id,
      receiverId: recipientId,
      content: content.trim()
    });
    setContent('');
  };

  interface QuickReplyItem {
    label: string;
    text: string;
  }

  const quickReplies: QuickReplyItem[] = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return [
        {
          label: "📋 Verification & Tuition Setup",
          text: `Hello,\n\nTo complete your tuition setup and profile verification on EduTrack, please send us:\n\nYour preferred Tuition Days & Time\n\nA clear photo of your NID or University Student ID Card\n\nThis helps us keep the platform safe and verified for everyone. Thank you!`
        },
        {
          label: "🔍 Documents Under Review",
          text: "Hello! Your verification documents have been received and are currently under administrative review."
        },
        {
          label: "⚠️ Update Profile Bio",
          text: "Please update your profile details and documents to complete verification."
        },
        {
          label: "👋 General Admin Support",
          text: "Hello! How can EduTrack administration assist you today?"
        }
      ];
    }
    if (currentUser?.role === 'tutor') {
      return [
        { label: "Yes, I can tutor this subject.", text: "Yes, I can tutor this subject." },
        { label: "My availability is flexible. What times work for you?", text: "My availability is flexible. What times work for you?" },
        { label: "What is your budget per hour?", text: "What is your budget per hour?" },
        { label: "Sure, let's schedule a session!", text: "Sure, let's schedule a session!" }
      ];
    }
    return [
      { label: "What is your availability?", text: "What is your availability?" },
      { label: "Can you tutor this subject?", text: "Can you tutor this subject?" },
      { label: "Are you free for a session today?", text: "Are you free for a session today?" },
      { label: "What are your hourly rates?", text: "What are your hourly rates?" }
    ];
  }, [currentUser?.role]);

  const handleQuickReply = async (replyText: string) => {
    if (!currentUser) return;
    await sendMessage({
      senderId: currentUser.id,
      receiverId: recipientId,
      content: replyText
    });
  };

  if (!recipient) return null;

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
              title="Back to contacts"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          )}
          {recipient.profileImage ? (
            <img src={recipient.profileImage} alt={recipient.name} className="w-8.5 h-8.5 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8.5 h-8.5 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-[#0D5BFF] font-black italic shrink-0">
              {recipient.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-[#0B132B] truncate">
              {recipient.role === 'admin' ? 'EDUTRACK ADMIN' : recipient.name}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 tracking-wider uppercase">Secure Link Active</span>
            </div>
          </div>
        </div>
        <div className="hidden sm:block px-2.5 py-0.5 bg-blue-50 text-[8px] font-bold text-[#0D5BFF] tracking-wider rounded border border-blue-100 italic uppercase">
          Channel {recipient.id.substring(0, 8)}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4.5 lg:p-5 custom-scrollbar scroll-smooth bg-slate-50/10"
      >
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <ShieldAlert className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-black tracking-[0.2em] max-w-[200px]">
              No data packets transmitted yet. Initiate secure handshake.
            </p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full space-y-2.5 sm:space-y-3.5">
            {chatMessages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      px-4 py-2.5 rounded-[1.25rem] sm:rounded-[1.5rem] text-[13.5px] sm:text-sm font-normal leading-relaxed select-text whitespace-pre-wrap break-words text-left
                      ${isMe 
                        ? 'bg-[#0D5BFF] text-white rounded-br-[0.25rem] shadow-sm shadow-[#0D5BFF]/15' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-[#F8F9FA] rounded-bl-[0.25rem] border border-slate-200/80 dark:border-slate-700/60 shadow-xs'}
                    `}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <p className="text-[8.5px] font-medium text-slate-400/80 uppercase tracking-wider">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {isMe && (
                        <div className="flex items-center space-x-1.5 bg-slate-100/50 dark:bg-slate-800/40 px-2 py-0.5 rounded-full select-none">
                          {msg.isRead ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-[#0D5BFF]" />
                              <span className="text-[8.5px] font-bold text-[#0D5BFF] uppercase tracking-wider">Read</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">Sent</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {isRecipientTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-2 rounded-tl-none flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#0D5BFF] rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Typing</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-[#0B132B] border-t border-slate-100 dark:border-slate-800/85 flex flex-col gap-2 shadow-md">
        {/* Quick Replies section */}
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-[#0B132B]/40 dark:text-slate-400/40">
            {currentUser?.role === 'admin' ? 'Admin Quick Suggestions' : 'Suggested Replies'}
          </span>
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-none scroll-smooth">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickReply(reply.text)}
                title={reply.text}
                className="px-3 py-1 bg-slate-50 hover:bg-[#0D5BFF] hover:text-white dark:bg-slate-900/60 text-[9px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 rounded-full shadow-sm transition-all shrink-0 cursor-pointer max-w-[280px] sm:max-w-[340px] truncate"
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-end bg-slate-50 dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-[1.25rem] sm:rounded-[1.5rem] p-1.5 pr-2 pl-3 focus-within:ring-2 focus-within:ring-[#0D5BFF]/20 focus-within:border-[#0D5BFF] transition-all gap-2 w-full">
          <textarea 
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Press Enter for new line)..."
            className="flex-1 bg-transparent py-1.5 text-sm font-normal text-[#0B132B] dark:text-[#F8F9FA] placeholder-slate-400 focus:outline-none focus:ring-0 resize-none max-h-32 min-h-[36px] leading-normal custom-scrollbar"
          />
          <button 
            type="submit"
            disabled={!content.trim()}
            className="bg-[#0D5BFF] text-white h-8.5 w-8.5 rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shrink-0 cursor-pointer mb-0.5"
            title="Send message (or press Ctrl+Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
