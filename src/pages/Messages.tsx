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
  ShieldAlert,
  Zap,
  ArrowLeft
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

  const quickReplies = React.useMemo(() => {
    if (currentUser?.role === 'tutor') {
      return [
        "Yes, I can tutor this subject.",
        "My availability is flexible. What times work for you?",
        "What is your budget per hour?",
        "Sure, let's schedule a session!"
      ];
    }
    return [
      "What is your availability?",
      "Can you tutor this subject?",
      "Are you free for a session today?",
      "What are your hourly rates?"
    ];
  }, [currentUser?.role]);

  const handleQuickReply = async (reply: string) => {
    if (!currentUser || !selectedUserId) return;
    await sendMessage({
      senderId: currentUser.id,
      receiverId: selectedUserId,
      content: reply
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="bg-white rounded-[2rem] sm:rounded-[4rem] border border-slate-100 shadow-sm h-full flex overflow-hidden">
        
        {/* Sidebar / List */}
        <div className={`w-full lg:w-[380px] border-r border-slate-50 flex flex-col bg-slate-50/20 ${selectedUserId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-6 sm:p-10 pb-4 sm:pb-6">
            <h2 className="text-xl sm:text-3xl font-black text-[#0B132B] uppercase italic mb-4 sm:mb-6 tracking-tight flex items-center gap-3">
              Comm Hub <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#0D5BFF]" />
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH TRANSMISSIONS..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-100 rounded-2xl sm:rounded-3xl px-5 sm:px-6 py-3 sm:py-4 text-[10px] font-black uppercase tracking-widest text-[#0B132B] focus:outline-none focus:border-[#0D5BFF] transition-all shadow-sm"
              />
              <Search className="absolute right-4 top-3.5 sm:top-4 w-4 h-4 text-slate-300" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 space-y-2 pb-6">
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
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-sm overflow-hidden ${
                      selectedUserId === partner.id ? 'bg-white/20' : 'bg-slate-100 text-slate-300'
                    }`}>
                      {partner.profileImage ? (
                        <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        partner.name.charAt(0)
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#E51275] text-white text-[9px] font-black h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0B132B] animate-bounce shadow-md">
                        {unreadCount}
                      </span>
                    )}
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
        <div className={`flex-1 flex flex-col bg-white overflow-hidden relative ${selectedUserId ? 'flex' : 'hidden lg:flex'}`}>
          {selectedUser ? (
            <>
              {/* Active User Header */}
              <div className="px-5 sm:px-10 py-5 sm:py-8 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shadow-sm">
                <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    type="button"
                    className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-[#0B132B] transition-colors cursor-pointer shrink-0"
                    title="Back to hubs"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center text-xl sm:text-2xl font-black italic text-slate-300 border border-slate-100 overflow-hidden shrink-0">
                    {selectedUser.profileImage ? (
                      <img src={selectedUser.profileImage} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedUser.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-xl font-black text-[#0B132B] uppercase italic flex items-center gap-1.5 sm:gap-2 truncate">
                       <span className="truncate">{selectedUser.name}</span>
                       {selectedUser.isVerified ? (
                         <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                       ) : (
                         <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse shrink-0" />
                       )}
                    </h3>
                    <div className="flex items-center space-x-2 sm:space-x-3 mt-0.5 sm:mt-1">
                      <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                      </span>
                      <p className="text-[7.5px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Connection</p>
                    </div>
                  </div>
                </div>
                <button className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-slate-300 hover:text-[#0B132B] transition-colors shrink-0">
                   <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Messages list */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 space-y-4 sm:space-y-8 custom-scrollbar bg-slate-50/20"
              >
                <div className="flex flex-col items-center mb-6 sm:mb-12">
                   <div className="bg-white px-4 sm:px-6 py-2 rounded-full shadow-sm border border-slate-50">
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-center block">Encrypted Transmission Synchronized</span>
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
                        <div className={`max-w-[85%] sm:max-w-md lg:max-w-2xl relative group ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 sm:p-6 lg:p-8 rounded-[1.6rem] sm:rounded-[2.5rem] shadow-sm relative z-10 transition-all ${
                            isMe 
                            ? 'bg-[#0B132B] text-white rounded-br-none shadow-blue-50/50' 
                            : 'bg-white border border-slate-100 text-[#0B132B] rounded-bl-none shadow-slate-100/50'
                          }`}>
                            <p className="text-xs sm:text-sm font-black uppercase italic leading-relaxed tracking-wide">
                              {msg.content}
                            </p>
                          </div>
                          <div className={`mt-2 flex items-center space-x-2 sm:space-x-3 px-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                             <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase italic tracking-widest">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                             {isMe && (
                               msg.isRead ? (
                                 <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#0D5BFF]" />
                               ) : (
                                 <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
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
              <div className="p-4 sm:p-6 lg:p-10 bg-white relative z-10 border-t border-slate-100 flex flex-col gap-4">
                {/* Quick Replies section */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#0B132B]/40">Suggested Quick Replies</span>
                  <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none scroll-smooth">
                    {quickReplies.map((replyText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickReply(replyText)}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-[#0B132B] text-[9px] font-black uppercase italic tracking-wider text-[#0B132B]/80 hover:text-white border border-slate-100 hover:border-[#0B132B] rounded-xl shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        {replyText}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSend} className="relative flex items-center bg-slate-50 border-2 border-slate-55 rounded-3xl p-2 pr-3 pl-4 sm:pl-6 shadow-inner gap-2 w-full">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="ENTER TRANSMISSION DATA..."
                    className="flex-1 bg-transparent py-3 sm:py-5 text-xs font-black uppercase italic tracking-widest text-[#0B132B] placeholder-slate-300 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-[#0D5BFF] text-white h-10 w-10 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shrink-0"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
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
