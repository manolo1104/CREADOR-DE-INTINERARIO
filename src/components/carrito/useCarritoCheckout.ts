"use client";

import { useState, useEffect, useRef } from "react";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { leerCarrito, quitarDelCarrito, resumirCarrito, actualizarItem, agregarAlCarrito, pctACobrar, personasDeItem, type CarritoItem } from "@/lib/carrito";
import { itemDesdeSlug, retarifarItem } from "@/lib/carritoItems";
import { validarCarrito, type FalloCarrito } from "@/lib/carritoValidacion";
import { leerExtras, guardarExtras } from "@/lib/carritoExtras";
import { TRASLADOS, getTraslado, tarifaTraslado } from "@/lib/traslados";
import { cotizarHabitaciones } from "@/lib/habitaciones";
import { minBookingDate, totalRecorrido, aceptaViajeroSolo, minimoPersonas } from "@/lib/tourBooking";
import { TOURS_DB, salidaCorta, recogidaDeTour, tourEnFecha, type Tour } from "@/lib/tours";
import { resumenSalidas, excepcionesSalida } from "@/lib/recogidaTexto";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackTourEvent, sessionId, ga4ClientId } from "@/lib/tourTracker";
import { nombreCorto, type Cobro } from "@/components/carrito/carritoComun";
import { useApartado } from "@/components/carrito/useApartado";

/**
 * Todo lo que el carrito SABE y HACE, sin lo que pinta: el estado, la
 * restauración desde la URL y el navegador, las cuentas (total, anticipo,
 * saldo), la validación y la creación del cobro.
 *
 * Vivía dentro de la página, mezclado con 1,300 líneas de JSX. Separado, el
 * checkout de hoy y el rediseñado (oct 2026) pueden usar la MISMA lógica: los
 * precios, las reglas y el cobro no se duplican aunque cambie la pantalla.
 */
