'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export function ChatPanel() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const openerFetched = useRef(false);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    useEffect(() => {
        const openCoach = () => setOpen(true);
        window.addEventListener('axiom:open-coach', openCoach);
        return () => window.removeEventListener('axiom:open-coach', openCoach);
    }, []);

    useEffect(() => {
        if (!open || messages.length > 0 || openerFetched.current) return;
        openerFetched.current = true;
        setLoading(true);

        (async () => {
            try {
                const res = await fetch('/api/nim/coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: [] }),
                });
                const { reply } = await res.json() as { reply: string };
                setMessages(prev => (prev.length > 0 ? prev : [{ role: 'assistant', content: reply }]));
            } catch {
                // ponytail: opener is a nicety — silently skip on failure, the empty-state copy still shows
            } finally {
                setLoading(false);
            }
        })();
    }, [open, messages.length]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(next);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/nim/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: next }),
            });
            const { reply } = await res.json() as { reply: string };
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — try again.' }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.2 }}
                        className="glass w-[min(400px,calc(100vw-3rem))] h-[560px] max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                            <span className="font-semibold text-[#6fd6c3] text-sm tracking-wide">AXIOM Coach</span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close chat"
                                className="text-[#868da0] hover:text-[#d3d7e0] transition-colors text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && !loading && (
                                <p className="text-[#868da0] italic text-sm text-center mt-8">
                                    Ask your coach anything — it can see your tasks, habits, finances, and goals.
                                </p>
                            )}
                            {messages.map((msg, i) =>
                                msg.role === 'user' ? (
                                    <div key={i} className="flex justify-end">
                                        <span className="neu-inset rounded-2xl rounded-br-sm px-4 py-2 text-[#d3d7e0] text-sm max-w-[85%]">
                                            {msg.content}
                                        </span>
                                    </div>
                                ) : (
                                    <div key={i} className="flex justify-start">
                                        <span className="rounded-2xl rounded-bl-sm px-4 py-2 text-[#d3d7e0] text-sm max-w-[85%] [background:linear-gradient(145deg,#2a2e36,#22252a)] [box-shadow:-4px_-4px_10px_rgba(255,255,255,0.05),6px_6px_14px_rgba(0,0,0,0.5)]">
                                            {msg.content}
                                        </span>
                                    </div>
                                )
                            )}
                            {loading && (
                                <div className="flex justify-start">
                                    <span className="text-[#6fd6c3] italic text-sm animate-pulse px-1">Thinking…</span>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} className="border-t border-white/[0.06] p-3 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                aria-label="Chat message"
                                placeholder="Ask your coach…"
                                className="flex-1 neu-inset border-none rounded-xl px-3 py-2 text-[#d3d7e0] text-sm placeholder:text-[#5c6270] focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="neu-btn px-3 py-2 rounded-xl text-[#6fd6c3] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ↑
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle button */}
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label="Open coach chat"
                className="neu-btn h-14 w-14 rounded-full text-[#6fd6c3] flex items-center justify-center text-xl"
            >
                ✦
            </button>
        </div>
    );
}
