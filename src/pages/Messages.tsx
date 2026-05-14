import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  Send, 
  MessageSquare, 
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  User as UserIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Messages() {
  const { currentUser, users, messages, sendMessage, markMessagesAsRead, sessions } = useAppStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUserId]);

  // Mark as read when selecting a user or when new messages arrive for the selected user
  useEffect(() => {
    if (selectedUserId && currentUser) {
      markMessagesAsRead(selectedUserId);
    }
  }, [selectedUserId, messages.length, currentUser?.id]);

  if (!currentUser) return null;

  const chatPartners = users.filter(u => {
    if (u.id === currentUser.id) return false;
    
    // Check for sessions
    const hasSession = sessions.some(s => 
      (s.studentId === currentUser.id && s.tutorId === u.id) || 
      (s.studentId === u.id && s.tutorId === currentUser.id)
    );

    // Check for message history (allows admins to connect or continued support)
    const hasHistory = messages.some(m => 
      (m.senderId === currentUser.id && m.receiverId === u.id) || 
      (m.senderId === u.id && m.receiverId === currentUser.id)
    );

    return hasSession || hasHistory;
  });
  const filteredPartners = chatPartners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedUser = users.find(u => u.id === selectedUserId);

  const conversation = messages.filter(m => 
    (m.senderId === currentUser.id && m.receiverId === selectedUserId) || 
    (m.receiverId === currentUser.id && m.senderId === selectedUserId)
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUserId) return;

    sendMessage({
      senderId: currentUser.id,
      receiverId: selectedUserId,
      content: inputText
    });
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm h-full flex overflow-hidden">
        
        {/* Sidebar / List */}
        <div className="w-full lg:w-[380px] border-r border-slate-50 flex flex-col bg-slate-50/20">
          <div className="p-10 pb-6">
            <h2 className="text-3xl font-black text-[#0B132B] uppercase italic mb-6 tracking-tight flex items-center gap-3">
              Comm Hub <Zap className="w-6 h-6 text-[#0D5BFF]" />
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH TRANSMISSIONS..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-3xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:border-[#0D5BFF] transition-all shadow-sm"
              />
              <Search className="absolute right-4 top-4 w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-2">
            {filteredPartners.map(partner => {
              const partnerMessages = messages
                .filter(m => m.participants.includes(partner.id) && m.participants.includes(currentUser.id));
              
              const lastMessage = [...partnerMessages].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              
              const unreadCount = partnerMessages.filter(m => m.receiverId === currentUser.id && !m.isRead).length;

              return (
                <button 
                  key={partner.id}
                  onClick={() => setSelectedUserId(partner.id)}
                  className={`w-full p-6 rounded-[2.5rem] transition-all flex items-center space-x-4 relative overflow-hidden group ${
                    selectedUserId === partner.id 
                    ? 'bg-[#0D5BFF] text-white shadow-xl shadow-blue-100 translate-x-2' 
                    : 'bg-transparent text-[#0B132B] hover:bg-white hover:shadow-lg'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-sm flex-shrink-0 ${
                    selectedUserId === partner.id ? 'bg-white/20' : 'bg-slate-100 text-slate-300'
                  }`}>
                    {partner.name.charAt(0)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`text-xs font-black uppercase italic truncate pr-2 ${
                        selectedUserId === partner.id ? 'text-white' : 'text-[#0B132B]'
                      }`}>
                        {partner.name}
                      </h3>
                      {lastMessage && (
                        <span className={`text-[8px] font-black uppercase opacity-50 flex-shrink-0 ${
                          selectedUserId === partner.id ? 'text-blue-100' : 'text-slate-400'
                        }`}>
                          {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[9px] font-black uppercase italic tracking-widest truncate opacity-60 flex-1 ${
                        selectedUserId === partner.id ? 'text-blue-50' : 'text-slate-400'
                      }`}>
                        {lastMessage ? (
                          <>
                            {lastMessage.senderId === currentUser.id && "YOU: "}
                            {lastMessage.content}
                          </>
                        ) : `CONNECT WITH ${partner.role.toUpperCase()}`}
                      </p>
                      {unreadCount > 0 && selectedUserId !== partner.id && (
                        <span className="bg-[#E51275] text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedUserId === partner.id && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-[3rem]"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {selectedUser ? (
            <>
              {/* Active User Header */}
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shadow-sm">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-2xl font-black italic text-slate-300 border border-slate-100">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0B132B] uppercase italic flex items-center gap-2">
                       {selectedUser.name}
                       {selectedUser.isVerified ? (
                         <ShieldCheck className="w-5 h-5 text-emerald-500" />
                       ) : (
                         <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                       )}
                    </h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Connection</p>
                    </div>
                  </div>
                </div>
                <button className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-[#0B132B] transition-colors">
                   <MoreVertical className="w-6 h-6" />
                </button>
              </div>

              {/* Messages list */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar bg-slate-50/20"
              >
                <div className="flex flex-col items-center mb-12">
                   <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-slate-50">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Encrypted Transmission Synchronized</span>
                   </div>
                </div>

                <AnimatePresence>
                  {conversation.map(msg => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md lg:max-w-2xl relative group ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`p-8 rounded-[2.5rem] shadow-sm relative z-10 transition-all ${
                            isMe 
                            ? 'bg-[#0B132B] text-white rounded-br-none shadow-blue-50/50' 
                            : 'bg-white border border-slate-100 text-[#0B132B] rounded-bl-none shadow-slate-100/50'
                          }`}>
                            <p className="text-sm font-black uppercase italic leading-relaxed tracking-tight tracking-wide">
                              {msg.content}
                            </p>
                          </div>
                          <div className={`mt-3 flex items-center space-x-3 px-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
                             <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                             {isMe && (
                               msg.isRead ? (
                                 <CheckCheck className="w-3.5 h-3.5 text-[#0D5BFF]" />
                               ) : (
                                 <Check className="w-3.5 h-3.5 text-slate-300" />
                               )
                             )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {conversation.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 select-none pointer-events-none">
                     <Zap className="w-16 h-16 text-slate-300 mb-4" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Open Data Stream</p>
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="p-10 bg-white relative z-10">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="ENTER TRANSMISSION DATA..."
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2.5rem] pl-10 pr-24 py-8 text-xs font-black uppercase italic tracking-widest text-[#0B132B] placeholder-slate-300 focus:outline-none focus:border-[#0D5BFF] transition-all shadow-inner"
                  />
                  <div className="absolute right-4 top-4 flex items-center space-x-2">
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-[#0D5BFF] text-white h-16 w-16 rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-20 bg-slate-50/10">
              <div className="w-32 h-32 bg-white rounded-[3rem] shadow-xl flex items-center justify-center mb-10 border border-slate-100">
                <MessageSquare className="w-12 h-12 text-[#0D5BFF]" />
              </div>
              <h3 className="text-3xl font-black text-[#0B132B] uppercase italic mb-4 tracking-tighter">Satellite Uplink</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] max-w-xs leading-loose">
                Select an authorized operative from the secure terminal to establish a direct communication link.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
