"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

// 52 mensajes únicos — variedad de grupos, ciudades y los 7 tours.
// El orden de aparición se baraja por sesión (ver makeShuffledDeck).
const MENSAJES_ES: { texto: string; tiempo: string }[] = [
  { texto: "Una familia de Monterrey acaba de reservar la Expedición Tamul",              tiempo: "hace 8 min" },
  { texto: "Una pareja de CDMX reservó la Ruta Surrealista de Edward James",              tiempo: "hace 23 min" },
  { texto: "Un grupo de amigos de Guadalajara confirmó las Cascadas del Meco",            tiempo: "hace 41 min" },
  { texto: "Una familia con niños de Querétaro reservó el Paraíso Escalonado",            tiempo: "hace 1 hora" },
  { texto: "Una pareja de San Luis Potosí confirmó la Ruta Acuática",                     tiempo: "hace 1 h 20 min" },
  { texto: "3 amigos de Tampico reservaron la Expedición Tamul para este fin de semana",  tiempo: "hace 2 horas" },
  { texto: "Una familia de Puebla eligió las Cascadas del Meco",                          tiempo: "hace 2 h 15 min" },
  { texto: "Una pareja de León completó su reserva de la Ruta Surrealista",               tiempo: "hace 2 h 40 min" },
  { texto: "4 amigos de Tijuana reservaron la Expedición Tamul para el sábado",           tiempo: "hace 3 horas" },
  { texto: "Una familia de Mérida reservó el Paraíso Escalonado con 2 niños",             tiempo: "hace 3 h 10 min" },
  { texto: "Una pareja de Monterrey confirmó el Puente de Dios y las Siete Cascadas",     tiempo: "hace 3 h 45 min" },
  { texto: "Un grupo de 5 amigos de CDMX reservó la Expedición Tamul",                    tiempo: "hace 4 horas" },
  { texto: "Una familia de Aguascalientes eligió las Cascadas de Minas Viejas",           tiempo: "hace 4 h 20 min" },
  { texto: "Una pareja de Guadalajara reservó la Ruta Acuática para su luna de miel",     tiempo: "hace 5 horas" },
  { texto: "3 amigos de Morelia confirmaron la Ruta Surrealista de Edward James",         tiempo: "hace 5 h 30 min" },
  { texto: "Un grupo de Toluca reservó el Recorrido en RZR por Xilitla",                  tiempo: "hace 12 min" },
  { texto: "2 parejas de Saltillo confirmaron el Rappel en la Cascada de Tamul",          tiempo: "hace 35 min" },
  { texto: "Una viajera de CDMX reservó la Ruta Surrealista para este viernes",           tiempo: "hace 50 min" },
  { texto: "Un papá y su hijo de Torreón reservaron el Rappel en Tamul",                  tiempo: "hace 1 h 10 min" },
  { texto: "Una familia de Veracruz confirmó la Ruta Acuática completa",                  tiempo: "hace 1 h 35 min" },
  { texto: "Un grupo de compañeros de trabajo de Monterrey reservó el RZR por Xilitla",   tiempo: "hace 1 h 50 min" },
  { texto: "Una pareja de Pachuca celebrará su aniversario en la Expedición Tamul",       tiempo: "hace 2 h 5 min" },
  { texto: "6 amigas de Querétaro reservaron las Cascadas del Meco",                      tiempo: "hace 2 h 30 min" },
  { texto: "Una familia de Culiacán reservó el Paraíso Escalonado para sus vacaciones",   tiempo: "hace 2 h 50 min" },
  { texto: "Un viajero de Chihuahua confirmó el Rappel en la Cascada de Tamul",           tiempo: "hace 3 h 20 min" },
  { texto: "Una despedida de soltera de Guadalajara reservó la Ruta Acuática",            tiempo: "hace 3 h 30 min" },
  { texto: "Una pareja de Cancún confirmó la Ruta Surrealista de Edward James",           tiempo: "hace 3 h 55 min" },
  { texto: "Un grupo de fotógrafos de CDMX reservó las Cascadas del Meco",                tiempo: "hace 4 h 10 min" },
  { texto: "Una familia de Zacatecas apartó el Recorrido en RZR — Ruta Nanacatli",        tiempo: "hace 4 h 35 min" },
  { texto: "4 estudiantes de San Luis Potosí reservaron la Expedición Tamul",             tiempo: "hace 4 h 50 min" },
  { texto: "Una mamá y su hija de Hermosillo confirmaron el Paraíso Escalonado",          tiempo: "hace 5 h 15 min" },
  { texto: "Una pareja de Oaxaca reservó el Puente de Dios para su cumpleaños",           tiempo: "hace 5 h 40 min" },
  { texto: "Un grupo de Irapuato confirmó el RZR por Xilitla para el domingo",            tiempo: "hace 6 horas" },
  { texto: "Una familia de McAllen, Texas reservó la Expedición Tamul",                   tiempo: "hace 14 min" },
  { texto: "3 primos de Durango reservaron el Rappel en Tamul",                           tiempo: "hace 28 min" },
  { texto: "Una pareja de Mazatlán confirmó Minas Viejas y las Cascadas de Micos",        tiempo: "hace 45 min" },
  { texto: "Un grupo de 8 amigos de CDMX apartó la Ruta Acuática completa",               tiempo: "hace 1 h 5 min" },
  { texto: "Una familia de Tuxtla Gutiérrez reservó las Cascadas del Meco",               tiempo: "hace 1 h 25 min" },
  { texto: "Una pareja de Villahermosa eligió la Ruta Surrealista para su escapada",      tiempo: "hace 1 h 45 min" },
  { texto: "5 amigos de Celaya confirmaron el Recorrido en RZR por Xilitla",              tiempo: "hace 2 h 10 min" },
  { texto: "Una abuela con sus nietos de Monterrey reservó el Paraíso Escalonado",        tiempo: "hace 2 h 25 min" },
  { texto: "Un grupo de Reynosa reservó la Expedición Tamul para el puente",              tiempo: "hace 2 h 45 min" },
  { texto: "Una pareja de Houston, Texas confirmó la Ruta Surrealista",                   tiempo: "hace 3 h 5 min" },
  { texto: "2 hermanas de Puebla reservaron las Siete Cascadas",                          tiempo: "hace 3 h 15 min" },
  { texto: "Un festejado de Tampico apartó el Rappel en la Cascada de Tamul",             tiempo: "hace 3 h 40 min" },
  { texto: "Una familia de León (9 personas) reservó la Ruta Acuática",                   tiempo: "hace 4 h 5 min" },
  { texto: "Una pareja de Xalapa confirmó las Cascadas del Meco",                         tiempo: "hace 4 h 25 min" },
  { texto: "Un grupo de motociclistas de Querétaro reservó el RZR — Ruta Nanacatli",      tiempo: "hace 4 h 45 min" },
  { texto: "Una viajera de Mérida reservó la Expedición Tamul",                           tiempo: "hace 5 h 5 min" },
  { texto: "4 amigos de Ciudad Valles confirmaron el Rappel en Tamul",                    tiempo: "hace 5 h 25 min" },
  { texto: "Una familia de Matehuala reservó el Paraíso Escalonado",                      tiempo: "hace 5 h 50 min" },
  { texto: "Una pareja de Ciudad Juárez confirmó la Ruta Surrealista de Edward James",    tiempo: "hace 6 h 15 min" },
];

