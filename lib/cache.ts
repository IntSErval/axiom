// In-memory TTL cache for hot, slow-to-fetch reads (e.g. the insights endpoint,
// which fans out to 6-7 Supabase queries per call and is re-fetched on every
// dashboard mount). Per-process only — resets on redeploy/restart, not shared
// across serverless instances. That's fine here: entries are cheap to rebuild
// and TTL-bounded, so a cold instance just repopulates from source.

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

// Observability so we can prove hit-rate / source-load drop. Read via stats().
let hits = 0;
let misses = 0;

/**
 * Safe get-or-populate. On a live hit returns the cached value; on miss or
 * expiry it calls `fetcher`, stores the result under `key` for `ttlMs`, and
 * returns it. Any cache-internal failure falls through to `fetcher` so a broken
 * cache degrades to a direct source read rather than an outage. A throwing
 * `fetcher` propagates and is NOT cached (no negative caching).
 */
export async function cached<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>
): Promise<T> {
    try {
        const hit = store.get(key);
        if (hit && hit.expires > Date.now()) {
            hits++;
            return hit.value as T;
        }
    } catch {
        // Cache read blew up — fall back to source below.
    }

    misses++;
    const value = await fetcher(); // throws propagate; nothing cached on failure

    try {
        store.set(key, { value, expires: Date.now() + ttlMs });
    } catch {
        // Cache write blew up — caller still gets a correct value from source.
    }
    return value;
}

/** Drop one key. Call after a write to reflect it before the TTL elapses. */
export function invalidate(key: string): void {
    store.delete(key);
}

/** Drop every key beginning with `prefix` (e.g. a whole domain for a user). */
export function invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}

/** Hit/miss counters + live size — for verifying the cache actually helps. */
export function stats() {
    const total = hits + misses;
    return { hits, misses, size: store.size, hitRate: total ? hits / total : 0 };
}

// ponytail: no eviction beyond lazy TTL expiry — bounded by active-user count,
// fine for a personal app. Add an LRU cap here if the key space ever grows big.
