import { DESTINOS_DB, Destino } from "./destinos";

export interface PreviewDia {
  dia: number;
  titulo: string;
  destinos: Destino[];
  horaInicio: string;
  costoEstimadoMXN: number;
  actividades: string[];
  nota: string;
}

export interface PreviewItinerary {
  dias: PreviewDia[];
  totalEstimadoMXN: number;
  presupuestoUsuario: number;
  dentroDePresupuesto: boolean;
  destinosUsados: number;
  diasCubiertos: number;
}

export interface WizardInputs {
  dias: number;
  presupuesto: string;
  destinos: string[];
  intereses: string[];
  viajero: string;
  actividad: string;
  restricciones: string;
  sueno: string;
}

const TIPS: string[] = [
  "Lleva siempre efectivo — la mayoría de sitios no aceptan tarjeta",
  "El bloqueador solar biodegradable es obligatorio en todas las pozas",
  "Sal temprano: antes de las 9 AM los sitios tienen menos gente y mejor luz",
  "El color turquesa del agua es más intenso entre noviembre y marzo",
  "Ciudad Valles es tu base — regresa ahí cada noche para mayor comodidad",
  "Lleva calzado que puedas mojar, no solo sandalias",
  "Guarda comida del desayuno para el camino — hay zonas sin restaurantes",
  "El transporte colectivo desde Valles existe, pero los taxis locales ahorran tiempo",
  "Lleva más efectivo del que crees necesitar — hay cajeros escasos en la sierra",
  "La selva huasteca es hogar de fauna silvestre — no alimentes animales",
];

const PRESUPUESTO_DIARIO: Record<string, number> = {
  economico: 400,
  moderado: 1000,
  premium: 2000,
};

function parsePrecioMXN(precio: string): number {
  const match = precio.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generatePreviewItinerary(inputs: WizardInputs): PreviewItinerary {
  // 1. Filter destinos
  let pool: Destino[] = inputs.destinos.length > 0
    ? DESTINOS_DB.filter((d) => inputs.destinos.includes(d.id))
    : [...DESTINOS_DB];

  if (inputs.viajero === "Familia") {
    pool = pool.filter((d) => d.dificultad !== "alta");
  }

  pool = shuffle(pool);

  // 2. Distribute into days (max 8h active, max 2 destinos per day)
  const MAX_HOURS = 8;
  const diasResult: PreviewDia[] = [];
  let poolIndex = 0;
  const tipOrder = shuffle(Array.from({ length: TIPS.length }, (_, i) => i));

  for (let dia = 1; dia <= inputs.dias; dia++) {
    const destinosDelDia: Destino[] = [];
    let horasUsadas = 0;

    while (destinosDelDia.length < 2 && poolIndex < pool.length) {
      const d = pool[poolIndex];
      if (horasUsadas + d.duracion_hrs <= MAX_HOURS) {
        destinosDelDia.push(d);
        horasUsadas += d.duracion_hrs;
      }
      poolIndex++;
    }

    // Recycle pool if exhausted
    if (destinosDelDia.length === 0 && pool.length > 0) {
      pool = shuffle(pool);
      poolIndex = 0;
      destinosDelDia.push(pool[poolIndex++]);
    }

    const zona = destinosDelDia[0]?.zona ?? "Huasteca Potosina";
    const entradas = destinosDelDia.reduce((sum, d) => sum + parsePrecioMXN(d.precio_entrada), 0);
    const costoEstimadoMXN = entradas + 150 + 80; // comida + transporte

    const actividades = destinosDelDia.flatMap((d) => d.ideal_para.slice(0, 2));

    diasResult.push({
      dia,
      titulo: `Día ${dia} — ${zona}`,
      destinos: destinosDelDia,
      horaInicio: "08:00",
      costoEstimadoMXN,
      actividades,
      nota: TIPS[tipOrder[(dia - 1) % TIPS.length]],
    });
  }

  const totalEstimadoMXN = diasResult.reduce((s, d) => s + d.costoEstimadoMXN, 0);
  const presupuestoDiario = PRESUPUESTO_DIARIO[inputs.presupuesto] ?? 1000;
  const presupuestoUsuario = presupuestoDiario * inputs.dias;

  return {
    dias: diasResult,
    totalEstimadoMXN,
    presupuestoUsuario,
    dentroDePresupuesto: totalEstimadoMXN <= presupuestoUsuario,
    destinosUsados: new Set(diasResult.flatMap((d) => d.destinos.map((x) => x.id))).size,
    diasCubiertos: diasResult.length,
  };
}
