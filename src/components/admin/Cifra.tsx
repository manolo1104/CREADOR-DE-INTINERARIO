"use client";

/**
 * Una cifra del panel.
 *
 * Todas comparten tamaño y peso: la diferencia la marca el color, y solo
 * cuando significa algo (verde = entró dinero, ámbar = falta cobrarlo). Antes
 * cada tarjeta elegía su tamaño y la que estaba en verde parecía la
 * importante aunque no lo fuera.
 */
export function Cifra({ etiqueta, valor, pie, tono }: {
  etiqueta: string;
  valor: React.ReactNode;
  pie: string;
  tono: "positivo" | "acento" | "alerta" | "neutro" | "apagado";
}) {
  const color = {
    positivo: "text-[#2b845c]",
    acento:   "text-[#1B4332]",
    alerta:   "text-[#a86814]",
    neutro:   "text-[#16362a]",
    apagado:  "text-[rgba(22,54,42,0.28)]",
  }[tono];

  return (
    <div className="panel-card panel-card-alta px-4 py-3.5">
      <p className="panel-eyebrow mb-2">{etiqueta}</p>
      <p className={`panel-cifra font-cormorant text-[28px] leading-none font-light mb-1 ${color}`}>
        {valor}
      </p>
      <p className="text-[11px] font-dm text-[rgba(22,54,42,0.51)]">{pie}</p>
    </div>
  );
}
