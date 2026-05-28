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

    let animId: number;
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

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t++;

      for (const leaf of leaves) {
        leaf.y -= leaf.speed;
        leaf.rotation += leaf.rotationSpeed;
        leaf.driftX = Math.sin(t * leaf.driftSpeed + leaf.driftOffset) * 28;

        if (leaf.y < -leaf.size * 3) {
          Object.assign(leaf, spawnLeaf(canvas.width, canvas.height, false));
        }

        drawLeaf(
          ctx,
          leaf.x + leaf.driftX,
          leaf.y,
          leaf.size,
          leaf.rotation,
          COLORS[leaf.colorIdx],
          leaf.opacity
        );
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
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
