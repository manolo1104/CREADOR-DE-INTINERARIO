// Prueba de fechas y horas con el reloj FIJO y la hora de MÉXICO, SIN red.
// 🔴 El contenedor de Railway corre en UTC: de 6 pm a medianoche el bot creía
// que ya era «mañana» y rechazaba los tours para mañana (7 de los 26 chats
// reales escribieron justo a esa hora). Aquí se fija el reloj en esas horas.
// Uso: node test-fecha.js
//
// El horario del equipo se fija aquí para que un HORARIO_HUMANO distinto en el
// .env no cambie el resultado.
process.env.HORARIO_HUMANO = "08:00-21:00";

const assert = require("assert");
const horario = require("./horario");
const { hoyMX, promoDe, promoAplica, precioEnFecha, precioLista, aceptaViajeroSolo, vaBajoElMinimo, CONFIRMA_SALIDA_DIAS, descuentoPorGrupo, precioPorCabezaEnFecha } = require("./catalog");
const { validarFecha, normalizarHora } = require("./agent");
const medios = require("./medios");

let fallas = 0;
function prueba(nombre, fn) {
  try { fn(); console.log(`  ✅ ${nombre}`); }
  catch (e) { fallas++; console.log(`  ❌ ${nombre}\n     ${e.message}`); }
}

/** Un instante dado en hora de México (UTC−6 todo el año desde 2022). */
const mx = (ymd, hhmm) => new Date(`${ymd}T${hhmm}:00-06:00`);
const conHorario = (valor, fn) => {
  const antes = process.env.HORARIO_HUMANO;
  process.env.HORARIO_HUMANO = valor;
  try { return fn(); } finally { process.env.HORARIO_HUMANO = antes; }
};

console.log("\n📅 Fechas y horas (hora de México, reloj fijo)\n");

prueba("fechaMexico: a las 7 pm de México sigue siendo HOY (en UTC ya es mañana)", () => {
  const d = mx("2026-11-10", "19:00");
  assert.equal(d.toISOString().slice(0, 10), "2026-11-11", "la cuenta UTC de la prueba está mal");
  assert.equal(horario.fechaMexico(d), "2026-11-10");
  assert.equal(horario.minutosEnMexico(d), 19 * 60);
  assert.equal(hoyMX(d.getTime()), "2026-11-10", "catalog.hoyMX");
});

