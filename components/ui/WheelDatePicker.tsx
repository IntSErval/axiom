"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ITEM_H = 36;
const PAD = ITEM_H * 2; // spacers so first/last items can reach the center band

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function WheelColumn({
    options,
    index,
    onChange,
    className = "",
}: {
    options: string[];
    index: number;
    onChange: (i: number) => void;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const settle = useRef(0);

    // Keep scroll position in sync when the index changes externally (mount, day clamping)
    useEffect(() => {
        const el = ref.current;
        if (el && Math.abs(el.scrollTop - index * ITEM_H) > 1) {
            el.scrollTo({ top: index * ITEM_H });
        }
    }, [index]);

    const handleScroll = () => {
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => {
            const el = ref.current;
            if (!el) return;
            const i = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)));
            if (i !== index) onChange(i);
        }, 130);
    };

    return (
        <div
            ref={ref}
            onScroll={handleScroll}
            className={`wheel-col snap-y snap-mandatory overflow-y-auto overscroll-contain ${className}`}
            style={{ height: ITEM_H * 5 }}
        >
            <div style={{ height: PAD }} aria-hidden />
            {options.map((o, i) => (
                <button
                    type="button"
                    key={i}
                    onClick={() => onChange(i)}
                    className={`flex w-full snap-center items-center justify-center text-sm tabular-nums transition-colors duration-150 ${
                        i === index ? "text-white" : "text-white/35"
                    }`}
                    style={{ height: ITEM_H }}
                >
                    {o}
                </button>
            ))}
            <div style={{ height: PAD }} aria-hidden />
        </div>
    );
}

export function WheelSelect({
    options,
    value,
    onChange,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const index = Math.max(0, options.findIndex((o) => o.value === value));
    const selected = options[index];

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full truncate rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-left transition-transform duration-150 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    value ? "text-zinc-50" : "text-white/35"
                }`}
            >
                {selected?.label ?? "None"}
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                            className="glass absolute left-0 bottom-full z-50 mb-2 w-52 origin-bottom-left p-3"
                        >
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-xl bg-white/[0.07]" />
                                <WheelColumn
                                    options={options.map((o) => o.label)}
                                    index={index}
                                    onChange={(i) => onChange(options[i].value)}
                                />
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export function WheelDatePicker({
    value,
    onChange,
    placeholder = "No due date",
}: {
    value: string; // "" or YYYY-MM-DD
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const today = new Date();
    const parsed = value ? new Date(value + "T00:00:00") : today;
    const [year, setYear] = useState(parsed.getFullYear());
    const [month, setMonth] = useState(parsed.getMonth());
    const [day, setDay] = useState(parsed.getDate());

    const baseYear = today.getFullYear() - 1;
    const years = Array.from({ length: 7 }, (_, i) => String(baseYear + i));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    const commit = (y: number, m: number, d: number) => {
        const dd = Math.min(d, new Date(y, m + 1, 0).getDate());
        setYear(y);
        setMonth(m);
        setDay(dd);
        onChange(`${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
    };

    const openPicker = () => {
        if (!value) commit(today.getFullYear(), today.getMonth(), today.getDate());
        setOpen(true);
    };

    const label = value
        ? new Date(value + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : placeholder;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openPicker())}
                className={`w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-left transition-transform duration-150 active:scale-[0.98] focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    value ? "text-zinc-50" : "text-white/35"
                }`}
            >
                {label}
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                            className="glass absolute right-0 bottom-full z-50 mb-2 w-64 origin-bottom-right p-3"
                        >
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-xl bg-white/[0.07]" />
                                <div className="flex">
                                    <WheelColumn options={MONTHS} index={month} onChange={(i) => commit(year, i, day)} className="flex-[1.2]" />
                                    <WheelColumn options={days} index={day - 1} onChange={(i) => commit(year, month, i + 1)} className="flex-1" />
                                    <WheelColumn options={years} index={year - baseYear} onChange={(i) => commit(baseYear + i, month, day)} className="flex-1" />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange("");
                                        setOpen(false);
                                    }}
                                    className="rounded-lg px-2 py-1 text-xs text-white/45 transition-colors hover:text-white/90"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/30"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
