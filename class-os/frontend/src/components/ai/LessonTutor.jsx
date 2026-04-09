import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import Drawer from '../ui/Drawer.jsx';
import { tutorChat } from '../../api/ai.js';

export default function LessonTutor({
  lessonId,
  lessonTitle,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  presentation = 'inline',
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = typeof onOpenChange === 'function';
  const open = controlled ? Boolean(openProp) : internalOpen;
  const setOpen = (next) => {
    if (controlled) {
      onOpenChange(typeof next === 'function' ? next(open) : next);
    } else {
      setInternalOpen(next);
    }
  };
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (nextMessages) => tutorChat(lessonId, nextMessages),
    onSuccess: (data, nextMessages) => {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: data.reply },
      ]);
      setInput('');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Something went wrong.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const restartChat = () => {
    setMessages([]);
    setInput('');
    mutation.reset();
  };

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || mutation.isPending) return;
    const next = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    mutation.mutate(next);
  };

  const introLine = (
    <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500 shrink-0">
      Ask about <strong className="text-gray-700">{lessonTitle}</strong>. Answers use this lesson and your week’s other lesson titles as context.
    </div>
  );

  const messagesArea = (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      {messages.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Try: “What should I re-read about ___?” or “Explain step by step: ___”
        </p>
      )}
      {messages.map((m, i) => (
        <div
          key={i}
          className={`text-sm rounded-lg px-3 py-2 max-w-[95%] whitespace-pre-wrap ${
            m.role === 'user'
              ? 'bg-brand-600 text-white ml-auto'
              : 'bg-gray-100 text-gray-800 mr-auto'
          }`}
        >
          {m.content}
        </div>
      ))}
      {mutation.isPending && (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          Thinking…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  const inputRow = (
    <div className="p-2 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
      <input
        className="input flex-1 text-sm py-2"
        placeholder="Type a question…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
        disabled={mutation.isPending}
      />
      <button type="button" className="btn-primary text-sm py-2 px-4" onClick={send} disabled={mutation.isPending || !input.trim()}>
        Send
      </button>
    </div>
  );

  const tutorToolbar = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 bg-indigo-50/50">
      <p className="min-w-0 text-[11px] leading-snug text-gray-600">
        One chat thread per lesson — not mixed with other lessons.
      </p>
      <button
        type="button"
        onClick={restartChat}
        disabled={mutation.isPending}
        className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-800 shadow-sm hover:bg-indigo-50 disabled:opacity-50"
      >
        Restart
      </button>
    </div>
  );

  const chatBlockInline = (
    <>
      {introLine}
      {tutorToolbar}
      {messagesArea}
      {inputRow}
    </>
  );

  if (presentation === 'drawer') {
    return (
      <>
        {!hideTrigger && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-brand-50 text-left hover:shadow-sm transition-shadow"
            >
              <span className="font-semibold text-indigo-900 flex items-center gap-2">
                <span aria-hidden>🎓</span>
                Lesson tutor
                <span className="text-xs font-normal text-indigo-600/80">(scoped to this lesson)</span>
              </span>
              <span className="text-indigo-600 text-sm">{open ? '▼' : '▶'}</span>
            </button>
          </div>
        )}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Lesson tutor"
          subtitle={`Ask about “${lessonTitle}”. Uses this lesson and your week’s other lesson titles as context.`}
          tone="indigo"
          bodyClassName="overflow-hidden flex flex-col p-0"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            {tutorToolbar}
            {messagesArea}
            {inputRow}
          </div>
        </Drawer>
      </>
    );
  }

  return (
    <div className={hideTrigger ? (open ? 'mt-6' : '') : 'mt-6'}>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-brand-50 text-left hover:shadow-sm transition-shadow"
        >
          <span className="font-semibold text-indigo-900 flex items-center gap-2">
            <span aria-hidden>🎓</span>
            Lesson tutor
            <span className="text-xs font-normal text-indigo-600/80">(scoped to this lesson)</span>
          </span>
          <span className="text-indigo-600 text-sm">{open ? '▼' : '▶'}</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col max-h-[420px]">
              {chatBlockInline}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
