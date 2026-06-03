"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function UrgencyWidget() {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const [viewers, setViewers] = useState(rand(18, 47));

  useEffect(() => {
    const id = setInterval(() => {
      setViewers(rand(18, 47));
    }, rand(25000, 45000));
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 text-[11px] font-dm text-verde-profundo/70">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verde-selva opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-verde-vivo" />
      </span>
      <span><strong className="text-verde-selva">{viewers}</strong> {en ? "people viewing now" : "personas viendo ahora"}</span>
    </div>
  );
}
