"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/nav/Navbar";
import { FloatingReservarButton } from "@/components/FloatingReservarButton";
import { CookieBanner } from "@/components/CookieBanner";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <div className="scroll-progress-bar" aria-hidden="true" />}
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <FloatingReservarButton />}
      {!isAdmin && <CookieBanner />}
    </>
  );
}
