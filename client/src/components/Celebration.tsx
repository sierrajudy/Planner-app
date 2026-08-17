import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface CelebrationState {
  celebrate: () => void;
}

const CelebrationContext = createContext<CelebrationState | null>(null);

const CONFETTI_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#4ade80", "#34d399", "#2dd4bf", "#38bdf8",
  "#818cf8", "#a78bfa", "#e879f9", "#fb7185",
];

const OVERLAY_DURATION_MS = 2800;

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [burstKey, setBurstKey] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const celebrate = useCallback(() => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setBurstKey((k) => (k ?? 0) + 1);
    timeoutRef.current = window.setTimeout(() => setBurstKey(null), OVERLAY_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {burstKey !== null && <ConfettiOverlay key={burstKey} />}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): CelebrationState {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}

function ConfettiOverlay() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 100 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1.3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        width: 6 + Math.random() * 6,
        height: 10 + Math.random() * 8,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 200,
      })),
    []
  );

  const goats = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        delay: Math.random() * 0.9,
        duration: 1.8 + Math.random() * 1.1,
        size: 26 + Math.random() * 30,
        bottom: Math.random() * 25,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: -24,
            left: `${p.left}%`,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            borderRadius: 2,
            // @ts-expect-error custom property used by keyframes
            "--drift": `${p.drift}px`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.4,0,0.6,1) forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      {goats.map((g) => (
        <span
          key={g.id}
          style={{
            position: "absolute",
            bottom: `${g.bottom}%`,
            left: `${g.left}%`,
            fontSize: g.size,
            animation: `goat-pop ${g.duration}s ${g.delay}s ease-out forwards`,
          }}
        >
          🐐
        </span>
      ))}
    </div>
  );
}
