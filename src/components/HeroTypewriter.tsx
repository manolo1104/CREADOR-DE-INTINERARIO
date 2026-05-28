"use client";

import { useState, useEffect, useRef } from "react";

const WORDS = ["Potosina", "Aventura", "Naturaleza", "Cascadas", "Magia"];

const TYPE_SPEED  = 80;   // ms per character typed
const DELETE_SPEED = 40;  // ms per character deleted (fast backspace)
const PAUSE_AFTER  = 2000; // ms to show full word before deleting
const PAUSE_BEFORE = 180; // ms to wait before typing next word

export function HeroTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const wordIndex = useRef(0);
  const charIndex = useRef(0);
  const phase = useRef<"typing" | "pausing" | "deleting" | "waiting">("typing");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

  // Blinking cursor
  useEffect(() => {
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
