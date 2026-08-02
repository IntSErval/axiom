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
            <p className="text-sm text-[#868da0] mb-5">{message}</p>
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#868da0] hover:text-[#d3d7e0]"
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
                    className="neu-btn px-4 py-2 rounded-[13px] text-sm font-semibold text-[#f2a86f] disabled:opacity-50"
                >
                    {busy ? "Working..." : confirmLabel}
                </button>
            </div>
        </GlassModal>
    );
}
