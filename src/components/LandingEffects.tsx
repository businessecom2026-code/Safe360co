import { useEffect, useRef, useCallback } from 'react';

// ─── Mouse cursor ripple rings ───────────────────────────────────────────────
function CursorRipple() {
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;

    const ring = document.createElement('div');
    ring.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid rgba(96,165,250,0.7);
      transform: translate(-50%, -50%) scale(1);
      pointer-events: none;
      z-index: 9999;
      animation: ripple-expand 0.9s ease-out forwards;
    `;
    container.appendChild(ring);
    setTimeout(() => ring.remove(), 900);
  }, []);

  useEffect(() => {
    let lastRipple = 0;
    const THROTTLE_MS = 80;

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastRipple < THROTTLE_MS) return;
      lastRipple = now;
      createRipple(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [createRipple]);

  return <div ref={containerRef} aria-hidden="true" />;
}

// ─── Floating particles ───────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  dx: number; // drift amount
}

function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    duration: 8 + Math.random() * 12,
    delay: -(Math.random() * 15),
    opacity: 0.15 + Math.random() * 0.35,
    dx: -20 + Math.random() * 40,
  }));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      style={{ mixBlendMode: 'screen' }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-blue-400 dark:bg-blue-500"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `float-particle ${p.duration}s ${p.delay}s ease-in-out infinite`,
            '--dx': `${p.dx}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Global keyframes injected once ──────────────────────────────────────────
function InjectKeyframes() {
  useEffect(() => {
    const id = 'landing-effects-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes ripple-expand {
        0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.8; border-width: 2px; }
        100% { transform: translate(-50%,-50%) scale(7);   opacity: 0;   border-width: 1px; }
      }
      @keyframes float-particle {
        0%   { transform: translateY(0px)   translateX(0px);   opacity: inherit; }
        33%  { transform: translateY(-30px) translateX(var(--dx)); }
        66%  { transform: translateY(-15px) translateX(calc(var(--dx) * -0.5)); }
        100% { transform: translateY(0px)   translateX(0px);   opacity: inherit; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);
  return null;
}

// ─── Public export ────────────────────────────────────────────────────────────
export function LandingEffects() {
  return (
    <>
      <InjectKeyframes />
      <FloatingParticles />
      <CursorRipple />
    </>
  );
}
