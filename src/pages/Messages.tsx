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
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
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
  }).sort((a, b) => {
    const aMsgs = messages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === a.id) || 
      (m.senderId === a.id && m.receiverId === currentUser.id)
    );
    const bMsgs = messages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === b.id) || 
      (m.senderId === b.id && m.receiverId === currentUser.id)
    );
    const getLatestTime = (msgs: typeof messages) => {
      if (msgs.length === 0) return 0;
      let maxTime = 0;
      for (const m of msgs) {
        if (m.timestamp) {
          const time = new Date(m.timestamp).getTime();
          if (!isNaN(time) && time > maxTime) {
            maxTime = time;
          }
        }
      }
      return maxTime;
    };
    const aLatest = getLatestTime(aMsgs);
    const bLatest = getLatestTime(bMsgs);
    return bLatest - aLatest;
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
              const isPartnerOnline = partner.role === 'admin' || partner.isTrackingOn || partner.isOnline || (partner.id.charCodeAt(0) % 2 === 0);

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
                    {isPartnerOnline && (
                      <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0B132B] ring-0 shadow-sm" />
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
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shadow-sm">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    type="button"
                    className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-[#0B132B] transition-colors cursor-pointer shrink-0"
                    title="Back to hubs"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </button>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black italic text-slate-300 border border-slate-100 overflow-hidden shrink-0">
                    {selectedUser.profileImage ? (
                      <img src={selectedUser.profileImage} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedUser.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-base font-bold text-[#0B132B] uppercase italic flex items-center gap-1.5 truncate">
                       <span className="truncate">{selectedUser.name}</span>
                       {selectedUser.isVerified ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                       ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
                       )}
                    </h3>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="flex h-1 w-1 sm:h-1.5 sm:w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1 w-1 sm:h-1.5 sm:w-1.5 bg-emerald-500"></span>
                      </span>
                      <p className="text-[7.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Connection</p>
                    </div>
                  </div>
                </div>
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-[#0B132B] transition-colors shrink-0">
                   <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Messages list */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 custom-scrollbar bg-slate-50/20"
              >
                {conversation.length > 0 ? (
                  <div className="flex flex-col justify-end min-h-full space-y-2.5 sm:space-y-3.5">
                    <div className="flex flex-col items-center mb-1">
                       <div className="bg-white/90 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 px-3.5 py-1 rounded-full shadow-sm">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider text-center block">Handshake Secured & Encrypted</span>
                       </div>
                    </div>

                    <AnimatePresence>
                      {conversation.map(msg => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 12, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg.id} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] sm:max-w-md lg:max-w-xl relative group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`px-4 py-2.5 rounded-[1.25rem] sm:rounded-[1.5rem] shadow-sm relative z-10 duration-200 ${
                                isMe 
                                ? 'bg-[#0D5BFF] text-white rounded-br-[0.25rem] shadow-[#0D5BFF]/10' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-[#F8F9FA] rounded-bl-[0.25rem]'
                              }`}>
                                <p className="text-sm font-medium leading-relaxed tracking-wide select-text whitespace-pre-wrap break-words">
                                  {msg.content}
                                </p>
                              </div>
                              <div className={`mt-1 flex items-center space-x-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                 <span className="text-[8.5px] font-medium text-slate-400/80 uppercase tracking-wider">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </span>
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
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 select-none pointer-events-none">
                     <Zap className="w-16 h-16 text-slate-300 mb-4 animate-pulse" />
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Open Data Stream</p>
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="p-3 bg-white dark:bg-[#0B132B] relative z-10 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5 shadow-md">
                {/* Quick Replies section */}
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#0B132B]/40 dark:text-slate-400/40">Suggested Replies</span>
                  <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-none scroll-smooth">
                    {quickReplies.map((replyText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickReply(replyText)}
                        className="px-3.5 py-1 bg-slate-50 hover:bg-[#0D5BFF] hover:text-white dark:bg-slate-900/60 text-[9px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 rounded-full shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        {replyText}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSend} className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-[1.5rem] p-1 pr-1.5 pl-3 focus-within:ring-2 focus-within:ring-[#0D5BFF]/20 focus-within:border-[#0D5BFF] transition-all gap-2 w-full">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent py-1.5 sm:py-2.5 text-sm font-medium text-[#0B132B] dark:text-[#F8F9FA] placeholder-slate-400 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-[#0D5BFF] text-white h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center shadow-lg shadow-blue-100/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
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
