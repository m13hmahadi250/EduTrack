import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, Message, User } from '../store';
import { Send, User as UserIcon, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  recipientId: string;
}

export default function ChatWindow({ recipientId }: ChatWindowProps) {
  const { messages, sendMessage, markMessagesAsRead, currentUser, users } = useAppStore();
  const [content, setContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recipient = users.find(u => u.id === recipientId);

  // Filter messages for this conversation
  const chatMessages = messages
    .filter(m => (m.senderId === currentUser?.id && m.receiverId === recipientId) || 
                 (m.senderId === recipientId && m.receiverId === currentUser?.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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

  if (!recipient) return null;

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          {recipient.profileImage ? (
            <img src={recipient.profileImage} alt={recipient.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-[#0D5BFF] font-black italic">
              {recipient.name.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="text-sm font-black text-[#0B132B] uppercase italic">{recipient.name}</h4>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secure Link Active</span>
            </div>
          </div>
        </div>
        <div className="px-3 py-1 bg-blue-50 text-[8px] font-black text-[#0D5BFF] uppercase tracking-widest rounded-lg border border-blue-100 italic">
          Channel {recipient.id.substring(0, 8)}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
      >
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <ShieldAlert className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px]">
              No data packets transmitted yet. Initiate secure handshake.
            </p>
          </div>
        )}
        
        {chatMessages.map((msg) => {
          const isMe = msg.senderId === currentUser?.id;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isMe ? 'text-right' : 'text-left'}`}>
                <div className={`
                  px-6 py-4 rounded-[1.8rem] text-sm font-medium
                  ${isMe 
                    ? 'bg-[#0B132B] text-white rounded-tr-none shadow-xl shadow-slate-200' 
                    : 'bg-slate-50 text-slate-600 rounded-tl-none border border-slate-100'}
                `}>
                  {msg.content}
                </div>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2 px-2 italic">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-slate-50/50 border-t border-slate-100">
        <div className="relative">
          <input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ENCRYPT MESSAGE CONTENT..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-6 pr-14 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:ring-2 focus:ring-[#0D5BFF] shadow-sm italic"
          />
          <button 
            type="submit"
            disabled={!content.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#0D5BFF] text-white rounded-xl shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
