"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Estado = "verificando" | "ok" | "error";

function DescargaContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [estado, setEstado] = useState<Estado>("verificando");

  useEffect(() => {
    if (!sessionId) {
      setEstado("error");
      return;
    }
    fetch(`/api/verify-session?session_id=${sessionId}&producto=guia_pdf`)
      .then((r) => r.json())
      .then((data) => setEstado(data.valid ? "ok" : "error"))
      .catch(() => setEstado("error"));
  }, [sessionId]);

  function handleDescargar() {
    window.location.href = `/api/pdf/guia?session_id=${sessionId}`;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">

        {estado === "verificando" && (
          <>
            <div className="w-12 h-12 border-2 border-verde-vivo border-t-transparent rounded-full animate-spin mx-auto mb-8" />
            <p className="text-crema/50 text-sm tracking-wide">Verificando tu pago...</p>
          </>
        )}

        {estado === "ok" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-verde-vivo mx-auto mb-6" />
            <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-4">Pago confirmado</p>
            <h1 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              Tu guía está <em className="text-dorado">lista</em>
            </h1>
            <p className="text-crema/50 text-sm leading-relaxed mb-10">
              Descarga la Guía Huasteca Potosina 2026 y ábrela en cualquier navegador.
              Para guardar como PDF: <span className="text-verde-vivo">Ctrl+P → Guardar como PDF</span>.
            </p>
            <button
              onClick={handleDescargar}
              className="w-full bg-dorado text-negro py-5 text-[11px] tracking-[4px] uppercase font-dm font-medium hover:bg-lima transition-colors mb-4"
            >
              ↓ Descargar Guía Ahora
            </button>
            <p className="text-[11px] text-crema/25 mb-8">
              Guarda este enlace — puedes descargar de nuevo si lo necesitas.
            </p>
            <div className="border border-dorado/25 bg-dorado/5 p-5 text-left mb-3">
              <p className="text-[10px] tracking-[3px] uppercase text-dorado/70 mb-2">Lleva el viaje resuelto</p>
              <p className="text-sm text-crema/65 leading-relaxed mb-3">
                ¿Y si no quieres manejar? Tenemos un viaje grupal de CDMX a la Huasteca (16–19 sep 2026):
                transporte redondo, hotel y 3 recorridos, todo incluido desde $7,900/persona.
              </p>
              <Link
                href="/viaje-septiembre"
                className="text-[11px] tracking-[3px] uppercase text-dorado hover:text-lima border-b border-dorado/30 pb-0.5 transition-colors"
              >
                Ver el viaje de septiembre →
              </Link>
            </div>
            <div className="border border-white/8 p-5 text-left">
              <p className="text-[10px] tracking-[3px] uppercase text-crema/30 mb-2">O arma el tuyo</p>
              <p className="text-sm text-crema/60 leading-relaxed mb-3">
                Reserva cualquiera de nuestros recorridos guiados con transporte, desayuno y guía certificado.
              </p>
              <Link
                href="/tours"
                className="text-[11px] tracking-[3px] uppercase text-verde-vivo hover:text-lima border-b border-verde-vivo/30 pb-0.5 transition-colors"
              >
                Ver todos los tours →
              </Link>
            </div>
          </>
        )}

        {estado === "error" && (
          <>
            <AlertTriangle className="w-12 h-12 text-terracota mx-auto mb-6" />
            <h1 className="font-cormorant font-light text-crema mb-4 text-3xl">
              No pudimos verificar el pago
            </h1>
            <p className="text-crema/50 text-sm leading-relaxed mb-8">
              Si completaste el pago, puede tardar unos segundos. Recarga la página.
              Si el problema persiste, contáctanos con tu número de pedido.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="border border-verde-vivo text-verde-vivo px-10 py-4 text-[11px] tracking-[3px] uppercase hover:bg-verde-vivo hover:text-negro transition-colors mb-6"
            >
              Recargar página
            </button>
            <br />
            <Link
              href="/guia"
              className="text-[11px] text-crema/30 tracking-wide hover:text-crema/60 transition-colors"
            >
              ← Volver a la guía
            </Link>
          </>
        )}

      </div>
    </main>
  );
}

export default function DescargaPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-verde-vivo border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <DescargaContent />
    </Suspense>
  );
}
