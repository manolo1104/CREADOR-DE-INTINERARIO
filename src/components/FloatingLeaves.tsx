"use client";

import { useEffect, useRef } from "react";

interface Leaf {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  driftX: number;
  driftSpeed: number;
  driftOffset: number;
  colorIdx: number;
}

// Palette: deep greens, limes, and subtle gold — matches bg-verde-profundo
const COLORS = [
  "rgba(90,158,42,",   // verde-vivo
  "rgba(58,107,26,",   // verde-selva
  "rgba(143,190,58,",  // lima
  "rgba(143,190,58,",  // lima repeated for weight
  "rgba(196,136,42,",  // dorado — accent
];

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Simple pointed-oval leaf silhouette
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(
    size * 0.7, -size * 0.4,
    size * 0.7,  size * 0.4,
    0,           size
  );
  ctx.bezierCurveTo(
    -size * 0.7,  size * 0.4,
    -size * 0.7, -size * 0.4,
    0,           -size
  );
  ctx.closePath();

  ctx.fillStyle = `${color}${opacity})`;
  ctx.fill();

  // Midrib vein — slightly brighter than leaf body
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.85);
  ctx.lineTo(0, size * 0.85);
  ctx.strokeStyle = `${color}${Math.min(opacity * 1.4, 1)})`;
  ctx.lineWidth = size * 0.08;
  ctx.stroke();

  ctx.restore();
}

function spawnLeaf(width: number, height: number, randomY = false): Leaf {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + Math.random() * 80,
    size: 12 + Math.random() * 26,
    speed: 0.3 + Math.random() * 0.6,
    opacity: 0.14 + Math.random() * 0.18,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.014,
    driftX: 0,
    driftSpeed: 0.006 + Math.random() * 0.012,
    driftOffset: Math.random() * Math.PI * 2,
    colorIdx: Math.floor(Math.random() * COLORS.length),
  };
}

export function FloatingLeaves({ count = 22 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let running = false;
    let inView = false;
    let t = 0;
    let leaves: Leaf[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < count; i++) {
      leaves.push(spawnLeaf(canvas.width, canvas.height, true));
    }

    const paint = (animate: boolean) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (animate) t++;
      for (const leaf of leaves) {
        if (animate) {
          leaf.y -= leaf.speed;
          leaf.rotation += leaf.rotationSpeed;
          leaf.driftX = Math.sin(t * leaf.driftSpeed + leaf.driftOffset) * 28;
          if (leaf.y < -leaf.size * 3) {
            Object.assign(leaf, spawnLeaf(canvas.width, canvas.height, false));
          }
        }
        drawLeaf(ctx, leaf.x + leaf.driftX, leaf.y, leaf.size, leaf.rotation, COLORS[leaf.colorIdx], leaf.opacity);
      }
    };

    // Accesibilidad: con reduced-motion pintamos un único frame estático, sin loop.
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      paint(false);
      return () => window.removeEventListener("resize", resize);
    }

    const draw = () => {
      paint(true);
      animId = requestAnimationFrame(draw);
    };
    const start = () => {
      if (running) return;
      running = true;
      animId = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
    };

    // Pausa cuando el canvas sale del viewport o la pestaña queda oculta (ahorra CPU/batería).
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && !document.hidden) start();
        else stop();
      },
      { rootMargin: "120px" }
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (inView) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      leaves = [];
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
