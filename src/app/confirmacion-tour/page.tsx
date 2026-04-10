import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { waLink } from "@/lib/whatsapp";

interface Props {
  searchParams: { session_id?: string; status?: string };
}

/* ── Stripe session → metadata ─────────────────────────────────────────── */
async function getSession(sessionId: string) {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return null;
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function ConfirmacionTourPage({ searchParams }: Props) {
  const { session_id, status } = searchParams;

  /* Cancelado: el usuario volvió sin pagar */
  if (status === "cancelled" || !session_id) {
    return <Cancelado />;
  }

  /* Verificar con Stripe */
  const session = session_id ? await getSession(session_id) : null;

  if (!session || session.payment_status !== "paid") {
    return <Cancelado />;
  }

  const meta = session.metadata ?? {};
  const total = (session.amount_total ?? 0) / 100;

  return <Exito meta={meta} total={total} sessionId={session.id} />;
}

/* ── Pantalla de éxito ──────────────────────────────────────────────────── */
function Exito({
  meta,
  total,
  sessionId,
}: {
  meta: Record<string, string>;
  total: number;
  sessionId: string;
}) {
  const waMsg = `Hola, acabo de completar mi pago para el tour "${meta.tour ?? ""}". Mi referencia es ${sessionId.slice(-8).toUpperCase()}. ¿Qué sigue?`;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20"
      style={{ background: "radial-gradient(circle at top, #1a2e1a, #0e1710)" }}>
      <div className="w-full max-w-lg text-center">

        {/* Icono */}
        <div className="w-20 h-20 rounded-full bg-verde-vivo/15 border border-verde-vivo/40 flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-verde-vivo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-3">
          Reserva confirmada
        </p>
        <h1 className="font-cormorant font-light text-crema mb-2"
          style={{ fontSize: "clamp(32px,5vw,52px)" }}>
          ¡Pago exitoso!
        </h1>
        <p className="text-crema/60 font-dm text-sm mb-10">
          Tu lugar está asegurado. Te contactaremos pronto con los detalles del recorrido.
        </p>

        {/* Datos del tour */}
        <div className="border border-white/10 bg-white/4 p-6 text-left space-y-3 mb-8">
          {meta.tour && (
            <Row label="Tour" value={meta.tour} />
          )}
          {meta.adultos && (
            <Row label="Adultos" value={meta.adultos} />
          )}
          {meta.ninos && meta.ninos !== "0" && (
            <Row label="Niños" value={meta.ninos} />
          )}
          {meta.fecha_preferida && meta.fecha_preferida !== "sin_fecha" && (
            <Row label="Fecha preferida" value={formatFecha(meta.fecha_preferida)} />
          )}
          <div className="border-t border-white/8 pt-3">
            <Row
              label="Total pagado"
              value={`$${total.toLocaleString("es-MX")} MXN`}
              highlight
            />
          </div>
          <p className="text-[10px] text-crema/30 font-dm pt-1">
            Referencia: {sessionId.slice(-12).toUpperCase()}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={waLink(waMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <WaSvg />
            Coordinar con el guía
          </a>
          <Link
            href="/tours"
            className="border border-white/20 hover:border-crema/40 text-crema/60 hover:text-crema px-6 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all"
          >
            Ver más tours
          </Link>
        </div>

        <p className="mt-8 text-[10px] text-crema/25 font-dm">
          ✓ Recibirás confirmación por WhatsApp · Cancelación gratuita 48h antes
        </p>
      </div>
    </main>
  );
}

/* ── Pantalla de cancelado / sin pago ───────────────────────────────────── */
function Cancelado() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20"
      style={{ background: "radial-gradient(circle at top, #1a2e1a, #0e1710)" }}>
      <div className="w-full max-w-lg text-center">

        <div className="w-20 h-20 rounded-full bg-terracota/15 border border-terracota/40 flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-terracota/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <p className="text-[10px] tracking-[4px] uppercase text-terracota/70 font-dm mb-3">
          Pago no completado
        </p>
        <h1 className="font-cormorant font-light text-crema mb-2"
          style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          No se realizó el cargo
        </h1>
        <p className="text-crema/55 font-dm text-sm mb-10 max-w-sm mx-auto">
          Saliste del proceso de pago antes de completarlo. Tu reserva no fue procesada y no se te cobró nada.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tours"
            className="bg-verde-selva hover:bg-verde-vivo text-crema px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            Volver a los tours
          </Link>
          <a
            href={waLink("Hola, intenté hacer una reserva pero no completé el pago. ¿Me pueden ayudar?")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-white/20 hover:border-verde-vivo/50 text-crema/60 hover:text-crema px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-all"
          >
            <WaSvg />
            Hablar con el equipo
          </a>
        </div>
      </div>
    </main>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-[11px] text-crema/45 font-dm tracking-[1px] uppercase flex-shrink-0">{label}</span>
      <span className={`font-dm text-sm text-right ${highlight ? "text-dorado font-semibold" : "text-crema/80"}`}>
        {value}
      </span>
    </div>
  );
}

function formatFecha(iso: string): string {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function WaSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
    </svg>
  );
}
