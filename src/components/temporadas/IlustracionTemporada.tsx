/* Las ilustraciones de «Próximas temporadas»: una por fecha, en SVG (Server Component).
 *
 * Manolo, 12 nov 2026: «dale un diseño atractivo… si se puede con diseño de esa
 * temporada». Cada tarjeta lleva el color y el motivo de SU fecha:
 *   · Revolución: papel picado verde, blanco y rojo.
 *   · Diciembre: nochebuenas (flor mexicana) y estrellas doradas sobre verde noche.
 *   · Constitución: agua clara de febrero, olas y destellos.
 *   · Benito Juárez: jacarandas de marzo.
 *   · Semana Santa: sol y una panga en el agua más turquesa (así se llega a Tamul).
 *   · Verano: lluvia y cascada a todo caudal.
 *   · Xantolo: cempasúchil y papel picado.
 *
 * Son dibujos, no fotos: no hay fotos propias de cada fecha y las de archivo
 * con multitudes contradirían el mensaje. SVG en línea = cero peticiones y
 * nítido en cualquier pantalla. Todo es decorativo (`aria-hidden`).
 */
import type { TemaTemporada } from "@/lib/temporadasProximas";

const W = 240;
const H = 120;

/** Banderitas de papel picado colgadas de un hilo, con sus calados. */
function PapelPicado({ colores, fondo, hilo, y0 = 6 }: { colores: string[]; fondo: string; hilo: string; y0?: number }) {
  const n = 6;
  const ancho = 32;
  const paso = W / n;
  const yHilo = (cx: number) => y0 + 10 * (1 - ((cx - W / 2) / (W / 2)) ** 2);
  return (
    <g>
      <path d={`M0 ${y0} Q${W / 2} ${y0 + 20} ${W} ${y0}`} stroke={hilo} strokeWidth="1.2" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const cx = paso * i + paso / 2;
        const x = cx - ancho / 2;
        const y = yHilo(cx);
        const alto = 30;
        // Orilla de picos abajo, como el papel cortado.
        const picos = Array.from({ length: 4 }, (_, k) => {
          const xa = x + ancho - (k * ancho) / 4;
          return `L${xa - ancho / 8} ${y + alto + 6} L${xa - ancho / 4} ${y + alto}`;
        }).join(" ");
        const color = colores[i % colores.length];
        return (
          <g key={i} transform={`rotate(${(i - (n - 1) / 2) * 2.2} ${cx} ${y})`}>
            <path
              d={`M${x} ${y} L${x + ancho} ${y} L${x + ancho} ${y + alto} ${picos} Z`}
              fill={color}
              stroke={color === "#ffffff" ? "#d9d2bf" : "none"}
              strokeWidth="0.8"
            />
            <circle cx={cx} cy={y + 11} r="4" fill={fondo} />
            <path d={`M${cx - 9} ${y + 22} l3 -3 l3 3 l-3 3 Z M${cx + 3} ${y + 22} l3 -3 l3 3 l-3 3 Z`} fill={fondo} />
            <path d={`M${cx - 12} ${y + 5} h4 M${cx + 8} ${y + 5} h4`} stroke={fondo} strokeWidth="1.5" />
          </g>
        );
      })}
    </g>
  );
}

