/**
 * La confirmación de una reserva como PDF de verdad (27 nov 2026). Mismo
 * diseño que `htmlConfirmacion.ts` y los mismos datos (`datosConfirmacion`).
 * Hoja A4 completa, sin márgenes: el fondo crema llega a la orilla.
 */
import React from "react";
import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { DatosConfirmacion } from "@/lib/documentos/datosConfirmacion";
import { C, mm, recurso, limpio, dinero, Flecha, Palomita, Punto, base, registrarFuentes } from "./base";

const s = StyleSheet.create({
  hero: { backgroundColor: C.negro, paddingTop: mm(9), paddingBottom: mm(7), paddingHorizontal: mm(14) },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: mm(5) },
  logo: { height: mm(11), width: mm(11) * 916.1 / 199.04 },
  sello: { width: mm(16), height: mm(16) },
  heroFila: { flexDirection: "row", alignItems: "flex-end" },
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: C.verdeSelva, paddingVertical: mm(1.5), paddingHorizontal: mm(3) },
  badgeTxt: { color: "#ffffff", fontSize: 7, letterSpacing: 2.2, fontWeight: 700, textTransform: "uppercase", marginLeft: 4 },
  h1: { fontFamily: "Cormorant", fontWeight: 300, fontSize: 30, lineHeight: 0.98, color: C.crema, marginTop: mm(2) },
  h1em: { fontStyle: "italic", color: C.dorado },
  saludo: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 10.5, color: "rgba(244,237,216,0.8)", lineHeight: 1.4 },
  resumen: { backgroundColor: C.arena, flexDirection: "row", paddingVertical: mm(5), paddingHorizontal: mm(14) },
  resItem: { flex: 1, paddingRight: mm(4) },
  resK: { ...base.etiqueta, color: C.verdeSelva, marginBottom: mm(1.5) },
  resV: { fontFamily: "Cormorant", fontSize: 12.5, lineHeight: 1.1 },
  resIt: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 12.5, color: C.dorado, lineHeight: 1.1 },
  resMono: { fontFamily: "DMMono", fontSize: 9, lineHeight: 1.25 },
  resSub: { fontSize: 7, color: "rgba(14,23,16,0.5)", marginTop: mm(1) },
  cuerpo: { flexGrow: 1, flexDirection: "row", paddingVertical: mm(6), paddingHorizontal: mm(14) },
  izq: { flex: 1.5, paddingRight: mm(7) },
  der: { flex: 1 },
  h3: { fontFamily: "Cormorant", fontWeight: 300, fontSize: 14, marginBottom: mm(3) },
  dia: { flexDirection: "row", paddingVertical: mm(2.5), borderBottomWidth: 0.6, borderBottomColor: "#d8d1bd" },
  diaNum: { width: mm(10), fontFamily: "Cormorant", fontStyle: "italic", fontSize: 18, color: C.dorado, lineHeight: 1 },
  diaCentro: { flex: 1, paddingRight: mm(3) },
  diaNombre: { fontFamily: "Cormorant", fontWeight: 500, fontSize: 11.5, lineHeight: 1.15 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginTop: mm(0.8) },
  metaK: { fontSize: 6.5, letterSpacing: 1, textTransform: "uppercase", color: "rgba(14,23,16,0.4)" },
  metaV: { fontSize: 7.5, color: "rgba(14,23,16,0.62)", marginRight: mm(3) },
  pickup: { width: mm(32), backgroundColor: C.negro, paddingVertical: mm(2), paddingHorizontal: mm(3), alignItems: "flex-end" },
  pickK: { fontSize: 6.3, letterSpacing: 1.3, textTransform: "uppercase", color: C.lima },
  pickV: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 12.5, color: C.dorado, marginTop: 1 },
  pickW: { fontSize: 6.3, color: "rgba(244,237,216,0.7)", marginTop: 1, textAlign: "right", lineHeight: 1.25 },
  bloque: { marginTop: mm(4) },
  estancia: { paddingVertical: mm(2), borderBottomWidth: 0.6, borderBottomColor: "#d8d1bd", paddingLeft: mm(10) },
  sinHosp: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 10.5, color: "rgba(14,23,16,0.6)", paddingVertical: mm(1.5) },
  pago: { backgroundColor: C.arena, paddingVertical: mm(4), paddingHorizontal: mm(5) },
  pagoFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: mm(1.1), borderBottomWidth: 0.6, borderBottomColor: "#bfb08f", borderStyle: "dashed" },
  pagoK: { fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase", color: C.tinta55 },
  pagoV: { fontFamily: "DMMono", fontSize: 8.5 },
  empacar: { marginTop: mm(5), borderWidth: 0.6, borderColor: "#d3ccb8", backgroundColor: C.papel, paddingVertical: mm(4), paddingHorizontal: mm(5) },
  empLista: { flexDirection: "row", flexWrap: "wrap" },
  empItem: { width: "50%", flexDirection: "row", alignItems: "center", marginBottom: mm(1.2), paddingRight: mm(2) },
  empTxt: { fontSize: 7.5, marginLeft: 4 },
  terminos: { backgroundColor: C.negro, flexDirection: "row", paddingTop: mm(5), paddingBottom: mm(4.5), paddingHorizontal: mm(14) },
  termCol: { flex: 1, paddingRight: mm(6) },
  termH: { fontFamily: "Cormorant", fontWeight: 300, fontSize: 11.5, color: C.crema, marginBottom: mm(2) },
  termP: { fontSize: 7.5, lineHeight: 1.45, color: "rgba(244,237,216,0.75)" },
  termB: { color: C.dorado, fontWeight: 500 },
  pie: { backgroundColor: C.verdeProfundo, flexDirection: "row", alignItems: "center", paddingVertical: mm(5), paddingHorizontal: mm(14) },
  pieTxt: { flex: 1, fontFamily: "Cormorant", fontStyle: "italic", fontSize: 10.5, color: C.crema, lineHeight: 1.3, paddingRight: mm(8) },
  pieB: { color: C.dorado, fontStyle: "normal", fontWeight: 500 },
  wa: { backgroundColor: C.wa, flexDirection: "row", alignItems: "center", paddingVertical: mm(3), paddingHorizontal: mm(5), textDecoration: "none" },
  waLbl: { fontSize: 6.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#ffffff" },
  waNum: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 13, color: "#ffffff", marginTop: 1 },
});

