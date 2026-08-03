"use client";
// Neumorphic primitives shared across BentoHome / HabitList / GoalList.
// Ported 1:1 from the "Axiom Dashboard" claude.ai/design mockup.

export const COOL = "#6fd6c3";
export const WARM = "#f2a86f";
export const EASE = "cubic-bezier(0.23,1,0.32,1)";

function lerpHex(a: string, b: string, t: number) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

/* Notch-based radial gauge: 36 notches over a 270° sweep, active notches ramp
   along a duotone gradient (teal on-pace, amber when behind), track carved dark. */
export function NotchRing({ pct, size, label, behind = false, temp }: { pct: number; size: number; label: string; behind?: boolean; temp?: "hot" | "warm" | "cool" | "cold" }) {
    const N = 36;
    const active = Math.round((Math.min(100, Math.max(0, pct)) / 100) * N);
    const RAMPS: Record<string, [string, string]> = {
        hot: ["#3f9c8b", "#96ecd9"],
        warm: ["#4d8f79", "#a7e0c0"],
        cool: ["#a8823f", "#e6c48a"],
        cold: ["#c8813f", "#f7c396"],
    };
    const ramp = temp ? RAMPS[temp] : behind ? RAMPS.cold : RAMPS.hot;
    return (
        <div
            className="relative flex flex-none items-center justify-center rounded-full [box-shadow:-5px_-5px_12px_rgba(255,255,255,0.05),7px_7px_16px_rgba(0,0,0,0.5)]"
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                {Array.from({ length: N }, (_, i) => {
                    const a = ((135 + ((i + 0.5) / N) * 270) * Math.PI) / 180;
                    const on = i < active;
                    return (
                        <line
                            key={i}
                            x1={+(50 + 37.5 * Math.cos(a)).toFixed(2)} y1={+(50 + 37.5 * Math.sin(a)).toFixed(2)}
                            x2={+(50 + 45.5 * Math.cos(a)).toFixed(2)} y2={+(50 + 45.5 * Math.sin(a)).toFixed(2)}
                            stroke={on ? lerpHex(ramp[0], ramp[1], active > 1 ? i / (active - 1) : 1) : "rgba(0,0,0,0.33)"}
                            strokeWidth={3.2}
                            strokeLinecap="round"
                            style={{ transition: "stroke 300ms ease" }}
                        />
                    );
                })}
            </svg>
            <span className="font-bold tabular-nums text-[#eceef3]" style={{ fontSize: size * 0.2 }}>{label}</span>
        </div>
    );
}

/* Raised check button that presses to inset with a drawn check when done. */
export function CheckBox({ done, round, size = 29, onClick, disabled, label }: {
    done: boolean; round?: boolean; size?: number; onClick?: () => void; disabled?: boolean; label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`neu-btn flex flex-none items-center justify-center ${done ? "[box-shadow:inset_4px_4px_9px_rgba(0,0,0,0.5),inset_-4px_-4px_9px_rgba(255,255,255,0.04)]" : ""}`}
            style={{ width: size, height: size, borderRadius: round ? "50%" : 9 }}
        >
            <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 14 14">
                <path
                    d="M2.5 7.5 L5.8 10.5 L11.5 3.8"
                    style={{
                        fill: "none", stroke: COOL, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round",
                        strokeDasharray: 24,
                        strokeDashoffset: done ? 0 : 24,
                        animation: done ? `checkdraw 320ms ${EASE} forwards` : undefined,
                    }}
                />
            </svg>
        </button>
    );
}
