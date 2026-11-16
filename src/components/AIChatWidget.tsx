import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  X,
  Send,
  GraduationCap,
  AlertCircle,
  RotateCcw,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../store';
import {
  useBackHandler,
  useVirtualKeyboardOpen,
  scrollFieldIntoView,
} from '../utils/mobileWebView';

type SafeRoleContext = 'guest' | 'student' | 'guardian' | 'tutor';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SuggestedPrompt {
  label: string;
  text: string;
}

const MAX_MESSAGE_LENGTH = 1200;
const BENGALI_CHAR_REGEX = /[\u0980-\u09FF]/;
const STORAGE_PREFIX = 'edutrack_ai_chat_v1:';

const ROLE_WELCOME_MESSAGES: Record<SafeRoleContext, string> = {
  guest:
    'Hello! I am **EduTrack AI**, your EduTrack Bangladesh assistant.\n\nAsk me in **English**, **বাংলা**, or **Banglish** about finding verified tutors, One-Document verification, tuition circulars, or creating an account.',
  student:
    'Hello! I am **EduTrack AI**, your EduTrack Bangladesh assistant.\n\nI can help you filter verified tutors, post a tuition requirement, track live GPS arrival, or navigate your Student Dashboard in **English** or **বাংলা**.',
  guardian:
    'Hello! I am **EduTrack AI**, your EduTrack Bangladesh assistant.\n\nAsk me in **English** or **বাংলা** about managing multiple student profiles, tutor safety verification, live GPS session tracking, or posting a tuition circular.',
  tutor:
    'Hello! I am **EduTrack AI**, your EduTrack Bangladesh assistant.\n\nI can help with One-Document verification (**NID or Univ. / College ID**), applying to open tuition circulars, setting Weekly Availability, and logging classes.',
};

const ROLE_SUGGESTED_PROMPTS: Record<SafeRoleContext, SuggestedPrompt[]> = {
  guest: [
    {
      label: 'Find verified tutors near my area',
      text: 'How do I find verified tutors near my area on EduTrack?',
    },
    {
      label: 'How does tutor verification work?',
      text: 'How does EduTrack verify tutor identity documents and safety?',
    },
    {
      label: 'Register as a student or guardian',
      text: 'How do I sign up as a student or guardian?',
    },
    {
      label: 'বাংলায় টিউটর খোঁজা সম্পর্কে বলো',
      text: 'বাংলায় বলো কীভাবে যাচাইকৃত টিউটর খুঁজবো?',
    },
  ],
  student: [
    {
      label: 'Filter tutors by subject & salary',
      text: 'How can I filter tutors by district, subject, and expected monthly salary?',
    },
    {
      label: 'How to post a tuition circular',
      text: 'How do I post a tuition requirement in the Tuition Marketplace?',
    },
    {
      label: 'Live GPS arrival tracking',
      text: 'How does live GPS arrival tracking work during a session?',
    },
    {
      label: 'ক্লাস লগ ও হোমওয়ার্ক ড্যাশবোর্ড',
      text: 'স্টুডেন্ট ড্যাশবোর্ডে ক্লাস লগ এবং হোমওয়ার্ক কীভাবে দেখবো?',
    },
  ],
  guardian: [
    {
      label: 'Manage multiple student profiles',
      text: 'How do I manage multiple children from one guardian account?',
    },
    {
      label: 'Tutor verification & safety rules',
      text: 'How does EduTrack verify tutors and protect guardian contact privacy?',
    },
    {
      label: 'Live GPS arrival & class logs',
      text: 'How do live GPS tracking and digital class logs work for parents?',
    },
    {
      label: 'টিউশন সার্কুলার ও পেমেন্ট সম্পর্কে বলো',
      text: 'অভিভাবক হিসেবে কীভাবে টিউশন সার্কুলার পোস্ট করবো এবং ফি পরিশোধ করবো?',
    },
  ],
  tutor: [
    {
      label: 'One-Document tutor verification',
      text: 'Which identity document do I need to upload for tutor verification?',
    },
    {
      label: 'Apply to tuition circulars',
      text: 'How do I browse and apply to open tuition circulars?',
    },
    {
      label: 'Set availability & expected salary',
      text: 'How do I set my Weekly Availability calendar and expected monthly salary?',
    },
    {
      label: 'ক্লাস লগ ও বিকাশ উইথড্রয়াল',
      text: 'সেশন শেষে ক্লাস লগ আপডেট ও বিকাশে পেমেন্ট উইথড্র কীভাবে করবো?',
    },
  ],
};

