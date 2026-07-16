"use client";
import { useEffect, useRef } from "react";

// Interactive particle-brain canvas, ported from the Productivity Dashboard claude.ai/design project.
// Decorative only — respects prefers-reduced-motion (calm mode: gentle wobble, no cursor repulsion).

type Pt = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; ph: number; sp: number; sz: number; o: number; hueOff: number };

const PAD = 80;

export function ParticleBrain({ particleCount = 650, hue = 215 }: { particleCount?: number; hue?: number }) {
    const zoneRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const zone = zoneRef.current;
        const canvas = canvasRef.current;
        if (!zone || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const st = { pts: [] as Pt[], links: [] as [number, number][], maxD: 0, mx: -9999, my: -9999, t: 0, W: 0, H: 0 };

        const ell = (x: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot: number) => {
            x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fill();
        };
        const groove = (x: CanvasRenderingContext2D, x0: number, y0: number, len: number, amp: number, seg: number) => {
            x.beginPath(); x.moveTo(x0, y0);
            for (let i = 1; i <= seg; i++) x.quadraticCurveTo(x0 + len * (i - 0.5) / seg, y0 + (i % 2 ? amp : -amp) * 1.6, x0 + len * i / seg, y0);
            x.stroke();
        };

        const build = () => {
            const r = zone.getBoundingClientRect();
            if (r.width < 10) return;
            st.W = r.width + PAD * 2; st.H = r.height + PAD * 2;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = st.W * dpr; canvas.height = st.H * dpr;
            canvas.style.width = st.W + "px"; canvas.style.height = st.H + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Draw a brain silhouette into an offscreen mask, then sample particle home positions from it
            const m = document.createElement("canvas"); m.width = 320; m.height = 250;
            const mx = m.getContext("2d");
            if (!mx) return;
            mx.fillStyle = "#fff";
            ell(mx, 152, 104, 114, 84, -0.06);
            ell(mx, 54, 130, 38, 46, 0.25);
            ell(mx, 224, 180, 42, 30, 0.35);
            ell(mx, 168, 190, 24, 22, 0);
            mx.globalCompositeOperation = "destination-out";
            mx.lineWidth = 6; mx.strokeStyle = "#000";
            groove(mx, 42, 68, 220, 9, 6);
            groove(mx, 50, 104, 212, 8, 5);
            groove(mx, 46, 140, 200, 8, 5);
            groove(mx, 150, 30, 0, 0, 1);

            const img = mx.getImageData(0, 0, 320, 250).data;
            const n = Math.max(0, particleCount);
            const zw = r.width, zh = r.height;
            const scale = Math.min((zw - 44) / 320, (zh * 0.56) / 250);
            const ox = PAD + (zw - 320 * scale) / 2, oy = PAD + (zh - 250 * scale) / 2 - zh * 0.04;
            const pts: Pt[] = []; let guard = 0;
            while (pts.length < n && guard < n * 80) {
                guard++;
                const sx = Math.random() * 320, sy = Math.random() * 250;
                if (img[((sy | 0) * 320 + (sx | 0)) * 4 + 3] > 128) {
                    const hx = ox + sx * scale, hy = oy + sy * scale;
                    pts.push({ hx, hy, x: hx + (Math.random() - 0.5) * 260, y: hy + (Math.random() - 0.5) * 260, vx: 0, vy: 0, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.8, sz: 0.7 + Math.random() * 1.5, o: 0.3 + Math.random() * 0.5, hueOff: (sx / 320 - 0.5) * 55 });
                }
            }
            st.pts = pts;

            // Neural links: spatial hash, connect close neighbors with capped degree
            const cell = 26 * scale + 8;
            const hash = new Map<string, number[]>();
            const key = (x: number, y: number) => ((x / cell) | 0) + ":" + ((y / cell) | 0);
            pts.forEach((p, i) => {
                const k = key(p.hx, p.hy);
                const bucket = hash.get(k) ?? [];
                if (!hash.has(k)) hash.set(k, bucket);
                bucket.push(i);
            });
            const links: [number, number][] = [], deg = new Uint8Array(pts.length), maxD = cell;
            for (let i = 0; i < pts.length; i++) {
                if (deg[i] >= 2) continue;
                const p = pts[i], cx = (p.hx / cell) | 0, cy = (p.hy / cell) | 0;
                for (let gx = cx - 1; gx <= cx + 1 && deg[i] < 2; gx++) for (let gy = cy - 1; gy <= cy + 1 && deg[i] < 2; gy++) {
                    const bucket = hash.get(gx + ":" + gy); if (!bucket) continue;
                    for (const j of bucket) {
                        if (j <= i || deg[j] >= 3 || deg[i] >= 2) continue;
                        const dx = p.hx - pts[j].hx, dy = p.hy - pts[j].hy, d = Math.sqrt(dx * dx + dy * dy);
                        if (d > 6 && d < maxD) { links.push([i, j]); deg[i]++; deg[j]++; }
                    }
                }
            }
            st.links = links; st.maxD = maxD * 1.9;
        };
        build();

        const onMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            st.mx = e.clientX - r.left; st.my = e.clientY - r.top;
        };
        const onOut = () => { st.mx = -9999; st.my = -9999; };
        let rT: ReturnType<typeof setTimeout>;
        const onResize = () => { clearTimeout(rT); rT = setTimeout(build, 200); };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("resize", onResize);
        document.documentElement.addEventListener("mouseleave", onOut);

        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            st.t += 0.016;
            ctx.clearRect(0, 0, st.W, st.H);
            ctx.globalCompositeOperation = "lighter";
            const wob = calm ? 0.6 : 3;
            ctx.lineWidth = 0.7;
            for (const [i, j] of st.links) {
                const a = st.pts[i], b = st.pts[j];
                const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d > st.maxD) continue;
                const alpha = (1 - d / st.maxD) * 0.22 * (0.7 + 0.3 * Math.sin(st.t * 1.4 + i));
                ctx.strokeStyle = "hsla(" + (hue + (a.hueOff + b.hueOff) / 2) + ",80%,70%," + alpha.toFixed(3) + ")";
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            const R = 130, R2 = R * R;
            for (const p of st.pts) {
                const tx = p.hx + Math.sin(st.t * p.sp + p.ph) * wob;
                const ty = p.hy + Math.cos(st.t * p.sp * 0.9 + p.ph) * wob;
                let ax = (tx - p.x) * 0.03, ay = (ty - p.y) * 0.03;
                const dx = p.x - st.mx, dy = p.y - st.my, d2 = dx * dx + dy * dy;
                if (d2 < R2 && !calm) {
                    const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 2.4;
                    ax += dx / d * f; ay += dy / d * f;
                }
                p.vx = (p.vx + ax) * 0.88; p.vy = (p.vy + ay) * 0.88;
                p.x += p.vx; p.y += p.vy;
                ctx.fillStyle = "hsla(" + (hue + p.hueOff) + ",85%,68%," + p.o + ")";
                ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, 6.283); ctx.fill();
            }
        };
        tick();

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(rT);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("resize", onResize);
            document.documentElement.removeEventListener("mouseleave", onOut);
        };
    }, [particleCount, hue]);

    return (
        <div className="relative flex h-full min-h-[220px] items-end justify-center">
            <div ref={zoneRef} className="absolute inset-0" />
            <canvas ref={canvasRef} className="pointer-events-none absolute z-[1]" style={{ top: -PAD, left: -PAD }} />
            <span className="relative z-[2] pb-1.5 font-mono text-[10px] tracking-[0.12em] text-white/25">{"// move your cursor"}</span>
        </div>
    );
}
