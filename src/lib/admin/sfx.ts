"use client";

// ────────────────────────────────────────────────────────────────────────────
// SFX del admin — sonidos sutiles sintetizados con Web Audio (sin archivos).
// Respeta la preferencia de silencio guardada en localStorage.
// NO interfiere con ninguna funcionalidad ni endpoint: solo audio.
// ────────────────────────────────────────────────────────────────────────────

const MUTE_KEY = "hp_admin_sfx_muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // El contexto puede quedar "suspendido" hasta una interacción del usuario.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

export function isSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  // Un "tin" corto al reactivar para confirmar.
  if (!muted) playClick();
}

/** Un tono simple con envolvente suave (evita clics ásperos). */
function tone(
  freq: number,
  durationMs: number,
  opts: { type?: OscillatorType; gain?: number; delayMs?: number } = {}
): void {
  const ac = getCtx();
  if (!ac) return;
  const { type = "sine", gain = 0.05, delayMs = 0 } = opts;
  const t0 = ac.currentTime + delayMs / 1000;
  const dur = durationMs / 1000;

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Clic sutil para botones/acciones. */
export function playClick(): void {
  if (isSfxMuted()) return;
  tone(660, 55, { type: "triangle", gain: 0.035 });
}

/** Confirmación de acción exitosa (dos notas ascendentes). */
export function playSuccess(): void {
  if (isSfxMuted()) return;
  tone(587.33, 90, { type: "sine", gain: 0.05 });            // D5
  tone(880, 150, { type: "sine", gain: 0.05, delayMs: 90 }); // A5
}

/** Aviso de error (nota grave corta). */
export function playError(): void {
  if (isSfxMuted()) return;
  tone(196, 200, { type: "sawtooth", gain: 0.03 });
}

/** Campana de NUEVA RESERVA — arpegio cálido de 3 notas. */
export function playNewBooking(): void {
  if (isSfxMuted()) return;
  tone(523.25, 240, { type: "sine", gain: 0.06 });               // C5
  tone(659.25, 240, { type: "sine", gain: 0.06, delayMs: 110 }); // E5
  tone(783.99, 480, { type: "sine", gain: 0.06, delayMs: 220 }); // G5
}
