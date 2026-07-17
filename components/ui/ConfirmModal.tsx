"use client";
import { useState } from "react";
import { GlassModal } from "./GlassModal";

export function ConfirmModal({
    open,
    onOpenChange,
    title = "Are you sure?",
    message,
    confirmLabel = "Delete",
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title?: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
}) {
    const [busy, setBusy] = useState(false);

    return (
        <GlassModal open={open} onOpenChange={onOpenChange} title={title}>
            <p className="text-sm text-white/60 mb-5">{message}</p>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-zinc-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await onConfirm();
                        } finally {
                            setBusy(false);
                            onOpenChange(false);
                        }
                    }}
                    className="px-4 py-2 rounded-xl text-sm bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50"
                >
                    {busy ? "Working..." : confirmLabel}
                </button>
            </div>
        </GlassModal>
    );
}
