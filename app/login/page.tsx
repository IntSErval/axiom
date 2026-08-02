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

    const inputCls =
        "neu-inset rounded-[14px] border-none px-4 py-3 text-sm text-[#d3d7e0] outline-none";

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-screen w-full items-center justify-center bg-[#26292f] px-6"
        >
            <div className="glass w-full max-w-sm p-9">
                <h1 className="text-2xl font-bold italic tracking-[0.14em] text-[#eceef3]">
                    AXIOM
                </h1>
                <p className="mt-1.5 text-sm italic text-[#868da0]">
                    {mode === 'sign_in' ? 'Welcome back.' : 'Create your account.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#868da0]">
                            Email
                        </span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputCls}
                            autoComplete="email"
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#868da0]">
                            Password
                        </span>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={inputCls}
                            autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
                        />
                    </label>

                    {error && (
                        <p className="text-sm text-[#f2a86f]" role="alert">
                            {error}
                        </p>
                    )}
                    {status && (
                        <p className="text-sm text-[#6fd6c3]" role="status">
                            {status}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="neu-btn mt-2 rounded-[15px] px-4 py-3 text-sm font-semibold text-[#6fd6c3] disabled:opacity-50"
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
                    className="mt-6 w-full text-center text-sm text-[#868da0] transition-colors duration-150 hover:text-[#d3d7e0]"
                >
                    {mode === 'sign_in'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                </button>
            </div>
        </motion.main>
    );
}
