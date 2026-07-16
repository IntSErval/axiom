"use client";
import type { ReactNode } from "react";
import { Dialog } from "radix-ui";

export function GlassModal({ open, onOpenChange, title, children }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title?: string;
    children: ReactNode;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" />
                <Dialog.Content className="glass fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 w-[min(560px,90vw)] p-6 text-zinc-50">
                    {title && <Dialog.Title className="font-serif text-xl font-bold italic mb-3">{title}</Dialog.Title>}
                    {children}
                    <Dialog.Close className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-50" aria-label="Close">✕</Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}