const EMPACAR = [
  "Traje de baño (2)", "Sandalias acuáticas", "Tenis ligeros", "Bloqueador biodegradable", "Repelente",
  "Toalla microfibra", "Bolsa seca", "Identificación", "Efectivo", "Gorra o sombrero",
];

export function PdfConfirmacion({ d }: { d: DatosConfirmacion }) {
  registrarFuentes();
  return (
    <Document title={`Confirmación ${d.folio}`} author="Huasteca Potosina Tours" creator="Huasteca Potosina Tours">
      <Page size="A4" style={base.pagina}>
        <View style={{ flexGrow: 1 }}>
          {/* Encabezado */}
          <View style={s.hero}>
            <View style={s.heroTop}>
              <Image src={recurso("logo-reverso.png")} style={s.logo} />
              <Image src={recurso("sello-reverso.png")} style={s.sello} />
            </View>
            <View style={s.heroFila}>
              <View style={{ flex: 1.4, paddingRight: mm(7) }}>
                <View style={s.badge}><Palomita color="#ffffff" size={7} /><Text style={s.badgeTxt}>Reserva confirmada</Text></View>
                <Text style={s.h1}>Reserva <Text style={s.h1em}>Nº {d.folio}</Text></Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saludo}>
                  Hola <Text style={{ color: C.crema }}>{limpio(d.cliente)}</Text>, gracias por confiar en nosotros. Tu reserva quedó confirmada el {d.confirmadaEl}.
                </Text>
              </View>
            </View>
          </View>

          {/* Resumen */}
          <View style={s.resumen}>
            <View style={s.resItem}><Text style={s.resK}>{d.nTours > 1 ? "Tours" : "Tour"}</Text><Text style={s.resIt}>{limpio(d.tourResumen)}</Text></View>
            <View style={s.resItem}><Text style={s.resK}>Fechas</Text><Text style={s.resMono}>{d.fechas}</Text></View>
            <View style={s.resItem}><Text style={s.resK}>Personas</Text><Text style={s.resV}>{d.personas}</Text><Text style={s.resSub}>{d.desglosePersonas}</Text></View>
            <View style={s.resItem}>
              <Text style={s.resK}>Total · saldo</Text>
              <Text style={s.resIt}>{dinero(d.total)}</Text>
              {d.pendiente > 0
                ? <Text style={[s.resMono, { color: C.terracota, marginTop: mm(1) }]}>saldo {dinero(d.pendiente)}</Text>
                : <Text style={[s.resMono, { color: C.verdeSelva, marginTop: mm(1) }]}>pagado</Text>}
            </View>
          </View>

          {/* Cuerpo: itinerario | pago y qué empacar */}
          <View style={s.cuerpo}>
            <View style={s.izq}>
              <Text style={s.h3}>Itinerario <Text style={{ fontStyle: "italic", color: C.dorado }}>día por día</Text></Text>
              {d.dias.map((dia) => (
                <View key={dia.num} style={s.dia} wrap={false}>
                  <Text style={s.diaNum}>{dia.num}</Text>
                  <View style={s.diaCentro}>
                    <Text style={s.diaNombre}>{limpio(dia.nombre)}</Text>
                    <View style={s.meta}>
                      <Text style={s.metaV}><Text style={s.metaK}>Fecha </Text>{dia.fecha}</Text>
                      {dia.duracion ? <Text style={s.metaV}><Text style={s.metaK}>Dur. </Text>{dia.duracion}</Text> : null}
                      {dia.dificultad ? <Text style={s.metaV}><Text style={s.metaK}>Dif. </Text>{dia.dificultad}</Text> : null}
                      {dia.opcionales.map((o) => <Text key={o} style={s.metaV}><Text style={s.metaK}>Incluye </Text>{limpio(o)}</Text>)}
                    </View>
                  </View>
                  <View style={s.pickup}>
                    <Text style={s.pickK}>{dia.etiqueta}</Text>
                    <Text style={s.pickV}>{dia.hora}</Text>
                    <Text style={s.pickW}>{limpio(dia.donde)}</Text>
                  </View>
                </View>
              ))}

              <View style={s.bloque}>
                <Text style={[s.h3, { marginBottom: mm(2) }]}>Hospedaje</Text>
                {d.estancias.length ? d.estancias.map((e, i) => (
                  <View key={i} style={s.estancia} wrap={false}>
                    <Text style={s.diaNombre}>{limpio(e.habitacion)}</Text>
                    <View style={s.meta}>
                      {e.hotel ? <Text style={s.metaV}><Text style={s.metaK}>Hotel </Text>{limpio(e.hotel)}</Text> : null}
                      <Text style={s.metaV}><Text style={s.metaK}>Habitaciones </Text>{e.habitaciones}</Text>
                      <Text style={s.metaV}><Text style={s.metaK}>Noches </Text>{e.noches}</Text>
                      {e.fechas ? <Text style={s.metaV}><Text style={s.metaK}>Estancia </Text>{limpio(e.fechas)}</Text> : null}
                    </View>
                  </View>
                )) : <Text style={s.sinHosp}>Sin hospedaje — esta reserva es solo de tours.</Text>}
              </View>

              {d.extras.length ? (
                <View style={s.bloque}>
                  <Text style={[s.h3, { marginBottom: mm(2) }]}>Incluye además</Text>
                  {d.extras.map((ex, i) => (
                    <View key={i} style={s.estancia} wrap={false}>
                      <Text style={s.diaNombre}>{limpio(ex.concepto)}</Text>
                      <View style={s.meta}>
                        {ex.detalle ? <Text style={s.metaV}>{limpio(ex.detalle)}</Text> : null}
                        {ex.cantidad > 1 ? <Text style={s.metaV}><Text style={s.metaK}>Cantidad </Text>{ex.cantidad}</Text> : null}
                        <Text style={s.metaV}><Text style={s.metaK}>{ex.incluido ? "Costo " : "Importe "}</Text>{ex.monto}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={s.der}>
              <View style={s.pago} wrap={false}>
                <Text style={s.h3}>Pago</Text>
                <View style={s.pagoFila}><Text style={s.pagoK}>Anticipo pagado</Text><Text style={s.pagoV}>{d.deposito > 0 ? dinero(d.deposito) : "—"}</Text></View>
                <View style={s.pagoFila}><Text style={s.pagoK}>Saldo pendiente</Text><Text style={s.pagoV}>{dinero(d.pendiente)}</Text></View>
                <View style={[s.pagoFila, d.folioPago ? {} : { borderBottomWidth: 0 }]}><Text style={s.pagoK}>Método</Text><Text style={s.pagoV}>{limpio(d.metodoPago)}</Text></View>
                {d.folioPago ? <View style={[s.pagoFila, { borderBottomWidth: 0 }]}><Text style={s.pagoK}>Folio</Text><Text style={s.pagoV}>{limpio(d.folioPago)}</Text></View> : null}
              </View>
              <View style={s.empacar} wrap={false}>
                <Text style={s.h3}>Qué empacar</Text>
                <View style={s.empLista}>
                  {EMPACAR.map((x) => <View key={x} style={s.empItem}><Flecha /><Text style={s.empTxt}>{x}</Text></View>)}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Condiciones y firma, siempre al pie */}
        <View wrap={false}>
          <View style={s.terminos}>
            <View style={s.termCol}>
              <Text style={s.termH}>Cancelación</Text>
              <Text style={s.termP}>{d.cancelacion.map((t, i) => t.fuerte ? <Text key={i} style={s.termB}>{t.texto}</Text> : t.texto)}</Text>
            </View>
            <View style={s.termCol}>
              <Text style={s.termH}>Saldo</Text>
              <Text style={s.termP}>El <Text style={s.termB}>saldo de {dinero(d.pendiente)} MXN</Text> se paga antes de iniciar el primer tour, en efectivo o transferencia. Con tarjeta: liga de pago, sin comisión (el guía no lleva terminal).</Text>
            </View>
            <View style={[s.termCol, { paddingRight: 0 }]}>
              <Text style={s.termH}>El día del tour</Text>
              <Text style={s.termP}>Tu guía coordinará por <Text style={s.termB}>WhatsApp</Text> la hora exacta y el punto de recogida. Lleva esta confirmación impresa o en pantalla.</Text>
            </View>
          </View>
          <View style={s.pie}>
            <Text style={s.pieTxt}><Text style={s.pieB}>Manolo Covarrubias</Text>, fundador & guía local · Xilitla, SLP — gracias por elegir vivir la Huasteca con nosotros.</Text>
            <Link src="https://wa.me/524891090388" style={s.wa}>
              <Punto />
              <View style={{ marginLeft: mm(3) }}>
                <Text style={s.waLbl}>WhatsApp soporte</Text>
                <Text style={s.waNum}>+52 489 109 0388</Text>
              </View>
            </Link>
          </View>
        </View>
      </Page>
    </Document>
  );
}
