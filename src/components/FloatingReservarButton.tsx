"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackCtaClick } from "@/lib/analytics";

const LOCK_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-5 h-5 flex-shrink-0" aria-hidden="true">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

export function FloatingReservarButton() {
  const pathname = usePathname();
  if (pathname === "/planear" || pathname === "/recomendar") return null;

  const tourSlugMatch = pathname.match(/^\/tours\/([^/]+)$/);
  const href = tourSlugMatch
    ? `/reservar-tour/${tourSlugMatch[1]}`
    : "/tours";

  return (
    <Link
      href={href}
      aria-label="Reservar tour"
      onClick={() => trackCtaClick("floating_button", href)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5
                 bg-dorado hover:bg-terracota text-negro hover:text-crema
                 pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-black/40
                 transition-all duration-300 hover:scale-105"
    >
      {LOCK_SVG}
      <span className="hidden sm:block text-[11px] tracking-[1.5px] uppercase font-dm font-medium">
        Reservar tour
      </span>
    </Link>
  );
}
