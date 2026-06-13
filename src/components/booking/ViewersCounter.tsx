"use client";

// Mensaje honesto y útil para el flujo de reserva (sin contador de "personas viendo" inventado).
export function ViewersCounter() {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs font-dm text-amber-800">
      <span aria-hidden="true">📅</span>
      <span>
        <strong>Reserva con 24 h de anticipación</strong> para asegurar tu lugar y coordinar la recogida
      </span>
    </div>
  );
}
