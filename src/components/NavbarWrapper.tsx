"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Navbar from "@/components/nav/Navbar";
import { FloatingReservarButton } from "@/components/FloatingReservarButton";
import { CookieBanner } from "@/components/CookieBanner";
import { PresenceBeacon } from "@/components/PresenceBeacon";

function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // JS fallback for browsers without CSS scroll-driven animations (Safari, Firefox)
    if (CSS.supports("animation-timeline", "scroll()")) return;

    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const scrolled = document.documentElement.scrollTop;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <div ref={barRef} className="scroll-progress-bar" aria-hidden="true" />;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <ScrollProgressBar />}
      {!isAdmin && <PresenceBeacon />}
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <FloatingReservarButton />}
      {!isAdmin && <CookieBanner />}
    </>
  );
}
