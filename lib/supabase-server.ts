import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function supabaseServer() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Called from a Server Component with no ability to set cookies.
                        // Safe to ignore since middleware.ts refreshes the session on
                        // every request.
                    }
                },
            },
        }
    );
}

/**
 * Server client + the caller's identity, resolved from the JWT via getClaims()
 * — verified locally against the project JWKS (cached in-process) instead of a
 * network getUser() round-trip to the Auth server. proxy.ts still runs the
 * network-verified getUser() guard on every request, and RLS enforces per-row
 * ownership, so trusting the verified `sub` claim here adds no exposure.
 * `user` is null when unauthenticated — callers redirect / return / throw.
 *
 * ponytail: falls back to a network call automatically while the project is on
 * legacy HS256 secrets; becomes zero-network once asymmetric signing keys are on.
 */
export async function supabaseUser() {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims.sub;
    return { supabase, user: sub ? { id: sub } : null };
}

/** Same as supabaseUser() but throws when unauthenticated — for server actions. */
export async function requireUser() {
    const { supabase, user } = await supabaseUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}