const MENSAJES_EN: { texto: string; tiempo: string }[] = [
  { texto: "A family from Monterrey just booked the Tamul Expedition",                    tiempo: "8 min ago" },
  { texto: "A couple from Mexico City booked the Edward James Surrealist Route",          tiempo: "23 min ago" },
  { texto: "A group of friends from Guadalajara confirmed the El Meco Waterfalls",        tiempo: "41 min ago" },
  { texto: "A family with kids from Querétaro booked the Stepped Paradise",               tiempo: "1 hour ago" },
  { texto: "A couple from San Luis Potosí confirmed the Water Route",                     tiempo: "1 h 20 min ago" },
  { texto: "3 friends from Tampico booked the Tamul Expedition for this weekend",         tiempo: "2 hours ago" },
  { texto: "A family from Puebla chose the El Meco Waterfalls",                           tiempo: "2 h 15 min ago" },
  { texto: "A couple from León completed their Surrealist Route booking",                 tiempo: "2 h 40 min ago" },
  { texto: "4 friends from Tijuana booked the Tamul Expedition for Saturday",             tiempo: "3 hours ago" },
  { texto: "A family from Mérida booked the Stepped Paradise with 2 kids",                tiempo: "3 h 10 min ago" },
  { texto: "A couple from Monterrey confirmed Puente de Dios and the Seven Waterfalls",   tiempo: "3 h 45 min ago" },
  { texto: "A group of 5 friends from Mexico City booked the Tamul Expedition",           tiempo: "4 hours ago" },
  { texto: "A family from Aguascalientes chose the Minas Viejas Waterfalls",              tiempo: "4 h 20 min ago" },
  { texto: "A couple from Guadalajara booked the Water Route for their honeymoon",        tiempo: "5 hours ago" },
  { texto: "3 friends from Morelia confirmed the Edward James Surrealist Route",          tiempo: "5 h 30 min ago" },
  { texto: "A group from Toluca booked the RZR Ride through Xilitla",                     tiempo: "12 min ago" },
  { texto: "2 couples from Saltillo confirmed the Tamul Waterfall Rappel",                tiempo: "35 min ago" },
  { texto: "A traveler from Mexico City booked the Surrealist Route for this Friday",     tiempo: "50 min ago" },
  { texto: "A father and son from Torreón booked the Tamul Rappel",                       tiempo: "1 h 10 min ago" },
  { texto: "A family from Veracruz confirmed the full Water Route",                       tiempo: "1 h 35 min ago" },
  { texto: "A group of coworkers from Monterrey booked the RZR through Xilitla",          tiempo: "1 h 50 min ago" },
  { texto: "A couple from Pachuca will celebrate their anniversary on the Tamul Expedition", tiempo: "2 h 5 min ago" },
  { texto: "6 friends from Querétaro booked the El Meco Waterfalls",                      tiempo: "2 h 30 min ago" },
  { texto: "A family from Culiacán booked the Stepped Paradise for their vacation",       tiempo: "2 h 50 min ago" },
  { texto: "A traveler from Chihuahua confirmed the Tamul Waterfall Rappel",              tiempo: "3 h 20 min ago" },
  { texto: "A bachelorette party from Guadalajara booked the Water Route",                tiempo: "3 h 30 min ago" },
  { texto: "A couple from Cancún confirmed the Edward James Surrealist Route",            tiempo: "3 h 55 min ago" },
  { texto: "A group of photographers from Mexico City booked the El Meco Waterfalls",     tiempo: "4 h 10 min ago" },
  { texto: "A family from Zacatecas reserved the RZR Ride — Nanacatli Route",             tiempo: "4 h 35 min ago" },
  { texto: "4 students from San Luis Potosí booked the Tamul Expedition",                 tiempo: "4 h 50 min ago" },
  { texto: "A mother and daughter from Hermosillo confirmed the Stepped Paradise",        tiempo: "5 h 15 min ago" },
  { texto: "A couple from Oaxaca booked Puente de Dios for a birthday",                   tiempo: "5 h 40 min ago" },
  { texto: "A group from Irapuato confirmed the RZR through Xilitla for Sunday",          tiempo: "6 hours ago" },
  { texto: "A family from McAllen, Texas booked the Tamul Expedition",                    tiempo: "14 min ago" },
  { texto: "3 cousins from Durango booked the Tamul Rappel",                              tiempo: "28 min ago" },
  { texto: "A couple from Mazatlán confirmed Minas Viejas and the Micos Waterfalls",      tiempo: "45 min ago" },
  { texto: "A group of 8 friends from Mexico City reserved the full Water Route",         tiempo: "1 h 5 min ago" },
  { texto: "A family from Tuxtla Gutiérrez booked the El Meco Waterfalls",                tiempo: "1 h 25 min ago" },
  { texto: "A couple from Villahermosa chose the Surrealist Route for their getaway",     tiempo: "1 h 45 min ago" },
  { texto: "5 friends from Celaya confirmed the RZR Ride through Xilitla",                tiempo: "2 h 10 min ago" },
  { texto: "A grandmother and her grandkids from Monterrey booked the Stepped Paradise",  tiempo: "2 h 25 min ago" },
  { texto: "A group from Reynosa booked the Tamul Expedition for the long weekend",       tiempo: "2 h 45 min ago" },
  { texto: "A couple from Houston, Texas confirmed the Surrealist Route",                 tiempo: "3 h 5 min ago" },
  { texto: "2 sisters from Puebla booked the Seven Waterfalls",                           tiempo: "3 h 15 min ago" },
  { texto: "A birthday traveler from Tampico reserved the Tamul Waterfall Rappel",        tiempo: "3 h 40 min ago" },
  { texto: "A family from León (9 people) booked the Water Route",                        tiempo: "4 h 5 min ago" },
  { texto: "A couple from Xalapa confirmed the El Meco Waterfalls",                       tiempo: "4 h 25 min ago" },
  { texto: "A group of bikers from Querétaro booked the RZR — Nanacatli Route",           tiempo: "4 h 45 min ago" },
  { texto: "A traveler from Mérida booked the Tamul Expedition",                          tiempo: "5 h 5 min ago" },
  { texto: "4 friends from Ciudad Valles confirmed the Tamul Rappel",                     tiempo: "5 h 25 min ago" },
  { texto: "A family from Matehuala booked the Stepped Paradise",                         tiempo: "5 h 50 min ago" },
  { texto: "A couple from Ciudad Juárez confirmed the Edward James Surrealist Route",     tiempo: "6 h 15 min ago" },
];

