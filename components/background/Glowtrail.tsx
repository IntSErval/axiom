"use client";
import React, { useEffect, useRef, useSyncExternalStore } from "react";

const QUERIES = ["(pointer: fine)", "(prefers-reduced-motion: no-preference)"];

function subscribeMedia(cb: () => void) {
    const lists = QUERIES.map((q) => window.matchMedia(q));
    lists.forEach((l) => l.addEventListener("change", cb));
    return () => lists.forEach((l) => l.removeEventListener("change", cb));
}

export const GlowCursor: React.FC = () => {
    // Only run on fine-pointer devices without reduced-motion — otherwise the
    // system cursor stays and no trail renders (a11y + touch devices).
    const enabled = useSyncExternalStore(
        subscribeMedia,
        () => QUERIES.every((q) => window.matchMedia(q).matches),
        () => false,
    );

    const cursorPointRef = useRef<HTMLDivElement | null>(null);
    const cursorGlowRef = useRef<HTMLDivElement | null>(null);

    // Use refs for positions to avoid triggering React re-renders on every mouse move
    const mouseCoords = useRef({ x: 0, y: 0 });
    const pointCoords = useRef({ x: 0, y: 0 });
    const glowCoords = useRef({ x: 0, y: 0 });

    // Adjust these speeds to change the "delay" feel (0 to 1)
    const pointSpeed = 0.3;
    const glowSpeed = 0.08;

    useEffect(() => {
        if (!enabled) return;

        // Hide default cursor on the whole page
        document.body.style.cursor = "none";

        const handleMouseMove = (e: MouseEvent) => {
            mouseCoords.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener("mousemove", handleMouseMove);

        let animationFrameId: number;

        const animate = () => {
            const { x: targetX, y: targetY } = mouseCoords.current;

            // Linear Interpolation (LERP) formula: Current += (Target - Current) * Speed

            // Update Main Pointer position
            pointCoords.current.x += (targetX - pointCoords.current.x) * pointSpeed;
            pointCoords.current.y += (targetY - pointCoords.current.y) * pointSpeed;

            // Update Glow position
            glowCoords.current.x += (targetX - glowCoords.current.x) * glowSpeed;
            glowCoords.current.y += (targetY - glowCoords.current.y) * glowSpeed;

            // Apply styles directly to DOM elements for performance
            if (cursorPointRef.current) {
                cursorPointRef.current.style.transform = `translate3d(${pointCoords.current.x}px, ${pointCoords.current.y}px, 0)`;
            }
            if (cursorGlowRef.current) {
                cursorGlowRef.current.style.transform = `translate3d(${glowCoords.current.x}px, ${glowCoords.current.y}px, 0)`;
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        // Cleanup listeners and styles if component unmounts
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
            document.body.style.cursor = "auto";
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <>
            {/* Styles are kept scoped inside the component */}
            <style>{`
        .custom-cursor-point {
          width: 8px;
          height: 8px;
          background-color: #000000;
          border-radius: 50%;
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 10000;
          /* Shifts the alignment origin to the exact center of the dot */
          margin-left: -4px;
          margin-top: -4px; 
        }

        .custom-cursor-glow {
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, #ffffff, transparent 70%);
          border-radius: 50%;
          position: fixed;
          top: 0;
          left: 0;
          pointer-events: none;
          z-index: 9999;
          filter: blur(4px);
          /* Shifts the alignment origin to the exact center of the glow */
          margin-left: -20px;
          margin-top: -20px;
        }
      `}</style>

            <div ref={cursorPointRef} className="custom-cursor-point" />
            <div ref={cursorGlowRef} className="custom-cursor-glow" />
        </>
    );
};