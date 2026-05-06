"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/nav/Navbar";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { CookieBanner } from "@/components/CookieBanner";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <CookieBanner />}
    </>
  );
}
