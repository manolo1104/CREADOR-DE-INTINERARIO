// Client-only — call only from "use client" components

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "ssr";
  let sid = sessionStorage.getItem("hp_sid");
  if (!sid) {
    sid = `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("hp_sid", sid);
  }
  return sid;
}

export function trackTourEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/track", {
      method:    "POST",
      headers:   { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        data: data ?? {},
        path: window.location.pathname,
        sid:  getSessionId(),
      }),
    }).catch(() => {});
  } catch {
    // fire and forget — never throw
  }
}