/** Destello de cuatro puntas (estrellas, brillos del agua). */
function Destello({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return <path d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`} fill={color} />;
}

/** Nochebuena: hojas verdes atrás, brácteas rojas y el centro dorado. */
function Nochebuena({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      {[20, 92, 164, 236, 308].map((a) => (
        <ellipse key={`h${a}`} cx={x} cy={y - r * 0.62} rx={r * 0.2} ry={r * 0.62} fill="#2f6b3c" transform={`rotate(${a} ${x} ${y})`} />
      ))}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={`p${a}`} cx={x} cy={y - r * 0.5} rx={r * 0.18} ry={r * 0.5} fill={a % 90 === 0 ? "#d7263d" : "#b5172d"} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={`c${a}`} cx={x + Math.cos((a * Math.PI) / 180) * r * 0.1} cy={y + Math.sin((a * Math.PI) / 180) * r * 0.1} r={r * 0.06} fill="#f2c14e" />
      ))}
    </g>
  );
}

/** Olas a lo ancho, desde la altura `y` hasta abajo. */
function Olas({ y, amp, color, fase = 0 }: { y: number; amp: number; color: string; fase?: number }) {
  const tramo = 40;
  let d = `M${-tramo + fase} ${y}`;
  for (let x = -tramo + fase; x < W + tramo; x += tramo) {
    d += ` q${tramo / 4} ${-amp} ${tramo / 2} 0 t${tramo / 2} 0`;
  }
  d += ` V${H} H${-tramo} Z`;
  return <path d={d} fill={color} />;
}

/** Cempasúchil visto de frente: tres anillos de pétalos. */
function Cempasuchil({ x, y, r }: { x: number; y: number; r: number }) {
  const anillo = (n: number, dist: number, rad: number, color: string, giro = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((360 / n) * i + giro) * (Math.PI / 180);
      return <circle key={`${color}${i}`} cx={x + Math.cos(a) * dist} cy={y + Math.sin(a) * dist} r={rad} fill={color} />;
    });
  return (
    <g>
      {anillo(12, r * 0.72, r * 0.32, "#e8720c")}
      {anillo(9, r * 0.45, r * 0.27, "#f39a1d", 15)}
      {anillo(6, r * 0.22, r * 0.2, "#f7b733", 30)}
      <circle cx={x} cy={y} r={r * 0.14} fill="#c75a00" />
    </g>
  );
}

/** Ramo de jacaranda: rama café y racimos de florecitas moradas. */
function Jacaranda() {
  const racimo = (cx: number, cy: number, k: number) =>
    Array.from({ length: 9 }, (_, i) => {
      const a = (i * 137.5 * Math.PI) / 180;
      const d = 3 + Math.sqrt(i) * 5.2;
      const tonos = ["#8e6cc4", "#a387d6", "#6f4fa8", "#b9a3e3"];
      return <circle key={`${k}-${i}`} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d * 0.8} r={4.2 - (i % 3) * 0.6} fill={tonos[(i + k) % tonos.length]} />;
    });
  return (
    <g>
      <path d="M-5 18 C60 30 110 18 170 40 S230 52 250 46" stroke="#6b4a33" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M95 22 C105 38 112 48 118 62 M168 40 C175 55 172 66 178 78 M40 25 C38 40 44 52 40 66" stroke="#6b4a33" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {racimo(118, 66, 0)}
      {racimo(178, 80, 1)}
      {racimo(40, 68, 2)}
      {racimo(210, 54, 3)}
      {racimo(70, 36, 1)}
      {/* Flores caídas en el suelo, como en las banquetas de marzo. */}
      {[20, 64, 150, 196, 230].map((x, i) => (
        <circle key={x} cx={x} cy={108 + (i % 2) * 5} r="2.4" fill="#a387d6" opacity="0.7" />
      ))}
    </g>
  );
}

/** Panga con dos remando sobre el agua turquesa: así se llega a Tamul, lo más pedido de Semana Santa. */
function Panga({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Remos. */}
      <path d={`M${x + 22} ${y - 14} L${x + 8} ${y + 10} M${x + 52} ${y - 14} L${x + 38} ${y + 10}`} stroke="#6b4a33" strokeWidth="1.8" strokeLinecap="round" />
      <path d={`M${x + 6} ${y + 8} l-3 6 l6 -2 Z M${x + 36} ${y + 8} l-3 6 l6 -2 Z`} fill="#6b4a33" />
      {/* Remeros con chaleco. */}
      <circle cx={x + 24} cy={y - 16} r="3.6" fill="#7a4a2a" />
      <path d={`M${x + 19} ${y - 11} h10 v9 h-10 Z`} fill="#f39a1d" />
      <circle cx={x + 54} cy={y - 16} r="3.6" fill="#7a4a2a" />
      <path d={`M${x + 49} ${y - 11} h10 v9 h-10 Z`} fill="#f39a1d" />
      {/* El casco de la panga. */}
      <path d={`M${x} ${y - 2} Q${x + 40} ${y + 12} ${x + 80} ${y - 2} L${x + 74} ${y + 6} Q${x + 40} ${y + 16} ${x + 6} ${y + 6} Z`} fill="#8a5a35" />
      <path d={`M${x + 2} ${y} Q${x + 40} ${y + 12} ${x + 78} ${y}`} stroke="#b07a4a" strokeWidth="1.2" fill="none" />
    </g>
  );
}

export function IlustracionTemporada({ tema }: { tema: TemaTemporada }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {tema === "revolucion" && (
        <>
          <PapelPicado colores={["#1f7a3a", "#ffffff", "#c8102e"]} fondo="#f4edd8" hilo="#9a8f74" />
          <Olas y={100} amp={5} color="#3a8aaa" fase={8} />
          <Olas y={106} amp={4} color="#2c6f8a" fase={-6} />
        </>
      )}

      {tema === "navidad" && (
        <>
          {[[24, 22, 4], [62, 48, 2.5], [96, 18, 3], [210, 20, 3.5], [226, 64, 2.5], [40, 86, 3], [120, 98, 2]].map(([x, y, s]) => (
            <Destello key={`${x}-${y}`} x={x} y={y} s={s} color="#e8c46a" />
          ))}
          {/* Guirnalda de foquitos. */}
          <path d="M0 6 Q60 30 120 12 T240 10" stroke="#e8c46a" strokeOpacity="0.5" strokeWidth="1" fill="none" />
          {[[18, 13], [52, 22], [86, 20], [140, 10], [178, 13], [214, 11]].map(([x, y], i) => (
            <circle key={x} cx={x} cy={y + 3} r="2.6" fill={["#f2c14e", "#d7263d", "#8fd18a"][i % 3]} />
          ))}
          <Nochebuena x={176} y={74} r={40} />
          <Nochebuena x={112} y={98} r={22} />
        </>
      )}

      {tema === "constitucion" && (
        <>
          <circle cx="198" cy="30" r="16" fill="#ffffff" opacity="0.8" />
          <Olas y={70} amp={7} color="#9fd3e0" fase={0} />
          <Olas y={84} amp={6} color="#5fb3c9" fase={14} />
          <Olas y={98} amp={5} color="#2f8fac" fase={4} />
          {[[40, 78, 4], [120, 90, 3], [180, 104, 3.5], [74, 104, 2.5]].map(([x, y, s]) => (
            <Destello key={`${x}-${y}`} x={x} y={y} s={s} color="#ffffff" />
          ))}
        </>
      )}

      {tema === "juarez" && <Jacaranda />}

      {tema === "semana-santa" && (
        <>
          <g>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return <line key={i} x1={196 + Math.cos(a) * 22} y1={30 + Math.sin(a) * 22} x2={196 + Math.cos(a) * 30} y2={30 + Math.sin(a) * 30} stroke="#f2b33d" strokeWidth="2.4" strokeLinecap="round" />;
            })}
            <circle cx="196" cy="30" r="16" fill="#f7c548" />
          </g>
          <Olas y={78} amp={6} color="#7fd8cf" fase={0} />
          <Olas y={92} amp={5} color="#2bb3a8" fase={12} />
          <Olas y={104} amp={4} color="#108a85" fase={4} />
          <Panga x={22} y={88} />
        </>
      )}

      {tema === "verano" && (
        <>
          {/* La lluvia. */}
          {Array.from({ length: 26 }, (_, i) => {
            const x = (i * 37) % W;
            const y = (i * 23) % 70;
            return <line key={i} x1={x} y1={y} x2={x - 5} y2={y + 12} stroke="#9fd0c4" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />;
          })}
          {/* Peña y cascada a todo caudal. */}
          <path d="M120 40 L240 34 L240 120 L120 120 Z" fill="#1d4a3c" />
          <path d="M120 40 C150 30 200 30 240 34 L240 44 C200 40 150 42 120 48 Z" fill="#2f6b3c" />
          {[132, 146, 160, 174, 188].map((x, i) => (
            <path key={x} d={`M${x} 46 C${x - 3} 70 ${x + 3} 90 ${x} 112`} stroke="#e6f6f2" strokeOpacity={0.85 - i * 0.08} strokeWidth="5" fill="none" strokeLinecap="round" />
          ))}
          <Olas y={104} amp={4} color="#5aa89a" fase={0} />
          <ellipse cx="160" cy="108" rx="46" ry="6" fill="#ffffff" opacity="0.35" />
        </>
      )}

      {tema === "xantolo" && (
        <>
          <PapelPicado colores={["#e0218a", "#f39a1d", "#7b3fbf", "#2bb3a8"]} fondo="#2d0e30" hilo="#c79bc9" />
          <Cempasuchil x={190} y={92} r={24} />
          <Cempasuchil x={146} y={108} r={15} />
          <Cempasuchil x={222} y={64} r={11} />
          {[[40, 96], [60, 106], [88, 100]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="3" fill="#f39a1d" opacity="0.8" />
          ))}
        </>
      )}
    </svg>
  );
}
