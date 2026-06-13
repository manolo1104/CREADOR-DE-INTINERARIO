"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const WORDS_ES = ["Potosina", "Aventura", "Naturaleza", "Cascadas", "Magia"];
const WORDS_EN = ["Potosina", "Adventure", "Nature", "Waterfalls", "Magic"];

const TYPE_SPEED  = 80;   // ms per character typed
const DELETE_SPEED = 40;  // ms per character deleted (fast backspace)
const PAUSE_AFTER  = 2000; // ms to show full word before deleting
const PAUSE_BEFORE = 180; // ms to wait before typing next word

export function HeroTypewriter() {
  const pathname = usePathname();
  const WORDS = pathname === "/en" || pathname.startsWith("/en/") ? WORDS_EN : WORDS_ES;
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const wordIndex = useRef(0);
  const charIndex = useRef(0);
  const phase = useRef<"typing" | "pausing" | "deleting" | "waiting">("typing");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Accesibilidad: sin animación de tipeo si el usuario pide menos movimiento.
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplayed(WORDS[0]);
      setShowCursor(false);
      return;
    }

    const tick = () => {
      const word = WORDS[wordIndex.current];

      if (phase.current === "typing") {
        if (charIndex.current < word.length) {
          charIndex.current++;
          setDisplayed(word.slice(0, charIndex.current));
          timer.current = setTimeout(tick, TYPE_SPEED);
        } else {
          phase.current = "pausing";
          timer.current = setTimeout(tick, PAUSE_AFTER);
        }
      } else if (phase.current === "pausing") {
        phase.current = "deleting";
        tick();
      } else if (phase.current === "deleting") {
        if (charIndex.current > 0) {
          charIndex.current--;
          setDisplayed(word.slice(0, charIndex.current));
          timer.current = setTimeout(tick, DELETE_SPEED);
        } else {
          phase.current = "waiting";
          wordIndex.current = (wordIndex.current + 1) % WORDS.length;
          timer.current = setTimeout(tick, PAUSE_BEFORE);
        }
      } else {
        phase.current = "typing";
        tick();
      }
    };

    timer.current = setTimeout(tick, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Blinking cursor (se desactiva con prefers-reduced-motion)
  useEffect(() => {
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const blink = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span
      className="block text-dorado italic"
      style={{ fontSize: "clamp(64px,12vw,130px)" }}
      aria-live="polite"
      aria-label={WORDS[wordIndex.current]}
    >
      {displayed}
      <span
        className="inline-block w-[3px] bg-dorado ml-1 align-middle"
        style={{
          height: "0.8em",
          opacity: showCursor ? 1 : 0,
          transition: "opacity 0.1s",
          verticalAlign: "middle",
        }}
        aria-hidden="true"
      />
    </span>
  );
}
