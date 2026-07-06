'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabaseBrowser } from '@/lib/supabase';

type Mode = 'sign_in' | 'sign_up';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>('sign_in');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatus(null);
        setLoading(true);

        const supabase = supabaseBrowser();

        if (mode === 'sign_in') {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                setError(signInError.message);
                setLoading(false);
                return;
            }

            router.push('/dashboard');
            router.refresh();
            return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setLoading(false);

        if (signUpError) {
            setError(signUpError.message);
            return;
        }

        setStatus('Check your email to confirm your account before signing in.');
    };

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-screen w-full items-center justify-center bg-[#080810] px-6"
        >
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl">
                <h1 className="font-serif text-2xl font-bold italic tracking-tight text-white/90">
                    AXIOM
                </h1>
                <p className="mt-1 font-serif italic text-sm text-white/50">
                    {mode === 'sign_in' ? 'Welcome back.' : 'Create your account.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs uppercase tracking-wide text-white/40">
                            Email
                        </span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white/90 outline-none transition-colors duration-150 focus:border-[#3b82f6]/60"
                            autoComplete="email"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs uppercase tracking-wide text-white/40">
                            Password
                        </span>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white/90 outline-none transition-colors duration-150 focus:border-[#3b82f6]/60"
                            autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                        />
                    </label>

                    {error && (
                        <p className="text-sm text-red-400/90" role="alert">
                            {error}
                        </p>
                    )}
                    {status && (
                        <p className="text-sm text-[#22c55e]/90" role="status">
                            {status}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 rounded-xl bg-[#3b82f6] px-4 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading
                            ? 'Please wait…'
                            : mode === 'sign_in'
                                ? 'Sign in'
                                : 'Sign up'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => {
                        setMode((m) => (m === 'sign_in' ? 'sign_up' : 'sign_in'));
                        setError(null);
                        setStatus(null);
                    }}
                    className="mt-6 w-full text-center text-sm text-white/50 transition-colors duration-150 hover:text-white/80"
                >
                    {mode === 'sign_in'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                </button>
            </div>
        </motion.main>
    );
}
