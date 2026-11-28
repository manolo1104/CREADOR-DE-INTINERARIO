/**
 * La cotización como PDF de verdad (27 nov 2026). Mismo diseño que
 * `htmlCotizacion.ts` y los mismos datos (`datosCotizacion`). Hoja A4 completa;
 * si hay muchos renglones, sigue en otra página sin partir un renglón.
 */
import React from "react";
import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { DatosCotizacion } from "@/lib/documentos/datosCotizacion";
import { C, mm, recurso, limpio, dinero, Palomita, base, registrarFuentes } from "./base";

const LINEA = "#d3ccb8";

const s = StyleSheet.create({
  pagina: { ...base.pagina, paddingTop: mm(10), paddingBottom: mm(12), paddingHorizontal: mm(14) },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: mm(4), borderBottomWidth: 0.7, borderBottomColor: "#cfc8b4" },
  logo: { height: mm(12), width: mm(12) * 916.1 / 199.04 },
  contacto: { fontFamily: "DMMono", fontSize: 7, lineHeight: 1.5, color: C.tinta65, marginTop: mm(2) },
  sello: { width: mm(18), height: mm(18) },
  titulo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: mm(3) },
  h1: { fontFamily: "Cormorant", fontWeight: 300, fontSize: 28, lineHeight: 1 },
  h1em: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 28, color: C.dorado, lineHeight: 1 },
  metaFila: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingVertical: mm(1), borderBottomWidth: 0.6, borderBottomColor: LINEA },
  metaK: { ...base.etiqueta, color: C.tinta55, marginRight: mm(6) },
  metaV: { fontFamily: "DMMono", fontSize: 8.5 },
  dosCol: { flexDirection: "row", marginTop: mm(4) },
  tarjeta: { flex: 1, borderWidth: 0.6, borderColor: LINEA, paddingVertical: mm(4), paddingHorizontal: mm(5) },
  oscura: { backgroundColor: C.negro, borderColor: C.negro, marginLeft: mm(5) },
  h3: { fontFamily: "Cormorant", fontWeight: 300, fontSize: 13.5, marginBottom: mm(2.5) },
  campos: { flexDirection: "row", flexWrap: "wrap" },
  campo: { width: "50%", marginBottom: mm(2.5), paddingRight: mm(3) },
  campoAncho: { width: "100%", marginBottom: mm(1) },
  k: { ...base.etiqueta, fontSize: 6.5 },
  v: { fontSize: 9, lineHeight: 1.3, marginTop: 1.5 },
  tabla: { marginTop: mm(4) },
  thFila: { flexDirection: "row", paddingVertical: mm(2), borderBottomWidth: 1.6, borderBottomColor: C.negro },
  th: { fontSize: 7, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 500 },
  fila: { flexDirection: "row", paddingVertical: mm(2.5), borderBottomWidth: 0.6, borderBottomColor: LINEA },
  colNombre: { flex: 1, paddingRight: mm(3) },
  colFecha: { width: mm(28) },
  colCant: { width: mm(18), textAlign: "right" },
  colImp: { width: mm(28), textAlign: "right" },
  nombre: { fontFamily: "Cormorant", fontSize: 11.5, lineHeight: 1.15 },
  sub: { fontSize: 7.3, color: C.tinta65, lineHeight: 1.35, marginTop: 1 },
  num: { fontFamily: "DMMono", fontSize: 8.5 },
  imp: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 12.5, color: C.terracota, textAlign: "right" },
  totales: { flexDirection: "row", marginTop: mm(4) },
  nota: { flex: 1, fontSize: 7.5, lineHeight: 1.5, color: C.tinta65, paddingRight: mm(6) },
  notaB: { color: C.negro, fontWeight: 500 },
  calc: { width: mm(68) },
  linea: { flexDirection: "row", justifyContent: "space-between", paddingVertical: mm(0.9), fontSize: 8.5 },
  gran: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.negro, paddingVertical: mm(3), paddingHorizontal: mm(4), marginTop: mm(2) },
  granK: { fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase", color: C.crema },
  granV: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 19, color: C.dorado },
  checks: { flexDirection: "row", marginTop: mm(5) },
  checkCol: { flex: 1 },
  h4: { fontFamily: "Cormorant", fontSize: 12, marginBottom: mm(2) },
  lista: { flexDirection: "row", flexWrap: "wrap" },
  item: { width: "50%", flexDirection: "row", alignItems: "flex-start", marginBottom: mm(1.2), paddingRight: mm(3) },
  itemTxt: { fontSize: 7.5, lineHeight: 1.3, marginLeft: 4, flex: 1 },
  cruz: { fontSize: 8, color: C.terracota, fontWeight: 700, width: 7, lineHeight: 1.1 },
  pie: { flexDirection: "row", alignItems: "center", marginTop: mm(6), paddingTop: mm(4), borderTopWidth: 0.7, borderTopColor: "#cfc8b4" },
  terminos: { flex: 1, fontSize: 7.5, lineHeight: 1.45, color: C.tinta65, paddingRight: mm(6) },
  cta: { backgroundColor: C.negro, paddingVertical: mm(3), paddingHorizontal: mm(6), alignItems: "center", textDecoration: "none" },
  ctaLbl: { fontSize: 6.8, letterSpacing: 2, textTransform: "uppercase", color: C.lima },
  ctaNum: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 13.5, color: C.dorado, marginTop: 2 },
  corrido: { position: "absolute", bottom: mm(5), left: mm(14), right: mm(14), flexDirection: "row", justifyContent: "space-between", fontSize: 7, letterSpacing: 2, color: "rgba(14,23,16,0.4)", textTransform: "uppercase" },
});