prueba("sumarDias cruza meses, años y bisiestos", () => {
  assert.equal(horario.sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(horario.sumarDias("2028-02-28", 1), "2028-02-29");
  assert.equal(horario.sumarDias("2026-11-10", -10), "2026-10-31");
});

prueba("enHorarioHumano: de 8 am a 9 pm de México", () => {
  assert.equal(horario.enHorarioHumano(mx("2026-11-10", "07:59")), false);
  assert.equal(horario.enHorarioHumano(mx("2026-11-10", "08:00")), true);
  assert.equal(horario.enHorarioHumano(mx("2026-11-10", "19:00")), true);
  assert.equal(horario.enHorarioHumano(mx("2026-11-10", "21:00")), false);
  assert.equal(horario.enHorarioHumano(mx("2026-11-10", "23:30")), false);
});

prueba("un horario que cruza la medianoche (20:00-02:00)", () => {
  conHorario("20:00-02:00", () => {
    assert.equal(horario.enHorarioHumano(mx("2026-11-10", "01:00")), true);
    assert.equal(horario.enHorarioHumano(mx("2026-11-10", "12:00")), false);
  });
});

prueba("HORARIO_HUMANO mal escrito → el de por omisión, sin tumbar nada", () => {
  const warn = console.warn;
  const avisos = [];
  console.warn = (...a) => avisos.push(a.join(" "));
  try {
    const h = horario.leerHorario("de ocho a nueve");
    assert.deepEqual([h.abre, h.cierra], [8 * 60, 21 * 60]);
    horario.leerHorario("de ocho a nueve");
    assert.equal(avisos.length, 1, "el aviso del log sale una sola vez por valor");
  } finally {
    console.warn = warn;
  }
});

prueba("proximaApertura: a las 10 pm → mañana 8 am; a las 3 am → hoy 8 am", () => {
  assert.equal(horario.proximaApertura(mx("2026-11-10", "22:00")).toISOString(), mx("2026-11-11", "08:00").toISOString());
  assert.equal(horario.proximaApertura(mx("2026-11-11", "03:00")).toISOString(), mx("2026-11-11", "08:00").toISOString());
  assert.equal(horario.proximaApertura(mx("2026-11-10", "12:00")).toISOString(), mx("2026-11-11", "08:00").toISOString(), "abierto → la de mañana");
});

prueba("mensajeEspera: lo que se le promete al cliente sale del horario, no del modelo", () => {
  assert.equal(horario.mensajeEspera({ date: mx("2026-11-10", "12:00") }), "Te escribe alguien del equipo en unos minutos.");
  assert.equal(horario.mensajeEspera({ date: mx("2026-11-10", "22:00") }), "Te escribe alguien del equipo mañana desde las 8 am.");
  assert.equal(horario.mensajeEspera({ date: mx("2026-11-11", "03:00") }), "Te escribe alguien del equipo hoy desde las 8 am.");
  assert.equal(horario.mensajeEspera({ urgencia: "urgente", date: mx("2026-11-10", "22:00") }), "Ya le avisé al equipo; te escribe alguien lo antes posible.");
  assert.equal(horario.mensajeEspera({ locale: "en", date: mx("2026-11-10", "22:00") }), "Someone from our team will message you tomorrow from 8 am.");
  assert.equal(horario.mensajeEspera({ locale: "en", date: mx("2026-11-10", "12:00") }), "Someone from our team will message you in a few minutes.");
  conHorario("13:00-21:00", () => {
    assert.equal(horario.mensajeEspera({ date: mx("2026-11-10", "22:00") }), "Te escribe alguien del equipo mañana desde la 1 pm.", "«la 1 pm», no «las 1 pm»");
  });
});

prueba("horaCorta / horarioTexto", () => {
  assert.equal(horario.horaCorta(480), "8 am");
  assert.equal(horario.horaCorta(1290), "9:30 pm");
  assert.equal(horario.horaCorta(0), "12 am");
  assert.equal(horario.horaCorta(720), "12 pm");
  assert.equal(horario.horarioTexto("es"), "de 8 am a 9 pm");
  assert.equal(horario.horarioTexto("en"), "from 8 am to 9 pm");
});

prueba("validar_fecha: «mañana» a las 7 pm de México SÍ se cotiza", () => {
  const r = validarFecha("2026-11-11", { ahora: mx("2026-11-10", "19:00").getTime() });
  assert.equal(r.valida, true, JSON.stringify(r));
  assert.equal(r.esManana, true);
  assert.equal(r.diasFaltan, 1);
  assert.ok(/10 pm/.test(r.instruccion), "no recuerda que el anticipo es antes de las 10 pm");
});

prueba("validar_fecha: a las 11:59 pm sigue siendo «mañana»; a las 12:01 am ya es «hoy»", () => {
  const tarde = validarFecha("2026-11-11", { ahora: mx("2026-11-10", "23:59").getTime() });
  assert.equal(tarde.esManana, true);
  assert.equal(tarde.despuesDeLas10, true, "después de las 10 pm ya no se pide «paga antes de las 10 pm»");
  assert.ok(/primera hora/.test(tarde.instruccion), tarde.instruccion);
  assert.equal(validarFecha("2026-11-11", { ahora: mx("2026-11-10", "21:59").getTime() }).despuesDeLas10, undefined, "a las 9:59 pm todavía alcanza");
  const hoy = validarFecha("2026-11-11", { ahora: mx("2026-11-11", "00:01").getTime() });
  assert.equal(hoy.valida, false);
  assert.equal(hoy.motivo, "hoy");
  assert.equal(hoy.escalar, true, "«para hoy» lo decide el equipo");
});

prueba("validar_fecha: pasado, inexistente, mal escrita y en inglés", () => {
  const ahora = mx("2026-11-10", "19:00").getTime();
  assert.equal(validarFecha("2026-11-09", { ahora }).valida, false);
  assert.equal(validarFecha("2026-02-30", { ahora }).motivo, "No es una fecha real.");
  assert.ok(/Formato/.test(validarFecha("10/11/2026", { ahora }).motivo));
  const jueves = validarFecha("2026-11-12", { ahora });
  assert.equal(jueves.diaSemana, "jueves");
  assert.equal(jueves.esManana, undefined, "pasado mañana no es «mañana»");
  assert.ok(/Thursday/.test(validarFecha("2026-11-12", { ahora, locale: "en" }).fechaTexto));
});

prueba("normalizarHora (hora de inicio del RZR)", () => {
  assert.equal(normalizarHora("10"), "10:00");
  assert.equal(normalizarHora("10:30"), "10:30");
  assert.equal(normalizarHora("3 pm"), "15:00");
  assert.equal(normalizarHora("15:00 hrs"), "15:00");
  assert.equal(normalizarHora("12 am"), "00:00");
  assert.equal(normalizarHora("25"), null);
  assert.equal(normalizarHora("en la tarde"), null);
});

prueba("promo por FECHA DEL TOUR (no por el día en que se cotiza)", () => {
  const t = { precio: 1550, precioLista: 1550, promo: { precio: 1450, vence: "2026-10-29" }, groupMin: 2, precioUnidad: "persona" };
  assert.equal(precioEnFecha(t, "2026-10-29"), 1450, "el último día de promo");
  assert.equal(precioEnFecha(t, "2026-10-30"), 1550, "un día después, lista");
  assert.equal(promoAplica({ ...t, promo: { precio: 1, vence: "2999-12-31" } }), true, "sin fecha: lo que se anuncia hoy");
  assert.equal(promoAplica({ ...t, promo: { precio: 1, vence: "2000-01-01" } }), false);
  assert.equal(promoDe({ promo: { precio: "barato", vence: "2026-10-29" } }), null, "una promo mal formada no aplica");
  assert.equal(precioLista({ precio: 900 }), 900, "data.json anterior sin precioLista");
  assert.equal(precioEnFecha({ precio: 900 }, "2026-10-01"), 900);
});

prueba("precio por tamaño del grupo: la promo o la escalera, NUNCA las dos", () => {
  // Tamul (lista $1,550): 3-5 pagan $1,500, 6-7 $1,450 y 8+ $1,400; promo $1,450 hasta el 29 oct.
  const tamul = {
    precio: 1550, precioLista: 1550, promo: { precio: 1450, vence: "2026-10-29" }, groupMin: 2, precioUnidad: "persona",
    escalaPersona: [{ desde: 3, menos: 50 }, { desde: 6, menos: 100 }, { desde: 8, menos: 150 }],
  };
  assert.equal(descuentoPorGrupo(tamul, 2), 0, "de 1 a 2 no hay escalón");
  assert.equal(descuentoPorGrupo(tamul, 5), 50, "un grupo de 5 paga el escalón de 3");
  assert.equal(descuentoPorGrupo(tamul, 7), 100);
  assert.equal(descuentoPorGrupo(tamul, 12), 150, "8 o más");
  assert.equal(precioPorCabezaEnFecha(tamul, "2026-11-05", 4), 1500, "sin promo: lista menos el escalón");
  assert.equal(precioPorCabezaEnFecha(tamul, "2026-11-05", 8), 1400);
  assert.equal(precioPorCabezaEnFecha(tamul, "2026-10-20", 8), 1450, "con promo: la promo, sin escalón encima");
  assert.equal(precioPorCabezaEnFecha(tamul, "2026-11-05", 2), 1550, "pareja: precio de lista");
  // Un recorrido sin promo (Instagrameable): la escalera aplica siempre.
  const insta = { precio: 1850, precioLista: 1850, promo: null, escalaPersona: [{ desde: 3, menos: 100 }, { desde: 4, menos: 160 }, { desde: 5, menos: 200 }, { desde: 6, menos: 260 }] };
  assert.equal(precioPorCabezaEnFecha(insta, "2026-10-20", 4), 1690);
  assert.equal(precioPorCabezaEnFecha(insta, "2026-10-20", 6), 1590);
  // Sin escalera (data.json anterior o un tour sin ella): el precio de siempre.
  assert.equal(precioPorCabezaEnFecha({ precio: 900 }, "2026-11-05", 10), 900);
});

prueba("bajo el mínimo (8 oct): tarifa normal en los tours por persona; Edén y RZR no", () => {
  assert.equal(aceptaViajeroSolo({ groupMin: 2, precioUnidad: "persona" }), true);
  assert.equal(aceptaViajeroSolo({ groupMin: 5, precioUnidad: "persona" }), true, "rafting también");
  assert.equal(aceptaViajeroSolo({ groupMin: 2, precioUnidad: "vehiculo" }), false, "RZR");
  assert.equal(aceptaViajeroSolo({ groupMin: 2, tarifaGrupo: [1, 2] }), false, "Edén");
  assert.equal(vaBajoElMinimo({ groupMin: 5, precioUnidad: "persona" }, 3), true, "3 en el rafting");
  assert.equal(vaBajoElMinimo({ groupMin: 5, precioUnidad: "persona" }, 5), false, "ya llegó al mínimo");
  assert.equal(vaBajoElMinimo({ groupMin: 2, precioUnidad: "persona" }, 1), true, "una persona sola");
  assert.equal(CONFIRMA_SALIDA_DIAS, 7);
});

prueba("comprobantes: el tour de mañana es URGENTE aunque en UTC ya sea mañana", () => {
  const ahora = mx("2026-11-10", "19:00").getTime();
  assert.equal(medios.urgenciaDeFecha("2026-11-11", ahora), "URGENTE");
  assert.equal(medios.urgenciaDeFecha("2026-11-12", ahora), "HOY");
});

prueba("fechaLarga (lo que lee el cliente)", () => {
  assert.equal(medios.fechaLarga("2026-10-10"), "Sábado, 10 de octubre");
  assert.equal(medios.fechaLarga("2026-10-10", "en"), "Saturday, October 10");
  assert.equal(medios.fechaLarga("no-es-fecha"), "no-es-fecha");
});

console.log(fallas ? `\n❌ ${fallas} prueba(s) fallaron\n` : "\n✅ Todas pasaron\n");
process.exit(fallas ? 1 : 0);
