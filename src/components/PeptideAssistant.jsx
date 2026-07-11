import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore.js';
import { products } from '../data/products.js';
import { answer, SUGGESTIONS } from '../data/knowledge.js';

// ---------------------------------------------------------------------------
// <PeptideAssistant /> — a docked, expandable research assistant (bottom-right,
// like the reference chat bubble). It answers basic identity/handling/
// verification questions from a local knowledge base. It never provides dosing
// or human/animal-use guidance — those are redirected to the RUO disclaimer.
// ---------------------------------------------------------------------------

const GREETING = {
  role: 'bot',
  text: "Hi — I'm the AEGIS research assistant. Ask me what a compound is, its properties (CAS, formula, sequence), storage, or how third-party verification works. Laboratory research use only — I can't help with dosing or human/animal use.",
};

export default function PeptideAssistant() {
  const open = useStore((s) => s.assistantOpen);
  const toggle = useStore((s) => s.toggleAssistant);
  const navigate = useStore((s) => s.navigate);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = (text) => {
    const q = (text ?? input).trim();
    if (!q) return;
    const res = answer(q, products);
    setMessages((m) => [
      ...m,
      { role: 'user', text: q },
      { role: 'bot', text: res.text, productId: res.productId },
    ]);
    setInput('');
  };

  return (
    <>
      {/* Launcher bubble */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close research assistant' : 'Open research assistant'}
        className="fixed bottom-5 right-5 z-[92] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-accent-teal to-accent-blue text-ink-900 shadow-xl shadow-accent-blue/20 transition hover:scale-105"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 5h16v11H8l-4 3V5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="9" cy="10.5" r="1" fill="currentColor" />
            <circle cx="12" cy="10.5" r="1" fill="currentColor" />
            <circle cx="15" cy="10.5" r="1" fill="currentColor" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-24 right-5 z-[92] flex h-[30rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line/15 bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line/10 bg-gradient-to-r from-accent-teal/15 to-accent-blue/10 px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent-teal to-accent-blue text-sm font-bold text-ink-900">
                Æ
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-content">Research Assistant</p>
                <p className="text-[11px] text-muted">Peptide identity &amp; verification · RUO</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ' +
                      (m.role === 'user'
                        ? 'bg-accent-blue/20 text-content'
                        : 'bg-content/[0.05] text-muted')
                    }
                  >
                    {m.text}
                    {m.productId && (
                      <button
                        onClick={() => {
                          navigate('product', m.productId);
                        }}
                        className="mt-2 block text-xs font-medium text-accent-teal hover:underline"
                      >
                        View product page →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line/15 bg-content/[0.04] px-2.5 py-1 text-[11px] text-muted transition hover:border-accent-teal/40 hover:text-content"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-line/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a compound…"
                className="min-w-0 flex-1 rounded-lg border border-line/15 bg-content/[0.03] px-3 py-2 text-sm text-content outline-none placeholder:text-muted focus:border-accent-teal/50"
              />
              <button
                type="submit"
                aria-label="Send"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-content text-page transition hover:bg-content/90"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12l16-8-6 16-3-6-7-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
