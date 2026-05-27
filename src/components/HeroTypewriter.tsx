"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["Potosina", "Aventura", "Naturaleza", "Cascadas", "Magia"];

export function HeroTypewriter() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <span
      className="block relative"
      style={{ fontSize: "clamp(64px,12vw,130px)", minHeight: "1.1em" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          className="block text-dorado italic font-cormorant font-light"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