const KNOWN_INTERNAL_PATHS = new Set([
  '/signup',
  '/login',
  '/reset-password',
  '/dashboard',
  '/dashboard/search',
  '/dashboard/find-students',
  '/dashboard/profile',
  '/dashboard/payments',
  '/dashboard/withdrawals',
  '/messages',
]);

function createWelcomeMessage(role: SafeRoleContext): ChatMessage {
  return {
    id: `welcome-${role}`,
    role: 'assistant',
    content: ROLE_WELCOME_MESSAGES[role],
    timestamp: new Date().toISOString(),
  };
}

function loadScopedMessages(scopeKey: string, role: SafeRoleContext): ChatMessage[] {
  if (typeof window === 'undefined') return [createWelcomeMessage(role)];
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    if (!raw) return [createWelcomeMessage(role)];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createWelcomeMessage(role)];
    }
    const valid = parsed.filter(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    );
    return valid.length > 0 ? valid : [createWelcomeMessage(role)];
  } catch {
    return [createWelcomeMessage(role)];
  }
}

function saveScopedMessages(scopeKey: string, list: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${scopeKey}`, JSON.stringify(list.slice(-30)));
  } catch {
    // Ignore storage quota errors in restricted WebViews
  }
}

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AIChatWidget() {
  const currentUser = useAppStore((state) => state.currentUser);

  const roleContext: SafeRoleContext = useMemo(() => {
    if (!currentUser) return 'guest';
    if (currentUser.role === 'tutor') return 'tutor';
    if (currentUser.role === 'student') {
      return currentUser.accountType === 'guardian' ? 'guardian' : 'student';
    }
    return 'guest';
  }, [currentUser]);

  const scopeKey = currentUser?.id ? `user:${currentUser.id}` : 'guest';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadScopedMessages(scopeKey, roleContext)
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastScopeKeyRef = useRef(scopeKey);

  const isKeyboardOpen = useVirtualKeyboardOpen();
  useBackHandler(isOpen, () => setIsOpen(false), 'edutrack-ai-chat');

  // Track browser online / offline accurately
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Poll backend AI availability cleanly so "Online" reflects real service readiness
  const checkServiceHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsServiceAvailable(false);
      return;
    }
    try {
      const res = await fetch('/api/ai/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        setIsServiceAvailable(false);
        return;
      }
      const data = await res.json().catch(() => null);
      setIsServiceAvailable(Boolean(data?.available));
    } catch {
      setIsServiceAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isBrowserOnline) {
      void checkServiceHealth();
    }
  }, [isOpen, isBrowserOnline, checkServiceHealth]);

  // Isolate chat state whenever logged-in user account changes or signs out
  useEffect(() => {
    if (lastScopeKeyRef.current !== scopeKey) {
      lastScopeKeyRef.current = scopeKey;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setError(null);
      setFailedPrompt(null);
      setInput('');
      setMessages(loadScopedMessages(scopeKey, roleContext));
    }
  }, [scopeKey, roleContext]);

  // Persist current account's conversation locally in sessionStorage
  useEffect(() => {
    saveScopedMessages(scopeKey, messages);
  }, [scopeKey, messages]);

  // Cleanup any open request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom < 56;
    isNearBottomRef.current = near;
    if (near) {
      setShowJumpToBottom(false);
    }
  }, []);

  // Auto-scroll only when user is already near bottom or just sent a message
  useEffect(() => {
    if (!isOpen) return;
    if (forceScrollRef.current || isNearBottomRef.current) {
      forceScrollRef.current = false;
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } else {
      setShowJumpToBottom(true);
    }
  }, [messages, isLoading, error, isOpen, scrollToBottom]);

  // Jump cleanly to bottom when first opening chat window
  useEffect(() => {
    if (isOpen) {
      isNearBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
  }, [isOpen, scrollToBottom]);

  // Auto-resize composer textarea cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 108);
    el.style.height = `${Math.max(nextHeight, 40)}px`;
  }, [input, isOpen]);

  const sendMessage = useCallback(
    async (rawText: string, options?: { isRetry?: boolean }) => {
      const trimmed = rawText.trim();
      if (!trimmed || isLoading) return;
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        setError(`Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsBrowserOnline(false);
        setError('Connection problem. Please check your internet connection and try again.');
        setFailedPrompt(trimmed);
        return;
      }

      setError(null);
      setFailedPrompt(null);
      forceScrollRef.current = true;

      let nextHistory: ChatMessage[] = messages;
      if (!options?.isRetry) {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };
        nextHistory = [...messages, userMsg];
        setMessages(nextHistory);
        setInput('');
      }

      setIsLoading(true);
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 24_000);

      try {
        const payloadMessages = nextHistory
          .filter((m) => !m.id.startsWith('welcome-'))
          .slice(-14)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        // Ensure at least the current user prompt is present
        const apiMessages =
          payloadMessages.length > 0
            ? payloadMessages
            : [{ role: 'user' as const, content: trimmed }];

        const res = await fetch('/api/groq/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            roleContext,
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status >= 500) {
            setIsServiceAvailable(false);
          }
          const safeErrorMsg =
            typeof data?.error === 'string' && data.error.trim().length > 0
              ? data.error.trim()
              : 'EduTrack AI could not respond right now. Please try again.';
          setError(safeErrorMsg);
          setFailedPrompt(trimmed);
          return;
        }

        const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
        if (!reply) {
          setError('Received an empty response. Please try asking again.');
          setFailedPrompt(trimmed);
          return;
        }

        setIsServiceAvailable(true);
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        if (err?.name === 'AbortError' && controller.signal.aborted) {
          // Only show timeout error if not aborted by account switch / unmount
          if (lastScopeKeyRef.current === scopeKey) {
            setError('Request timed out. Please check your connection and try again.');
            setFailedPrompt(trimmed);
          }
          return;
        }
        setError('Connection problem. Please check your internet connection and try again.');
        setFailedPrompt(trimmed);
      } finally {
        clearTimeout(timeoutId);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [isLoading, messages, roleContext, scopeKey]
  );

  const handleResetChat = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setError(null);
    setFailedPrompt(null);
    setInput('');
    const fresh = [createWelcomeMessage(roleContext)];
    setMessages(fresh);
    saveScopedMessages(scopeKey, fresh);
    isNearBottomRef.current = true;
    setShowJumpToBottom(false);
  }, [roleContext, scopeKey]);

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const renderInlineTokens = useCallback((text: string): React.ReactNode[] => {
    const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\/(?:signup|login|reset-password|dashboard(?:\/search|\/find-students|\/profile|\/payments|\/withdrawals)?|messages)\b)/g;
    const nodes: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        nodes.push(text.slice(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        nodes.push(
          <strong key={`b-${match.index}`} className="font-semibold text-[#0B132B] dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        const inner = token.slice(1, -1);
        if (KNOWN_INTERNAL_PATHS.has(inner)) {
          nodes.push(
            <Link
              key={`lnk-${match.index}`}
              to={inner}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0D5BFF] dark:text-blue-300 font-medium underline decoration-[#0D5BFF]/40 hover:decoration-[#0D5BFF] text-[0.92em]"
            >
              {inner}
            </Link>
          );
        } else {
          nodes.push(
            <code
              key={`c-${match.index}`}
              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[0.88em]"
            >
              {inner}
            </code>
          );
        }
      } else if (KNOWN_INTERNAL_PATHS.has(token)) {
        nodes.push(
          <Link
            key={`path-${match.index}`}
            to={token}
            onClick={() => setIsOpen(false)}
            className="text-[#0D5BFF] dark:text-blue-400 font-medium underline decoration-[#0D5BFF]/40 hover:decoration-[#0D5BFF]"
          >
            {token}
          </Link>
        );
      } else {
        nodes.push(token);
      }
      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      nodes.push(text.slice(lastIdx));
    }

    return nodes.length > 0 ? nodes : [text];
  }, []);

  const renderMessageContent = useCallback(
    (content: string) => {
      const blocks = content.split(/\n{2,}/);
      return blocks.map((block, blockIdx) => {
        const lines = block.split('\n').filter((line) => line.trim().length > 0);
        if (lines.length === 0) return null;

        const isBulletBlock = lines.every((l) => /^[-*•]\s+/.test(l.trim()));
        const isOrderedBlock = lines.every((l) => /^(\d+|[০-৯]+)[.)]\s+/.test(l.trim()));

        if (isBulletBlock || isOrderedBlock) {
          const ListTag = isOrderedBlock ? 'ol' : 'ul';
          return (
            <ListTag
              key={`blk-${blockIdx}`}
              className={`space-y-1.5 my-2 pl-4 ${
                isOrderedBlock ? 'list-decimal' : 'list-disc'
              }`}
            >
              {lines.map((line, idx) => {
                const cleaned = line
                  .trim()
                  .replace(/^([-*•]|(\d+|[০-৯]+)[.)])\s+/, '');
                const hasBn = BENGALI_CHAR_REGEX.test(cleaned);
                return (
                  <li
                    key={`li-${idx}`}
                    lang={hasBn ? 'bn' : undefined}
                    className={`text-[13.5px] text-slate-700 dark:text-slate-200 break-words ${
                      hasBn ? 'font-bn leading-[1.7]' : 'leading-relaxed'
                    }`}
                  >
                    {renderInlineTokens(cleaned)}
                  </li>
                );
              })}
            </ListTag>
          );
        }

        // Mixed block with normal lines and occasional bullet lines
        return (
          <div key={`blk-${blockIdx}`} className="space-y-1.5 not-last:mb-2.5">
            {lines.map((line, idx) => {
              const trimmedLine = line.trim();
              const hasBn = BENGALI_CHAR_REGEX.test(trimmedLine);
              const isBullet = /^[-*•]\s+/.test(trimmedLine);
              if (isBullet) {
                const cleaned = trimmedLine.replace(/^[-*•]\s+/, '');
                return (
                  <div
                    key={`ln-${idx}`}
                    lang={hasBn ? 'bn' : undefined}
                    className={`flex items-start gap-2 text-[13.5px] text-slate-700 dark:text-slate-200 break-words ${
                      hasBn ? 'font-bn leading-[1.7]' : 'leading-relaxed'
                    }`}
                  >
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0D5BFF] shrink-0" />
                    <span className="min-w-0 flex-1">{renderInlineTokens(cleaned)}</span>
                  </div>
                );
              }
              return (
                <p
                  key={`ln-${idx}`}
                  lang={hasBn ? 'bn' : undefined}
                  className={`text-[13.5px] text-slate-700 dark:text-slate-200 break-words ${
                    hasBn ? 'font-bn leading-[1.7]' : 'leading-relaxed'
                  }`}
                >
                  {renderInlineTokens(trimmedLine)}
                </p>
              );
            })}
          </div>
        );
      });
    },
    [renderInlineTokens]
  );

  const suggestedPrompts = ROLE_SUGGESTED_PROMPTS[roleContext];
  const showSuggestions = messages.length <= 1 && !(isKeyboardOpen && typeof window !== 'undefined' && window.innerWidth < 640);

  const isTrulyOnline = isBrowserOnline && isServiceAvailable === true;
  const statusLabel = !isBrowserOnline
    ? 'Offline'
    : isServiceAvailable === false
      ? 'Unavailable'
      : isServiceAvailable === true
        ? 'Online'
        : 'Ready';

  const statusDotClass = !isBrowserOnline
    ? 'bg-amber-500'
    : isServiceAvailable === false
      ? 'bg-slate-400'
      : isTrulyOnline
        ? 'bg-emerald-500'
        : 'bg-blue-400';

  return (
    <>
      {/* Launcher Button: hidden cleanly while chat sheet/panel is open to prevent overlapping or double close controls */}
      {!isOpen && (
        <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[9990] pb-safe font-sans antialiased">
          <button
            id="edutrack-chat-fab"
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open EduTrack AI assistant"
            className="group flex items-center gap-2.5 h-13 px-4 sm:px-4.5 rounded-full bg-[#0D5BFF] hover:bg-[#0048E5] active:scale-95 text-white border border-blue-400/30 shadow-[0_10px_28px_-6px_rgba(13,91,255,0.45)] transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D5BFF] focus-visible:ring-offset-2"
          >
            <MessageSquare className="w-5 h-5 shrink-0" />
            <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
              EduTrack AI
            </span>
          </button>
        </div>
      )}

      {/* Chat Drawer / Mobile Full-Height Sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="edutrack-chat-window"
            role="dialog"
            aria-modal="true"
            aria-label="EduTrack AI Support Assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[9999] w-full h-[100dvh] sm:w-[400px] sm:h-[min(600px,calc(100dvh-3rem))] bg-white dark:bg-[#111A2E] sm:rounded-2xl border-0 sm:border sm:border-slate-200 dark:sm:border-slate-800 sm:shadow-[0_20px_50px_-14px_rgba(11,19,43,0.28)] flex flex-col overflow-hidden font-sans antialiased"
          >
            {/* Clean SaaS Header */}
            <header className="shrink-0 bg-[#0B132B] dark:bg-[#0B132B] border-b border-slate-800/80 px-4 py-3 pt-safe flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0D5BFF] text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-tight truncate">
                      EduTrack AI
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                      <span>{statusLabel}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/90 truncate">
                    Your EduTrack Assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="New chat"
                  aria-label="Start new conversation"
                  className="min-w-[40px] min-h-[40px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  aria-label="Close EduTrack AI"
                  className="min-w-[44px] min-h-[44px] rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Single Scrollable Message Thread */}
            <div className="relative flex-1 min-h-0 flex flex-col bg-slate-50/80 dark:bg-[#0D1528]">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
              >
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const hasBn = BENGALI_CHAR_REGEX.test(msg.content);
                  const timeText = formatMessageTime(msg.timestamp);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] break-words ${
                          isUser
                            ? 'bg-[#0D5BFF] text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#18233C] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-sm shadow-xs'
                        }`}
                      >
                        {isUser ? (
                          <p
                            lang={hasBn ? 'bn' : undefined}
                            className={`whitespace-pre-wrap break-words text-white ${
                              hasBn ? 'font-bn leading-[1.7]' : 'leading-relaxed'
                            }`}
                          >
                            {msg.content}
                          </p>
                        ) : (
                          <div>{renderMessageContent(msg.content)}</div>
                        )}
                      </div>
                      {timeText && (
                        <span className="mt-1 px-1 text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                          {timeText}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex flex-col items-start" aria-live="polite">
                    <div className="bg-white dark:bg-[#18233C] border border-slate-200/80 dark:border-slate-700/80 px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs flex items-center gap-1.5">
                      <span className="sr-only">EduTrack AI is typing</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}

                {/* Non-blocking Inline Error Banner with Retry */}
                {error && (
                  <div
                    role="alert"
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed break-words">{error}</span>
                    </div>
                    {failedPrompt && (
                      <button
                        type="button"
                        onClick={() => void sendMessage(failedPrompt, { isRetry: true })}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-white dark:bg-[#18233C] border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200 font-semibold text-xs hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-colors shrink-0 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Jump to latest button when user scrolled up reading history */}
              {showJumpToBottom && (
                <button
                  type="button"
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B132B] dark:bg-slate-800 text-white text-xs font-medium shadow-md border border-slate-700 hover:bg-[#162244] transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Latest
                </button>
              )}
            </div>

            {/* Role-Aware Quick Suggestions (shown on fresh chat when mobile keyboard is closed) */}
            {showSuggestions && (
              <div className="shrink-0 bg-white dark:bg-[#111A2E] border-t border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Suggested questions
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {suggestedPrompts.map((prompt, idx) => {
                    const hasBn = BENGALI_CHAR_REGEX.test(prompt.label);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isLoading}
                        onClick={() => void sendMessage(prompt.text)}
                        lang={hasBn ? 'bn' : undefined}
                        className={`text-left px-3 py-2 min-h-[40px] rounded-xl bg-slate-50 dark:bg-[#18233C] hover:bg-blue-50/70 dark:hover:bg-[#1F2D4D] border border-slate-200/80 dark:border-slate-700/80 hover:border-[#0D5BFF]/40 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 ${
                          hasBn ? 'font-bn leading-[1.55]' : 'leading-snug'
                        }`}
                      >
                        {prompt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keyboard-Safe Composer Footer */}
            <form
              onSubmit={handleFormSubmit}
              className="shrink-0 bg-white dark:bg-[#111A2E] border-t border-slate-200 dark:border-slate-800 px-3 py-2.5 pb-safe"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  onFocus={(e) => scrollFieldIntoView(e)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Ask EduTrack AI (English or বাংলা)..."
                  aria-label="Ask EduTrack AI"
                  disabled={isLoading}
                  className="flex-1 min-w-0 resize-none max-h-[108px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#18233C] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0D5BFF] focus:ring-2 focus:ring-[#0D5BFF]/20 transition-colors overflow-y-auto"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    input.trim() && !isLoading
                      ? 'bg-[#0D5BFF] hover:bg-[#0048E5] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {input.length >= 950 && (
                <div className="mt-1 flex justify-end text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
