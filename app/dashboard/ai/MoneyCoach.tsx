"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, CoachContext } from "@/app/lib/ai-types";

function uid() { return Math.random().toString(36).slice(2); }

const STARTERS = [
  "Should I buy a ₹70,000 iPhone?",
  "Am I spending too much on food?",
  "How can I save ₹1 lakh this year?",
];

export default function MoneyCoach({ context }: { context: CoachContext }) {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(msg?: string) {
    const text = (msg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history, context }) });
      const data = await res.json() as { reply?: string; error?: string };
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: data.reply ?? data.error ?? "Sorry, I couldn't respond.", timestamp: Date.now() }]);
    } catch {
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "Network error. Please try again.", timestamp: Date.now() }]);
    } finally { setLoading(false); }
  }

  return (
    <>
      {/* Floating toggle */}
      <motion.button id="btn-coach-toggle" onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        className="fixed bottom-6 right-6 z-50 flex h-13 w-13 h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl shadow-[0_8px_24px_0_rgb(79_70_229/0.35)] transition hover:bg-indigo-700"
        title="AI Money Coach">
        {open ? "✕" : "💬"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div id="coach-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-48px)] max-w-sm flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_-12px_rgb(15_23_42/0.18)] sm:w-[380px]"
            style={{ maxHeight: "72vh" }}>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm">🤖</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">AI Money Coach</p>
                <p className="text-xs text-slate-400">Powered by Gemini</p>
              </div>
              <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Suggested questions:</p>
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex gap-1.5 px-1 py-2">
                  {[0,1,2].map((i) => (
                    <motion.div key={i} className="h-2 w-2 rounded-full bg-slate-300"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <input id="coach-input" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Ask anything about your finances…"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
                <button id="btn-coach-send" onClick={() => send()} disabled={loading || !input.trim()}
                  className="rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40">↑</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
