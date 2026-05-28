"use client";

import { useEffect, useRef } from "react";

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  wobbleOffset: number;
}

function spawnBubble(width: number, height: number, randomY = false): Bubble {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + Math.random() * 60,
    r: 5 + Math.random() * 18,
    speed: 0.35 + Math.random() * 0.75,
    opacity: 0.05 + Math.random() * 0.13,
    wobbleAmp: 12 + Math.random() * 20,
    wobbleSpeed: 0.008 + Math.random() * 0.018,
    wobbleOffset: Math.random() * Math.PI * 2,
  };
}

export function BubblesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;
    const NUM = 25;
    let bubbles: Bubble[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Scatter initial bubbles at random heights so canvas looks full immediately
    for (let i = 0; i < NUM; i++) {
      bubbles.push(spawnBubble(canvas.width, canvas.height, true));
    }

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t++;

      for (const b of bubbles) {
        b.y -= b.speed;
        const cx = b.x + Math.sin(t * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmp;
        const cy = b.y;

        // Recycle when off-screen top
        if (cy < -b.r * 3) {
          Object.assign(b, spawnBubble(canvas.width, canvas.height, false));
        }

        // Radial gradient — water feel
        const g = ctx.createRadialGradient(
          cx - b.r * 0.3, cy - b.r * 0.35, b.r * 0.05,
          cx, cy, b.r
        );
        g.addColorStop(0,   `rgba(180, 235, 255, ${b.opacity * 1.8})`);
        g.addColorStop(0.45, `rgba(90, 190, 230, ${b.opacity})`);
        g.addColorStop(1,   `rgba(40, 130, 200, ${b.opacity * 0.25})`);

        ctx.beginPath();
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Specular highlight
        ctx.beginPath();
        ctx.arc(cx - b.r * 0.28, cy - b.r * 0.3, b.r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity * 1.8})`;
        ctx.fill();

        // Rim
        ctx.beginPath();
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160, 220, 255, ${b.opacity * 0.9})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      bubbles = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