function Campo({ k, v, oscura, ancho, chico }: { k: string; v: string; oscura?: boolean; ancho?: boolean; chico?: boolean }) {
  return (
    <View style={ancho ? s.campoAncho : s.campo}>
      <Text style={[s.k, { color: oscura ? "rgba(244,237,216,0.55)" : C.tinta55 }]}>{k}</Text>
      <Text style={[s.v, chico ? { fontSize: 7.8 } : {}, oscura ? { color: C.crema } : {}]}>{v}</Text>
    </View>
  );
}

export function PdfCotizacion({ d }: { d: DatosCotizacion }) {
  registrarFuentes();
  return (
    <Document title={`Cotización ${d.folio}`} author="Huasteca Potosina Tours" creator="Huasteca Potosina Tours">
      <Page size="A4" style={s.pagina}>
        <View style={{ flexGrow: 1 }}>
          <View style={s.head}>
            <View>
              <Image src={recurso("logo-color.png")} style={s.logo} />
              <Text style={s.contacto}>
                Manolo Covarrubias · guía local{"\n"}hola@huasteca-potosina.com · WhatsApp +52 489 109 0388{"\n"}Xilitla, San Luis Potosí, México · Operador SECTUR
              </Text>
            </View>
            <Image src={recurso("sello-color.png")} style={s.sello} />
          </View>

          <View style={s.titulo}>
            <View>
              <Text style={s.h1}>Cotización</Text>
              <Text style={s.h1em}>Nº {d.folio}</Text>
            </View>
            <View style={{ width: mm(62) }}>
              <View style={s.metaFila}><Text style={s.metaK}>Emitida</Text><Text style={s.metaV}>{d.emitida}</Text></View>
              <View style={s.metaFila}><Text style={s.metaK}>Vigencia</Text><Text style={s.metaV}>{d.vigencia}</Text></View>
            </View>
          </View>

          <View style={s.dosCol} wrap={false}>
            <View style={s.tarjeta}>
              <Text style={s.h3}>Cliente</Text>
              <View style={s.campos}>
                <Campo k="Nombre" v={limpio(d.cliente.nombre)} />
                <View style={s.campo}>
                  <Text style={[s.k, { color: C.tinta55 }]}>Personas</Text>
                  <Text style={s.v}>{d.personas}</Text>
                  <Text style={{ fontSize: 7, color: "rgba(14,23,16,0.5)" }}>{d.desglosePersonas}</Text>
                </View>
                <Campo k="WhatsApp" v={limpio(d.cliente.telefono) || "—"} />
                <Campo k="Email" v={limpio(d.cliente.email) || "—"} chico />
                {d.cliente.notas ? <Campo k="Notas" v={limpio(d.cliente.notas)} ancho chico /> : null}
              </View>
            </View>
            <View style={[s.tarjeta, s.oscura]}>
              <Text style={[s.h3, { color: C.crema }]}>Detalles del viaje</Text>
              <View style={s.campos}>
                <Campo k="Fecha inicio" v={d.fechaInicio} oscura />
                <Campo k="Fecha fin" v={d.fechaFin} oscura />
                <Campo k="Duración" v={`${d.duracionDias} día${d.duracionDias !== 1 ? "s" : ""}`} oscura />
                <Campo k="Hospedaje" v={limpio(d.hospedaje)} oscura chico />
                <Campo k="Recogida" v={d.recogida.map(limpio).join("\n")} oscura ancho chico={d.recogida.length > 1} />
              </View>
            </View>
          </View>

          <View style={s.tabla}>
            <View style={s.thFila} fixed>
              <Text style={[s.th, s.colNombre]}>Concepto</Text>
              <Text style={[s.th, s.colFecha]}>Fecha</Text>
              <Text style={[s.th, s.colCant]}>Pers.</Text>
              <Text style={[s.th, s.colImp]}>Subtotal MXN</Text>
            </View>
            {d.renglones.map((r, i) => (
              <View key={i} style={s.fila} wrap={false}>
                <View style={s.colNombre}>
                  <Text style={s.nombre}>{limpio(r.nombre)}</Text>
                  {r.subs.map((x, j) => <Text key={j} style={s.sub}>{limpio(x)}</Text>)}
                  {r.opcionales.map((x, j) => <Text key={`o${j}`} style={[s.sub, { color: C.terracota }]}>{limpio(x)}</Text>)}
                </View>
                <Text style={[s.num, s.colFecha]}>{limpio(r.fecha)}</Text>
                <Text style={[s.num, s.colCant]}>{limpio(r.cantidad)}</Text>
                <Text style={[s.imp, s.colImp]}>{dinero(r.importe)}</Text>
              </View>
            ))}
          </View>

          <View style={s.totales} wrap={false}>
            <Text style={s.nota}>
              <Text style={s.notaB}>Sobre los precios: </Text>Todos los importes están en <Text style={s.notaB}>pesos mexicanos (MXN)</Text>. Vigencia: <Text style={s.notaB}>{d.vigenciaLabel}</Text>, hasta el <Text style={s.notaB}>{d.vigencia}</Text>. Tarifas sujetas a disponibilidad al confirmar.
            </Text>
            <View style={s.calc}>
              <View style={s.linea}><Text>Subtotal tours</Text><Text style={s.num}>{dinero(d.toursTotal)}</Text></View>
              {d.pkgsTotal > 0 ? <View style={s.linea}><Text>Subtotal hospedaje</Text><Text style={s.num}>{dinero(d.pkgsTotal)}</Text></View> : null}
              {d.extrasTotal > 0 ? <View style={s.linea}><Text>Subtotal extras</Text><Text style={s.num}>{dinero(d.extrasTotal)}</Text></View> : null}
              {d.ajuste !== 0 ? <View style={s.linea}><Text>Ajuste de precio</Text><Text style={s.num}>{d.ajuste > 0 ? "+" : "-"}{dinero(Math.abs(d.ajuste))}</Text></View> : null}
              {d.descuento > 0 ? <View style={[s.linea, { borderBottomWidth: 0.6, borderBottomColor: LINEA }]}><Text>Descuento aplicado</Text><Text style={s.num}>-{dinero(d.descuento)}</Text></View> : null}
              <View style={s.gran}><Text style={s.granK}>Total</Text><Text style={s.granV}>{dinero(d.total)}</Text></View>
              <View style={[s.linea, { color: C.terracota, fontWeight: 500 }]}><Text>Anticipo para reservar ({d.anticipoPct} %)</Text><Text style={s.num}>{dinero(d.anticipo)}</Text></View>
              <View style={s.linea}><Text>Saldo al inicio del tour</Text><Text style={s.num}>{dinero(d.saldo)}</Text></View>
            </View>
          </View>

          {/* Puede seguir en la otra página (una lista larga de «Sí incluye» no debe
              brincar entera y dejar media hoja en blanco); cada renglón, entero. */}
          <View style={s.checks}>
            <View style={[s.checkCol, { paddingRight: mm(6) }]}>
              <Text style={s.h4} minPresenceAhead={40}>Sí incluye</Text>
              <View style={s.lista}>
                {d.siIncluye.map((x, i) => <View key={i} style={s.item} wrap={false}><Palomita /><Text style={s.itemTxt}>{limpio(x)}</Text></View>)}
              </View>
            </View>
            <View style={s.checkCol}>
              <Text style={s.h4}>No incluye</Text>
              <View style={s.lista}>
                {d.noIncluye.map((x, i) => <View key={i} style={s.item}><Text style={s.cruz}>×</Text><Text style={[s.itemTxt, { color: C.tinta65 }]}>{x}</Text></View>)}
              </View>
            </View>
          </View>
        </View>

        <View style={s.pie} wrap={false}>
          <Text style={s.terminos}>
            Aparta con el anticipo por transferencia, OXXO o tarjeta (liga de pago, sin comisión); te confirmamos por WhatsApp. {limpio(d.cancelacion)} El resto se paga antes de iniciar el primer tour, en efectivo, transferencia o liga de pago.
          </Text>
          <Link src="https://wa.me/524891090388" style={s.cta}>
            <Text style={s.ctaLbl}>Confirmar por WhatsApp</Text>
            <Text style={s.ctaNum}>+52 489 109 0388</Text>
          </Link>
        </View>

        <View style={s.corrido} fixed>
          <Text>Cotización Nº {d.folio}</Text>
          <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} />
        </View>
      </Page>
    </Document>
  );
}
