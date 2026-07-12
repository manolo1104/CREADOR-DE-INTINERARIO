"use client";

import { useEffect } from "react";

// Late cada 45 s para registrar que esta sesión sigue navegando. Va en TODAS las
// páginas públicas (PublicShell) para que el conteo sea de todo el sitio.
function getSid(): string {
  try {
    let sid = sessionStorage.getItem("hp_sid");
    if (!sid) {
      sid = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem("hp_sid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export function PresenceBeacon() {
  useEffect(() => {
    const sid = getSid();
    if (!sid) return;

    const ping = () => {
      if (document.visibilityState === "hidden") return; // no contar pestañas ocultas
      fetch("/api/activos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ sid }),
      }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, 45_000);
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
