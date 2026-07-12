// Clima REAL-TIME de la Huasteca Potosina (Ciudad Valles) + pronóstico a 7 días.
// Datos de Open-Meteo (gratis, sin API key). Server component: la petición se
// cachea 1 h (revalidate), no corre en cada visita, y se oculta solo si falla.

const LAT = 21.9955;
const LON = -99.0206; // Ciudad Valles — corazón turístico de la Huasteca

interface OpenMeteo {
  current?: { temperature_2m: number; weather_code: number };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

async function getClima(): Promise<OpenMeteo | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=America%2FMexico_City&forecast_days=7`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    return (await res.json()) as OpenMeteo;
  } catch {
    return null;
  }
}

// Código WMO → emoji + etiqueta (ES/EN)
function wmo(code: number, en: boolean): { emoji: string; label: string } {
  const p = (emoji: string, e: string, s: string) => ({ emoji, label: en ? e : s });
  if (code === 0)  return p("☀️", "Clear", "Despejado");
  if (code <= 2)   return p("🌤️", "Partly cloudy", "Medio nublado");
  if (code === 3)  return p("☁️", "Cloudy", "Nublado");
  if (code <= 48)  return p("🌫️", "Fog", "Neblina");
  if (code <= 57)  return p("🌦️", "Drizzle", "Llovizna");
  if (code <= 67)  return p("🌧️", "Rain", "Lluvia");
  if (code <= 77)  return p("🌨️", "Snow", "Nieve");
  if (code <= 82)  return p("🌦️", "Showers", "Chubascos");
  return p("⛈️", "Storm", "Tormenta");
}

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function ClimaHero({ en = false }: { en?: boolean }) {
  const data = await getClima();
  if (!data?.current || !data.daily) return null;

  const now = wmo(data.current.weather_code, en);
  const dias = data.daily.time.map((iso, i) => {
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
    const w = wmo(data.daily!.weather_code[i], en);
    return {
      iso,
      label: i === 0 ? (en ? "Today" : "Hoy") : (en ? DIAS_EN : DIAS_ES)[dow],
      emoji: w.emoji,
      max: Math.round(data.daily!.temperature_2m_max[i]),
      min: Math.round(data.daily!.temperature_2m_min[i]),
      rain: data.daily!.precipitation_probability_max[i],
    };
  });

  return (
    <div className="mb-10 w-full max-w-md mx-auto bg-negro/40 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 shadow-xl">
      {/* Ahora mismo */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="text-left">
          <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm">
            {en ? "Weather now · Huasteca" : "Clima ahora · Huasteca"}
          </p>
          <p className="font-dm text-crema/55 text-[11px]">Ciudad Valles · {now.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">{now.emoji}</span>
          <span className="font-cormorant text-crema text-4xl leading-none">
            {Math.round(data.current.temperature_2m)}°
          </span>
        </div>
      </div>

      {/* Pronóstico a 7 días */}
      <div className="flex justify-between gap-1 border-t border-white/10 pt-3">
        {dias.map((d) => (
          <div key={d.iso} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] uppercase tracking-wide text-crema/50 font-dm">{d.label}</span>
            <span className="text-base leading-none" aria-hidden="true">{d.emoji}</span>
            <span className="text-[11px] text-crema/90 font-dm font-medium leading-none">{d.max}°</span>
            <span className="text-[10px] text-crema/40 font-dm leading-none">{d.min}°</span>
            {d.rain >= 50 && (
              <span className="text-[8px] text-agua font-dm leading-none">💧{d.rain}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
