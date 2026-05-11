"use client";

import { useState, useEffect } from "react";

export function ViewersCounter() {
  const [count, setCount] = useState(14);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = Math.random() * 60_000 + 30_000; // 30-90 s
      timeout = setTimeout(() => {
        setCount(Math.floor(Math.random() * 11) + 10); // 10-20
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs font-dm text-amber-800">
      <span>🔥</span>
      <span>
        <strong>{count} personas</strong> están viendo este tour ahora
      </span>
    </div>
  );
}