export function useCarritoCheckout() {
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const [items, setItems]   = useState<CarritoItem[]>([]);
  const [montado, setMontado] = useState(false);
  /**
   * Hay un `?agregar` pendiente de resolver. Sin esto, quien llega desde el
   * botón de una ficha de tour ve "Tu carrito está vacío" durante un frame,
   * justo en el aterrizaje que se quiere cuidar.
   */
  const [hidratando, setHidratando] = useState(true);
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [pickup, setPickup] = useState("");
  /** «Quiero guía en inglés», sin costo. Es del grupo, no de un recorrido. */
  const [guiaIngles, setGuiaIngles] = useState(false);
  const [cobro,  setCobro]  = useState<Cobro | null>(null);
  /**
   * El último pago creado, aunque `cobro` se haya borrado por un cambio: el
   * servidor lo actualiza en vez de abrir otro (ver `carrito-payment-intent`).
   */
  const ultimoPagoRef = useRef<string | null>(null);
  // Hospedaje opcional en el Hotel Paraíso Encantado. Apagado por defecto:
  // muchos ya vienen con hotel, y la promesa del sitio es justo que no hace
  // falta hospedarse con nosotros.
  const [mostrarLista, setMostrarLista] = useState(false);
  // Los lugares de los recorridos con fecha, apartados 15 minutos mientras
  // termina (`useApartado`). Hasta el 4 oct aquí vivía un reloj que no apartaba
  // nada y se quitó por falso; este lo confirma el servidor y descuenta esos
  // lugares del cupo de los demás. El RZR va por vehículo, sin cupo por fecha.
  const apartado = useApartado(
    items
      .filter((i) => !i.unidades && i.tourDate && personasDeItem(i) > 0)
      .map((i) => ({ slug: i.tourSlug, fecha: i.tourDate, personas: personasDeItem(i) })),
    { activo: !hidratando, locale },
  );
  const [conHotel,    setConHotel]    = useState(false);
  // Traslado desde la ciudad de origen. Apagado por defecto igual que el hotel:
  // quien llega en su coche no tiene por qué ver un cargo que no pidió.
  const [conTraslado,    setConTraslado]    = useState(false);
  const [ciudadTraslado, setCiudadTraslado] = useState<string>(TRASLADOS[0].slug);
  /** Ya se restauró lo guardado; hasta entonces no se escribe nada. */
  const [extrasListos, setExtrasListos] = useState(false);
  const [paxTraslado,    setPaxTraslado]    = useState(2);
  // Una entrada por habitación, con cuánta gente duerme en cada una. Con más
  // gente de la que cabe en una, el cliente decide el reparto (3+2 o 4+1):
  // el precio cambia según eso y él sabe mejor cómo quiere dormir.
  const [habs, setHabs] = useState<{ habitacionId: string; huespedes: number }[]>([
    { habitacionId: "lirios-1", huespedes: 2 },
  ]);
  /** Cuarto abierto en la galería a pantalla completa. */
  const [galeria, setGaleria] = useState<string | null>(null);
  const [checkin,     setCheckin]     = useState("");
  const [checkout,    setCheckout]    = useState("");
  const [error,  setError]  = useState("");
  const [cargando, setCargando] = useState(false);
  /** El campo de nombre, para poder llevar ahí desde la barra fija de móvil. */
  const nombreRef = useRef<HTMLInputElement | null>(null);
  /** Cada renglón, para poder llevar la vista al que toca. */
  const renglonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Renglón que acaba de llegar por `?agregar`: se resalta un momento. */
  const [recienLlegado, setRecienLlegado] = useState<string | null>(null);
  /**
   * Renglones en los que la persona intentó bajar de su mínimo. El «−» se
   * quedaba mudo en el piso: en Clarity alguien lo tocó doce veces seguidas sin
   * que nada le explicara por qué. Ahora ese intento enseña el aviso del mínimo
   * con la salida por WhatsApp.
   */
  const [enElPiso, setEnElPiso] = useState<Set<string>>(new Set());
  /** Lo que le falta al carrito, por renglón. Se llena al intentar pagar. */
  const [fallos, setFallos] = useState<FalloCarrito[]>([]);
  /** Renglón al que se acaba de llevar la vista por un fallo. */
  const [resaltado, setResaltado] = useState<string | null>(null);
  /** "Guárdalo y decide luego": la salida secundaria, para no perder el lead. */
  const [correoGuardar, setCorreoGuardar] = useState("");
  const [guardando,     setGuardando]     = useState(false);
  const [guardado,      setGuardado]      = useState(false);
  const [errorGuardar,  setErrorGuardar]  = useState("");

  useEffect(() => {
    setMontado(true);
    void hidratarDesdeUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Deja el carrito listo a partir de la URL: restaura una cotización guardada y
   * mete el recorrido que venga pedido. Es lo primero que corre al montar.
   */
  async function hidratarDesdeUrl() {
    // `?agregar=<slug>` es cómo entra un recorrido desde el resto del sitio.
    // Las páginas de tour, destino, blog y precios se pintan en el servidor y
    // ahí no existe `localStorage`, así que en vez de que cada botón sepa
    // escribir el carrito, mandan la intención en la URL y ese trabajo pasa
    // aquí, en el único sitio que toca el carrito.
    const params = new URLSearchParams(window.location.search);
    // `getAll` y no `get`: el correo del plan por día manda el viaje entero
    // (`?agregar=a&agregar=b&agregar=c`) y con `get` solo entraba el primero —
    // la persona llegaba a un carrito con un tercio de lo que le prometimos.
    // Un solo `agregar` sigue funcionando igual: es un arreglo de uno.
    const pedidos = params.getAll("agregar").filter(Boolean);
    const token   = params.get("recuperar");

    // Fecha y personas elegidas en la FICHA del tour, para no volver a
    // preguntarlas. Solo tienen sentido con UN recorrido: con varios `agregar`
    // no hay forma de saber a cuál pertenecen.
    //
    // Se valida en vez de confiar: esto viene de la URL, y una fecha de ayer o
    // un "adultos=999" metería en el carrito un renglón que el servidor
    // rechazaría al cobrar, con un error a destiempo y sin explicación.
    const extras: Partial<Omit<CarritoItem, "uid">> = {};
    if (pedidos.length === 1) {
      const fechaURL = params.get("fecha") ?? "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaURL) && fechaURL >= minBookingDate()) {
        extras.tourDate = fechaURL;
      }
      const entero = (clave: string, tope: number) => {
        const n = Number(params.get(clave));
        return Number.isInteger(n) && n >= 0 && n <= tope ? n : undefined;
      };
      const adultos = entero("adultos", 30);
      const mid     = entero("ninosMid", 30);
      const small   = entero("ninosSmall", 30);
      if (adultos !== undefined && adultos > 0) extras.adults = adultos;
      if (mid     !== undefined) extras.childrenMid   = mid;
      if (small   !== undefined) extras.childrenSmall = small;
    }

    let carrito = leerCarrito();

    // `?recuperar=<token>` es el link de los correos de rescate. Va PRIMERO y
    // luego `?agregar`, porque los links viejos traen los dos con el mismo tour:
    // `/reservar-tour/<slug>?recuperar=<t>` redirige aquí como
    // `?agregar=<slug>&recuperar=<t>`. Al revés, el tour entraría sin fecha por
    // `agregar` y otra vez con su fecha real al restaurar —`agregarAlCarrito`
    // deduplica por slug+fecha, así que NO los uniría— y el cliente vería el
    // mismo recorrido dos veces y el doble de total.
    if (token) {
      try {
        const r = await fetch(`/api/tours/carrito/${token}`);
        const c = r.ok ? await r.json() : null;
        if (c && !c.error) {
          if (c.email) setEmail(c.email);
          // Se FUSIONA con lo que ya tenga: puede haber armado un carrito nuevo
          // antes de abrir el correo, y reemplazarlo sería borrarle trabajo.
          // `carritoJson` guarda { items, hospedaje, traslado }; los tokens
          // viejos guardaban solo el array de recorridos.
          const guardado = Array.isArray(c.items) ? { items: c.items, hospedaje: null, traslado: null } : (c.items ?? null);
          if (guardado?.hospedaje?.habitaciones?.length) {
            setConHotel(true);
            setHabs(guardado.hospedaje.habitaciones);
            if (guardado.hospedaje.checkin)  setCheckin(guardado.hospedaje.checkin);
            if (guardado.hospedaje.checkout) setCheckout(guardado.hospedaje.checkout);
          }
          if (guardado?.traslado?.ciudad) {
            setConTraslado(true);
            setCiudadTraslado(guardado.traslado.ciudad);
            if (guardado.traslado.personas) setPaxTraslado(Number(guardado.traslado.personas));
          }
          const restaurados: CarritoItem[] = Array.isArray(guardado?.items) && guardado.items.length
            ? guardado.items
            : (c.tourSlug
                ? [itemDesdeSlug(c.tourSlug, {
                    tourDate:      c.tourDate || "",
                    adults:        typeof c.adults === "number" ? c.adults : undefined,
                    childrenMid:   typeof c.childrenMid === "number" ? c.childrenMid : undefined,
                    childrenSmall: typeof c.childrenSmall === "number" ? c.childrenSmall : undefined,
                  })].filter(Boolean) as CarritoItem[]
                : []);
          for (const it of restaurados) {
            const yaEsta = carrito.some(
              (x) => x.tourSlug === it.tourSlug && x.tourDate === it.tourDate,
            );
            if (!yaEsta) carrito = agregarAlCarrito({ ...it, uid: undefined } as never);
          }
          trackTourEvent("CARRITO_RECUPERADO", { recorridos: restaurados.length });
        }
      } catch { /* si no se puede restaurar, el carrito local sigue intacto */ }
    }

    if (pedidos.length) {
      // Se resalta el PRIMERO que de verdad entró. Con un plan de varios días,
      // llevar la vista al último renglón deja los otros fuera de pantalla.
      let aResaltar: string | null = null;
      for (const pedido of pedidos) {
        const yaEsta = carrito.find((i) => i.tourSlug === pedido);
        if (yaEsta) {
          // No se duplica: quien vuelve a pulsar "Reservar" del mismo tour
          // quiere verlo, no llevarlo dos veces. Se le lleva al renglón.
          aResaltar ??= yaEsta.uid;
          continue;
        }
        const nuevo = itemDesdeSlug(pedido, extras);
        if (nuevo) {
          carrito = agregarAlCarrito(nuevo);
          aResaltar ??= carrito[carrito.length - 1]?.uid ?? null;
        }
      }
      setRecienLlegado(aResaltar);
      // Se limpia la URL para que recargar no vuelva a hacer lo mismo.
      window.history.replaceState({}, "", lp("/reservar/carrito"));
    }
    // Lo que eligió y no son recorridos: hospedaje, traslado y sus datos. Vivía
    // solo en memoria, así que salir a mirar otro tour y volver lo borraba todo.
    const ex = leerExtras();
    setConHotel(ex.conHotel);
    setHabs(ex.habs);
    setCheckin(ex.checkin);
    setCheckout(ex.checkout);
    setConTraslado(ex.conTraslado);
    if (ex.ciudadTraslado) setCiudadTraslado(ex.ciudadTraslado);
    setPaxTraslado(ex.paxTraslado);
    if (ex.name)   setName(ex.name);
    if (ex.email)  setEmail(ex.email);
    if (ex.phone)  setPhone(ex.phone);
    if (ex.pickup) setPickup(ex.pickup);
    setGuiaIngles(ex.guiaIngles);
    setExtrasListos(true);

    // Los subtotales guardados se recalculan con el catálogo de HOY: un carrito
    // armado el 28 de octubre con la promo no puede seguir enseñándola el 30
    // para un recorrido de noviembre (el servidor ya cobraría el precio normal).
    for (const it of carrito) {
      const retarifado = retarifarItem(it);
      if (retarifado.total !== it.total) carrito = actualizarItem(it.uid, { total: retarifado.total });
    }

    setItems(carrito);
    setHidratando(false);
    trackTourEvent("BOOKING_PAGE_VIEW", { carrito: true, recorridos: carrito.length });
  }

  // Guarda la elección en cuanto cambia. La guarda de `extrasListos` evita que
  // el primer render —con los valores por defecto— pise lo que ya había
  // guardado antes de que termine de restaurarse.
  useEffect(() => {
    if (!extrasListos) return;
    guardarExtras({
      conHotel, habs, checkin, checkout,
      conTraslado, ciudadTraslado, paxTraslado,
      name, email, phone, pickup, guiaIngles,
    });
  }, [extrasListos, conHotel, habs, checkin, checkout, conTraslado, ciudadTraslado, paxTraslado, name, email, phone, pickup, guiaIngles]);

  // Lleva la vista al recorrido que acaba de entrar y apaga el resalte.
  useEffect(() => {
    if (!recienLlegado) return;
    const nodo = renglonRefs.current[recienLlegado];
    nodo?.scrollIntoView({ behavior: "smooth", block: "center" });
    const id = setTimeout(() => setRecienLlegado(null), 2600);
    return () => clearTimeout(id);
  }, [recienLlegado]);

  // Al activar el hospedaje se proponen fechas a partir de los recorridos ya
  // elegidos: se llega la víspera del primero y se sale el día después del
  // último. Es lo que hace casi todo el mundo, y evita que arranque vacío.
  useEffect(() => {
    if (!conHotel || checkin || checkout) return;
    const fechas = items.map((i) => i.tourDate).filter(Boolean).sort();
    if (fechas.length === 0) return;
    const dia = (f: string, delta: number) => {
      const d = new Date(`${f}T00:00:00`);
      d.setDate(d.getDate() + delta);
      return d.toISOString().slice(0, 10);
    };
    setCheckin(dia(fechas[0], -1));
    setCheckout(dia(fechas[fechas.length - 1], 1));
  }, [conHotel, items, checkin, checkout]);

  const minDate = minBookingDate();

  // Las noches salen del calendario, no de un contador suelto: el cliente
  // piensa en "llego el 15 y me voy el 18", no en "tres noches".
  const noches = (() => {
    if (!checkin || !checkout) return 0;
    const ms = new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime();
    return Math.max(0, Math.round(ms / 86_400_000));
  })();

  const huespedes  = habs.reduce((s, h) => s + h.huespedes, 0);
  const rutaTraslado      = conTraslado ? getTraslado(ciudadTraslado) : undefined;
  const precioDelTraslado = rutaTraslado ? (tarifaTraslado(rutaTraslado, paxTraslado)?.precio ?? null) : null;
  const totalTraslado     = precioDelTraslado ?? 0;

  const hotelQuote = conHotel && noches > 0 ? cotizarHabitaciones(habs, noches, locale) : null;
  const totalHotel = hotelQuote?.ok ? hotelQuote.total ?? 0 : 0;

  // Si reserva el hotel con nosotros, la recogida es aquí: se llena solo para
  // que no tenga que escribirlo, y se puede editar si prefiere otra cosa.
  useEffect(() => {
    if (!conHotel || !hotelQuote?.ok) return;
    const nombres = (hotelQuote.desglose ?? []).map((d) => d.habitacion).join(" + ");
    setPickup(`Hotel Paraíso Encantado, Xilitla${nombres ? ` — ${nombres}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conHotel, JSON.stringify(habs), hotelQuote?.ok]);

  // El hotel entra en el total y, por tanto, en el anticipo del 30 %. El
  // servidor vuelve a cotizarlo con `cotizarHospedaje`, así que esto es solo
  // lo que se pinta.
  const resumen  = resumirCarrito(items);
  const dias     = resumen.dias;
  const total    = resumen.total + totalHotel + totalTraslado;
  // El anticipo es el 30 % (`pctACobrar`, regla del 29 sep 2026). El servidor
  // aplica exactamente la misma regla en `carrito-payment-intent`.
  /**
   * «Pagar el viaje completo hoy» (8 oct 2026).
   *
   * 🔴 Nace de los meses sin intereses. El carrito cobra el 30 % de anticipo
   * —unos $870— y ningún banco da MSI sobre eso: habilitar los meses sin dar
   * la opción de pagar completo era anunciarlos y que nunca aparecieran.
   *
   * Solo se ofrece cuando el viaje pasa de `MSI_DESDE`; abajo de eso no cambia
   * nada y el anticipo sigue siendo el de siempre. Nunca se elige solo: si el
   * cliente no lo toca, paga el 30 %.
   */
  const [pagarTodo, setPagarTodo] = useState(false);
  const pctBase  = pctACobrar(dias, totalHotel > 0);
  const puedePagarTodo = total >= MSI_DESDE && pctBase < 100;
  const pctHoy   = pagarTodo && puedePagarTodo ? 100 : pctBase;
  const anticipo = Math.round((total * pctHoy) / 100);
  const saldo    = total - anticipo;

  // 🔴 Cómo llega el cliente a SUS recorridos, desde el catálogo. El bloque de
  // logística y la pregunta "¿De dónde salimos?" decían "entre 8:00 y 9:00 AM,
  // en Xilitla o Ciudad Valles" para todo el carrito; con la Gruta de Xilo
  // dentro (7 PM, solo Xilitla) eran dos datos falsos justo antes de pagar.
  const toursCarrito = items
    .map((i) => TOURS_DB.find((x) => x.slug === i.tourSlug))
    .filter((x): x is Tour => !!x);
  const lineasSalida = resumenSalidas(toursCarrito, locale);
  const respuestaSalidas = lineasSalida.length
    ? `${lineasSalida.join(" ")} ${t.horaExacta}`
    : `${excepcionesSalida(locale)} ${t.horaExacta}`;
  /**
   * La hora de un renglón para su calendario; null si no hay hora pública. El
   * Edén trae el horario del JARDÍN (`horaTexto`), no una salida: va aparte.
   */
  const horaDe = (slug: string) => {
    const x = TOURS_DB.find((y) => y.slug === slug);
    const hora = x ? salidaCorta(x, en) : null;
    const esHorario = !!x && !!recogidaDeTour(x).horaTexto;
    return { salida: esHorario ? null : hora, horario: esHorario ? hora : null };
  };

  // 🔴 Cancelación: el Edén NO se reembolsa (`cancelacion` en tours.ts) y este
  // carrito le prometía "reembolso completo" en la franja de arriba, en el
  // bloque de logística, en la pregunta "¿Puedo cancelar?" y en el resumen.
  // Con el carrito vacío la pregunta habla de todo el catálogo.
  const conCancelPropia = (toursCarrito.length ? toursCarrito : TOURS_DB)
    .filter((x, n, arr) => x.cancelacion && arr.findIndex((y) => y.slug === x.slug) === n);
  const todosCancelPropia = toursCarrito.length > 0 && toursCarrito.every((x) => x.cancelacion);
  const nombreCat = (x: Tour) => nombreCorto(x.slug, x.nombre, locale);
  const cancelacionDe = (x: Tour) => (en ? x.cancelacion?.en : x.cancelacion?.es) ?? "";
  const respuestaCancelar = (base: string) => todosCancelPropia
    ? conCancelPropia.map(cancelacionDe).join(" ")
    : [base, ...conCancelPropia.map((x) => t.cancelarExcepcion(nombreCat(x), cancelacionDe(x)))].join(" ");
  const cancelPropiaEnCarrito = toursCarrito.length > 0 ? conCancelPropia : [];

  // Mensaje del rescate: lleva lo que el cliente ya eligió para que no tenga
  // que repetirlo. Sin esto el chat arranca con "hola" y se pierde el contexto.
  const waRescate = `https://wa.me/524891090388?text=${encodeURIComponent(
    [
      t.waRescate.intro,
      "",
      ...items.map((i) => `• ${nombreCorto(i.tourSlug, i.tourName, locale)}${i.tourDate ? ` — ${i.tourDate}` : t.waRescate.sinFecha}`),
      ...(conHotel && hotelQuote?.ok
        ? [t.waRescate.hospedaje((hotelQuote.desglose ?? []).map((d) => d.habitacion).join(" + "), noches)]
        : []),
      "",
      t.waRescate.totalEstimado(`$${total.toLocaleString(en ? "en-US" : "es-MX")}`),
    ].join("\n"),
  )}`;


  function quitar(uid: string) {
    setItems(quitarDelCarrito(uid));
    // Si se vacía el carrito a media captura, el cobro creado deja de valer.
    setCobro(null);
  }

  function cambiar(uid: string, cambios: Partial<CarritoItem>) {
    // Dos recorridos no pueden caer el mismo día: cada uno ocupa la jornada
    // completa. Vale también para los de horario propio (la Gruta de noche, el
    // Amanecer de madrugada): la regla es un recorrido por día, sin excepciones.
    // Si se dejara pasar, el cliente pagaría dos tours que no se pueden hacer
    // juntos, y la reclamación llega el mismo día de la salida.
    if (cambios.tourDate) {
      const chocaCon = items.find(
        (x) => x.uid !== uid && x.tourDate === cambios.tourDate,
      );
      if (chocaCon) {
        setError(t.yaTienesEseDiaError(nombreCorto(chocaCon.tourSlug, chocaCon.tourName, locale)));
        return;
      }
    }
    setError("");
    let nuevos = actualizarItem(uid, cambios);
    // La fecha mueve el precio: un recorrido hasta el 29 oct lleva la promo de
    // temporada baja y uno después no. Se vuelve a tarifar el renglón.
    if (cambios.tourDate !== undefined) {
      const it = nuevos.find((x) => x.uid === uid);
      const retarifado = it ? retarifarItem(it) : it;
      if (it && retarifado && retarifado.total !== it.total) nuevos = actualizarItem(uid, { total: retarifado.total });
    }
    setItems(nuevos);
    // Si ya se había intentado pagar, el aviso se actualiza en vivo: arreglar el
    // renglón lo apaga sin tener que volver a pulsar el botón.
    setFallos((f) => (f.length ? validarCarrito(nuevos, locale) : f));
    setCobro(null); // cualquier cambio invalida el importe ya calculado
  }

  /**
   * Activa, quita o cambia la cantidad de una actividad opcional. Igual que con
   * las personas, aquí solo se recalcula lo que se PINTA: el importe que se
   * cobra lo vuelve a sacar `computeTourCharge` en el servidor.
   */
  function cambiarAddOn(i: CarritoItem, id: string, cantidad: number) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    const cat  = tour?.addOns?.find((a) => a.id === id);
    if (!tour || !cat) return;
    const otros   = (i.addOns ?? []).filter((a) => a.id !== id);
    const nuevos  = cantidad > 0 ? [...otros, { id, cantidad }] : otros;
    // `totalRecorrido`, no `calcTourTotal` a pelo: con una sola persona aplica
    // la tarifa de viajero solo, y en el Edén la del grupo completo.
    const base = totalRecorrido(tourEnFecha(tour, i.tourDate), i.adults, i.childrenMid, i.childrenSmall);
    const extras = nuevos.reduce((s, a) => {
      const c = tour.addOns?.find((x) => x.id === a.id);
      return s + (c ? c.precio * a.cantidad : 0);
    }, 0);
    cambiar(i.uid, { addOns: nuevos, total: base + extras });
  }

  /**
   * Cambia ruta, vehículo o unidades de un tour cobrado por vehículo y vuelve a
   * sacar el precio de la matriz flota × ruta — la misma que usa el servidor en
   * `computeVehiculoCharge`.
   */
  /** Agrega un recorrido desde la lista, sin fecha: se elige aquí mismo. */
  function agregarDelCatalogo(slug: string) {
    const item = itemDesdeSlug(slug);
    if (!item) return;
    setItems(agregarAlCarrito(item));
    setCobro(null);
  }

  function cambiarVehiculo(i: CarritoItem, cambios: { ruta?: string; vehiculo?: string; unidades?: number }) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    if (!tour?.rutas || !tour?.flota) return;
    const ruta     = cambios.ruta     ?? i.ruta ?? tour.rutas[0].nombre;
    const vehiculo = cambios.vehiculo ?? i.vehiculo ?? tour.flota[0].nombre;
    const unidades = cambios.unidades ?? i.unidades ?? 1;
    const idxRuta  = tour.rutas.findIndex((r) => r.nombre === ruta);
    const veh      = tour.flota.find((v) => v.nombre === vehiculo);
    if (idxRuta < 0 || !veh) return;
    cambiar(i.uid, { ruta, vehiculo, unidades, total: (veh.precios[idxRuta] ?? 0) * unidades });
  }

  /** Suma o resta gente y vuelve a calcular el subtotal que se muestra. */
  /**
   * Suma o resta gente de un tramo concreto y recalcula el subtotal.
   *
   * `totalRecorrido` es la MISMA cuenta que hace el servidor, así que los
   * tramos de menor (70 % de 6 a 10 años, 50 % por debajo de 6), la tarifa de
   * viajero solo y la del grupo completo salen igual aquí que al cobrar.
   */
  function cambiarPersonas(
    i: CarritoItem,
    campo: "adults" | "childrenMid" | "childrenSmall",
    delta: number,
  ) {
    const tour = TOURS_DB.find((t) => t.slug === i.tourSlug);
    if (!tour) return;

    // Los adultos no pueden bajar del mínimo del tour; los menores sí llegan a
    // cero. Y entre todos no pueden pasar del cupo. Los recorridos que salen
    // desde 2 bajan hasta UN adulto: viaja solo, con su tarifa (tourBooking.ts).
    const piso  = campo === "adults"
      ? (aceptaViajeroSolo(tour) ? 1 : Math.max(1, tour.groupMin))
      : 0;
    const otros = (["adults", "childrenMid", "childrenSmall"] as const)
      .filter((c) => c !== campo)
      .reduce((s, c) => s + (i[c] ?? 0), 0);
    const valor = Math.min(
      tour.groupMax - otros,
      Math.max(piso, (i[campo] ?? 0) + delta),
    );

    const adultos       = campo === "adults"        ? valor : i.adults;
    const childrenMid   = campo === "childrenMid"   ? valor : i.childrenMid;
    const childrenSmall = campo === "childrenSmall" ? valor : i.childrenSmall;

    // El mínimo del tour (el rafting no sale con menos de 5) cuenta a TODOS los
    // que van, no solo a los adultos.
    const bajaDelPiso = delta < 0 && (
      valor === (i[campo] ?? 0) || adultos + childrenMid + childrenSmall < minimoPersonas(tour)
    );
    if (bajaDelPiso && campo === "adults") {
      setEnElPiso((s) => (s.has(i.uid) ? s : new Set(s).add(i.uid)));
    }
    if (adultos + childrenMid + childrenSmall < minimoPersonas(tour)) return;

    // Con el precio de la fecha del renglón: la promo de temporada baja solo
    // va en recorridos hasta el 29 oct.
    const total = totalRecorrido(tourEnFecha(tour, i.tourDate), adultos, childrenMid, childrenSmall);
    // Los add-ons se topan a la gente que va: si el grupo baja, la actividad
    // opcional no puede quedar contratada para más personas de las que quedan.
    const addOns = (i.addOns ?? [])
      .map((a) => ({ ...a, cantidad: Math.min(a.cantidad, adultos + childrenMid + childrenSmall) }))
      .filter((a) => a.cantidad > 0);
    const extras = addOns.reduce((s, a) => {
      const c = tour.addOns?.find((x) => x.id === a.id);
      return s + (c ? c.precio * a.cantidad : 0);
    }, 0);
    cambiar(i.uid, { adults: adultos, childrenMid, childrenSmall, addOns, total: total + extras });
  }

  // Sin fecha no se puede cobrar: el servidor la valida, pero es mejor decirlo
  // aquí que dejar que el pago falle con un error genérico.
  const sinFechaItems = items.filter((i) => !i.tourDate);
  const conFechaItems = [...items]
    .filter((i) => i.tourDate)
    .sort((a, b) => a.tourDate.localeCompare(b.tourDate));
  const sinFecha = sinFechaItems.length;

  /**
   * Guarda el carrito y manda la cotización por correo.
   *
   * Es la fuga más cara que tenía el motor: quien se iba sin pagar no dejaba
   * rastro, y la secuencia de tres recordatorios que ya existe no tenía a quién
   * escribirle.
   */
  async function guardarCotizacion() {
    const correo = correoGuardar.trim() || email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrorGuardar(t.correoInvalido);
      return;
    }
    setGuardando(true);
    setErrorGuardar("");
    try {
      const r = await fetch("/api/tours/guardar-carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // La pidió con el botón: se manda aunque el carrito ya estuviera
          // guardado (por ejemplo, en silencio al llenar sus datos).
          enviarCotizacion: true,
          email: correo, phone: phone || null, items,
          // El idioma viaja con la cotización: define en qué idioma salen el
          // correo inmediato y los tres recordatorios del cron.
          locale,
          // El hospedaje y el traslado también: sin esto la cotización llegaba
          // sin lo que más sube el ticket, y al volver por el link se perdía.
          hospedaje: conHotel ? { habitaciones: habs, noches, checkin, checkout } : null,
          traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
            ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
            : null,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setErrorGuardar(d?.error || t.noSePudoGuardar);
      } else {
        setGuardado(true);
        trackTourEvent("LEAD_CARRITO_GUARDADO", { recorridos: items.length, amount: total });
      }
    } catch {
      setErrorGuardar(t.sinConexion);
    }
    setGuardando(false);
  }

  /**
   * Guarda el carrito SIN mandar la cotización, en cuanto deja sus datos en el
   * checkout rediseñado. Así los recordatorios del cron funcionan aunque no
   * llegue a pagar (antes solo se guardaba si pulsaba «Enviar»: casi nadie).
   * Nunca bloquea ni avisa: si falla, el pago sigue igual.
   */
  function guardarSilencioso() {
    if (!email.trim() || !items.some((i) => i.tourDate)) return;
    void fetch("/api/tours/guardar-carrito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        silencioso: true,
        email: email.trim(), phone: phone || null, items, locale,
        hospedaje: conHotel ? { habitaciones: habs, noches, checkin, checkout } : null,
        traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
          ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
          : null,
      }),
    }).catch(() => {});
  }

  /** Lleva la vista al renglón que falla y lo resalta. */
  function irAlRenglon(uid: string) {
    renglonRefs.current[uid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setResaltado(uid);
    setTimeout(() => setResaltado((r) => (r === uid ? null : r)), 2600);
  }

  /** Lleva al renglón cuya fecha ya no tuvo lugar al apartar (`ApartadoAviso`). */
  function irAlSinLugar() {
    const s = apartado.sinCupo[0];
    const it = s ? items.find((i) => i.tourSlug === s.slug && i.tourDate === s.fecha) : undefined;
    if (it) irAlRenglon(it.uid);
  }

  /**
   * Si quitan recorridos y el viaje baja del umbral, la casilla desaparece de
   * la pantalla: hay que apagarla también por dentro. Si no, al volver a subir
   * el total se cobraría el 100 % sin que nadie lo haya vuelto a pedir.
   */
  useEffect(() => {
    if (!puedePagarTodo && pagarTodo) {
      setPagarTodo(false);
      setCobro(null);
    }
  }, [puedePagarTodo, pagarTodo]);

  /** Cambiar cuánto se paga hoy cambia el importe: el PaymentIntent de antes ya no vale. */
  function cambiarPagarTodo(valor: boolean) {
    setPagarTodo(valor);
    setCobro(null);
  }

  async function irAlPago() {
    const fallos = validarCarrito(items, locale);
    setFallos(fallos);
    if (fallos.length > 0) {
      // El aviso ya NO se queda solo junto al botón: se lleva a la persona al
      // recorrido que lo causa, que es lo único accionable.
      setError("");
      irAlRenglon(fallos[0].uid);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError(t.necesitamosNombreCorreo);
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/tours/carrito-payment-intent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName:  name.trim(),
          customerEmail: email.trim(),
          sid:           sessionId(),
          // Identidad de Google Analytics. Viaja hasta la metadata de Stripe
          // porque el webhook —que es quien se entera SIEMPRE de la compra— no
          // tiene cookies: sin esto la venta le llegaría a GA4 sin canal de
          // origen, que es justo lo que se quiere medir.
          gaClientId:    ga4ClientId(),
          items,
          hospedaje: conHotel
            ? { habitaciones: habs, noches, checkin, checkout }
            : null,
          // Solo si hay tarifa para ese grupo. Arriba de 12 no la hay y se
          // cotiza a mano: mandarlo igual hacía que el servidor rechazara el
          // pago ENTERO, no solo el traslado.
          traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
            ? { ciudad: rutaTraslado.slug, personas: paxTraslado }
            : null,
          // El idioma viaja hasta la metadata de Stripe: si el cliente cierra la
          // pestaña, el webhook levanta la reserva y necesita saber en qué
          // idioma mandarle su confirmación.
          locale,
          paymentIntentIdPrevio: ultimoPagoRef.current,
          // Su apartado: el cobro no lo cuenta en su contra, lo renueva 15
          // minutos y lo deja en la metadata para soltarlo al crear la reserva.
          apartadoId: apartado.apartadoId || null,
          // Si eligió pagar completo. El servidor NO se fía: comprueba él mismo
          // que el total llegue al umbral antes de cobrar el 100 %.
          pagarTodo: pagarTodo && puedePagarTodo,
          // En qué idioma tiene que salir el guía. Viaja hasta la metadata de
          // Stripe porque el webhook —que es quien se entera SIEMPRE de la
          // compra— es el que escribe la reserva si se cierra la pestaña.
          guiaIngles,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.noSePudoIniciar);
        setCargando(false);
        return;
      }
      ultimoPagoRef.current = data.paymentIntentId ?? null;
      setCobro(data);
      // Ya en la pantalla de pago, el reloj vuelve a empezar (solo si el
      // servidor de verdad renovó el apartado).
      if (typeof data.apartadoVence === "number") apartado.renovado(data.apartadoVence, data.ahora);
    } catch {
      setError(t.noSePudoConectar);
    }
    setCargando(false);
  }

  return {
    pagarTodo, cambiarPagarTodo, puedePagarTodo, pctBase,
    guiaIngles, setGuiaIngles,
    locale, en, lp, t, items, setItems, montado, setMontado, hidratando, setHidratando,
    name, setName, email, setEmail, phone, setPhone, pickup, setPickup, cobro,
    setCobro, mostrarLista, setMostrarLista, conHotel, setConHotel, conTraslado,
    setConTraslado, ciudadTraslado, setCiudadTraslado, extrasListos, setExtrasListos,
    paxTraslado, setPaxTraslado, habs, setHabs, galeria, setGaleria, checkin,
    setCheckin, checkout, setCheckout, error, setError, cargando, setCargando,
    nombreRef, renglonRefs, recienLlegado, setRecienLlegado, enElPiso, setEnElPiso,
    fallos, setFallos, resaltado, setResaltado, correoGuardar, setCorreoGuardar,
    guardando, setGuardando, guardado, setGuardado, errorGuardar, setErrorGuardar,
    hidratarDesdeUrl, minDate, noches, huespedes, rutaTraslado, precioDelTraslado,
    totalTraslado, hotelQuote, totalHotel, resumen, dias, total, pctHoy, anticipo,
    saldo, toursCarrito, lineasSalida, respuestaSalidas, horaDe, conCancelPropia,
    todosCancelPropia, nombreCat, cancelacionDe, respuestaCancelar,
    cancelPropiaEnCarrito, waRescate, quitar, cambiar, cambiarAddOn,
    agregarDelCatalogo, cambiarVehiculo, cambiarPersonas, sinFechaItems, conFechaItems,
    sinFecha, guardarCotizacion, guardarSilencioso, irAlRenglon, irAlPago,
    apartado, irAlSinLugar,
  };
}

export type CarritoCheckout = ReturnType<typeof useCarritoCheckout>;