// Fisher-Yates: baraja los índices 0..n-1 para recorrer los mensajes
// en orden aleatorio sin repetir ninguno hasta agotar la lista.
function makeShuffledDeck(n: number): number[] {
  const deck = Array.from({ length: n }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface Props {
  tourId:   string;
  tourName: string;
}

export function SocialProofToast({ tourId, tourName }: Props) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const MENSAJES = en ? MENSAJES_EN : MENSAJES_ES;
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const deck       = useRef<number[]>([]);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(() => {
    if (dismissed) return;
    // Toma el siguiente índice del mazo barajado; re-baraja al agotarse
    if (deck.current.length === 0) deck.current = makeShuffledDeck(MENSAJES.length);
    const idx = deck.current.pop()!;
    setMsgIndex(idx);
    setVisible(true);

    const msg = MENSAJES[idx % MENSAJES.length];
    trackTourEvent("TOAST_SHOWN", { tour: tourId, message: msg.texto });

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      nextTimer.current = setTimeout(() => {
        showToast();
      }, 55_000 + Math.random() * 65_000);
    }, 8_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, tourId, en]);

  useEffect(() => {
    // First appearance: 5s after mount
    const firstTimer = setTimeout(() => showToast(), 5_000);
    return () => {
      clearTimeout(firstTimer);
      if (hideTimer.current)  clearTimeout(hideTimer.current);
      if (nextTimer.current)  clearTimeout(nextTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    if (hideTimer.current)  clearTimeout(hideTimer.current);
    if (nextTimer.current)  clearTimeout(nextTimer.current);
    trackTourEvent("TOAST_DISMISSED", { tour: tourId });
  }

  if (!visible || dismissed) return null;

  const msg = MENSAJES[msgIndex % MENSAJES.length];

  return (
    <div
      className="fixed bottom-20 left-4 z-50 max-w-[285px] sm:max-w-xs
                 bg-negro/95 border border-white/12 shadow-xl shadow-black/40
                 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[9px] tracking-[2px] uppercase font-dm text-verde-vivo/70">
          {en ? "✦ Recent booking" : "✦ Reserva reciente"}
        </span>
        <button
          onClick={dismiss}
          aria-label={en ? "Close" : "Cerrar"}
          className="text-crema/30 hover:text-crema/70 transition-colors -mr-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3">
        <p className="font-dm text-xs text-crema/85 leading-snug">{msg.texto}</p>
        <p className="font-dm text-[10px] text-crema/35 mt-1">{msg.tiempo}</p>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/6">
        <div className="h-full bg-verde-vivo/60 animate-[shrink_8s_linear_forwards]" />
      </div>
    </div>
  );
}
