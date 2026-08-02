'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const Spline = lazy(() => import('@splinetool/react-spline'));

const HOLD_DURATION_MS = 600;

// Intro Spline scene. Rendered by app/page.tsx ONLY when there is no session —
// existing (logged-in) users are redirected straight to /dashboard, so this
// welcome experience is effectively new-visitor / sign-up only.
export function SplineLanding() {
  const router = useRouter();
  const [sceneReady, setSceneReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterApp = useCallback(() => {
    setExiting((already) => {
      if (already) return already; // guard against double-fire
      setTimeout(() => router.push('/login'), 550);
      return true;
    });
  }, [router]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const startHoldTimer = useCallback(() => {
    clearHoldTimer();
    holdTimer.current = setTimeout(enterApp, HOLD_DURATION_MS);
  }, [clearHoldTimer, enterApp]);

  // Spline's canvas calls stopPropagation() on pointer events, so these
  // live on window in the CAPTURE phase to see them before Spline does.
  useEffect(() => {
    window.addEventListener('pointerdown', startHoldTimer, true);
    window.addEventListener('pointerup', clearHoldTimer, true);
    window.addEventListener('pointercancel', clearHoldTimer, true);
    window.addEventListener('pointerleave', clearHoldTimer, true);
    return () => {
      window.removeEventListener('pointerdown', startHoldTimer, true);
      window.removeEventListener('pointerup', clearHoldTimer, true);
      window.removeEventListener('pointercancel', clearHoldTimer, true);
      window.removeEventListener('pointerleave', clearHoldTimer, true);
      clearHoldTimer();
    };
  }, [startHoldTimer, clearHoldTimer]);

  const handleLoad = useCallback(() => setSceneReady(true), []);

  return (
    <main
      className={`fixed inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-[#26292f] transition-opacity duration-500 ease-out ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-none absolute left-10 top-10 z-10">
        <span className="text-xl font-bold italic tracking-[0.14em] text-[#eceef3]">AXIOM</span>
      </div>

      <Suspense fallback={<SceneLoader />}>
        <Spline
          scene={process.env.NEXT_PUBLIC_SPLINE_SCENE_URL as string}
          onLoad={handleLoad}
          className="h-full w-full"
        />
      </Suspense>

      <div
        className={`pointer-events-none absolute bottom-14 left-1/2 z-10 -translate-x-1/2 text-center transition-opacity duration-500 ${
          sceneReady && !exiting ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-base italic text-[#868da0]">Press and hold the card to enter</p>
      </div>
    </main>
  );
}

function SceneLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#26292f]">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-[#6fd6c3]" />
    </div>
  );
}
