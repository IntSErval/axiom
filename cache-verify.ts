// Runnable verification of lib/cache.ts guarantees:
//   1. cache hits are dramatically faster than source reads
//   2. source (fetcher) load drops — called once per key per TTL window
//   3. TTL expiry repopulates from source
//   4. invalidate() forces a fresh source read
//   5. a throwing fetcher propagates and is NOT cached (no negative caching)
// Run: npx tsx cache-verify.ts
import { cached, invalidate, stats } from "./lib/cache";
import assert from "node:assert";

const SOURCE_MS = 200; // mimic the insights endpoint's 6-7 Supabase round-trips
let sourceCalls = 0;

async function source() {
    sourceCalls++;
    await new Promise((r) => setTimeout(r, SOURCE_MS));
    return { insights: sourceCalls };
}

const time = async (fn: () => Promise<unknown>) => {
    const t = performance.now();
    await fn();
    return performance.now() - t;
};

async function main() {
// 1 + 2: first call misses (slow, hits source); next 50 all hit cache (fast, no source)
const miss = await time(() => cached("insights:u1", 60_000, source));
let hitTotal = 0;
for (let i = 0; i < 50; i++) hitTotal += await time(() => cached("insights:u1", 60_000, source));
const avgHit = hitTotal / 50;

assert.strictEqual(sourceCalls, 1, "source hit exactly once for 51 reads");
assert.ok(avgHit < miss / 20, `hit (${avgHit.toFixed(3)}ms) should be <<  miss (${miss.toFixed(1)}ms)`);

// 4: invalidate forces one fresh source read
invalidate("insights:u1");
await cached("insights:u1", 60_000, source);
assert.strictEqual(sourceCalls, 2, "invalidate forced a fresh source read");

// 3: TTL expiry repopulates
await cached("insights:u2", 30, source); // sourceCalls -> 3
await new Promise((r) => setTimeout(r, 40)); // let it expire
await cached("insights:u2", 30, source); // expired -> sourceCalls -> 4
assert.strictEqual(sourceCalls, 4, "expired entry re-fetched from source");

// 5: throwing fetcher propagates and is not cached
await assert.rejects(() => cached("boom", 60_000, async () => { throw new Error("db down"); }));
let recovered = false;
await cached("boom", 60_000, async () => { recovered = true; return 1; });
assert.ok(recovered, "no negative caching — next read re-attempts source");

const s = stats();
console.log(`PASS — miss=${miss.toFixed(1)}ms  avgHit=${avgHit.toFixed(3)}ms  speedup=${(miss / avgHit).toFixed(0)}x`);
console.log(`source calls total=${sourceCalls}  cache ${s.hits} hits / ${s.misses} misses  hitRate=${(s.hitRate * 100).toFixed(1)}%`);
}

main();
