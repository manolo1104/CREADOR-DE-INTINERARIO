/**
 * El agente contestando, mensaje a mensaje, empujado por el scroll.
 *
 * Es la única animación del funnel que no decora: DEMUESTRA el producto.
 * Vale más que cualquier párrafo sobre lo que hace el agente, y es lo que
 * la gente va a recordar.
 *
 * No lleva "use client" a propósito: todo el movimiento es CSS con línea de
 * tiempo de scroll (ver movimiento.css), así que esto es un componente de
 * servidor y no manda un solo kilobyte de JavaScript al navegador.
 *
 * La conversación es la real del bot, con los precios reales de la
 * Expedición Tamul. Si cambian los precios, cámbialos aquí.
 */

type Mensaje = {
  de: "cliente" | "agente";
  texto: string;
  hora: string;
  /** Los tres puntitos antes de que llegue la respuesta. */
  escribiendo?: boolean;
};

const CONVERSACION: Mensaje[] = [
  { de: "cliente", texto: "Hola, buenas noches. ¿Todavía tienen lugar para el sótano de las golondrinas este sábado?", hora: "23:41" },
  { de: "agente", texto: "", hora: "", escribiendo: true },
  { de: "agente", texto: "¡Hola! Sí, para el sábado todavía hay lugar. ¿Van adultos o también menores?", hora: "23:41" },
  { de: "cliente", texto: "2 adultos y un niño de 9 años", hora: "23:42" },
  { de: "agente", texto: "Perfecto. Para la Expedición Tamul les quedaría así:\n\n2 adultos × $1,550 = $3,100\n1 menor × $1,085\n\nTotal: $4,185 MXN\n\nIncluye guía, equipo, comida y la entrada. ¿Se los aparto?", hora: "23:42" },
  { de: "cliente", texto: "Sí porfa, ¿cómo les pago?", hora: "23:44" },
  { de: "agente", texto: "Te mando la liga para apartar con el 30%. En cuanto entre te llega la confirmación con el punto de encuentro.", hora: "23:44" },
];

function Burbuja({ m }: { m: Mensaje }) {
  const mio = m.de === "agente";
  return (
    <div className={`chat-burbuja flex ${mio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 font-dm text-[15px] leading-relaxed ${
          mio
            ? "rounded-2xl rounded-br-md bg-[#12433A] text-hielo"
            : "rounded-2xl rounded-bl-md bg-tinta-3 text-hielo"
        }`}
      >
        {m.escribiendo ? (
          <span className="chat-puntos flex items-center gap-1.5 px-2 py-1" aria-label="escribiendo">
            <i className="block h-1.5 w-1.5 rounded-full bg-hielo-2" />
            <i className="block h-1.5 w-1.5 rounded-full bg-hielo-2" />
            <i className="block h-1.5 w-1.5 rounded-full bg-hielo-2" />
          </span>
        ) : (
          <>
            <span className="whitespace-pre-line">{m.texto}</span>
            <span className="mt-1 block text-right font-mono text-[10px] text-hielo-3">{m.hora}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ChatAgente() {
  return (
    <figure className="m-0">
      <div className="mx-auto max-w-sm border border-linea bg-tinta-2">
        {/* Cabecera, como la de un teléfono */}
        <div className="flex items-center gap-3 border-b border-linea px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-azul font-sora text-sm font-bold text-tinta">
            HP
          </span>
          <div className="min-w-0">
            <p className="truncate font-dm text-sm font-medium text-hielo">Huasteca Potosina Tours</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-azul-vivo">en línea</p>
          </div>
        </div>

        {/* El hilo. La línea de tiempo vive en el contenedor para que las
            burbujas la compartan y no se desincronicen entre sí. */}
        <div className="chat-hilo flex flex-col gap-2.5 px-4 py-5">
          {CONVERSACION.map((m, i) => (
            <Burbuja key={i} m={m} />
          ))}
        </div>
      </div>

      <figcaption className="mx-auto mt-4 max-w-sm font-dm text-sm leading-relaxed text-hielo-2">
        Una conversación real, un jueves a las 11:41 de la noche.{" "}
        <span className="text-hielo">Yo estaba dormido.</span> El agente cotizó, apartó y
        cobró. Eso es lo que construyes en la semana 2.
      </figcaption>
    </figure>
  );
}
