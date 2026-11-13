/**
 * Verificar transferencias con el CEP de Banxico (12 nov 2026).
 *
 * «No encontrada» es la respuesta REAL que dio Banxico el 12 nov 2026 a una
 * consulta inventada (recortada). La de un pago liquidado todavía no se ha visto
 * con una transferencia real: se prueba que SOLO «liquidad…» verifica.
 */
import { describe, expect, it, vi } from "vitest";
import { camposCep, consultarCep, formularioCep, interpretarRespuestaCep, validarConsulta, type ConsultaCep } from "@/lib/admin/banxicoCep";
import { puedeHacer } from "@/lib/admin/usuarios";

const NO_ENCONTRADA = `<style>#htmlCEP tr { padding-top: 2px; }</style>
<div><h4>Informaci&oacute;n del estado del pago</h4>
<p>Operación no encontrada. El SPEI no ha recibido una orden de pago que cumpla con el criterio de búsqueda especificado. Se recomienda verificar la información o consulte con su institución financiera.</p></div>`;

/**
 * La forma de la respuesta a la transferencia REAL de Manolo del 12 nov 2026
 * (BBVA → Inbursa, $3,443), con la CLABE cambiada por la de prueba.
 */
const PAGO_LIQUIDADO = `<div><h4>Informaci&oacute;n del estado del pago</h4>
<p>Con la información proporcionada se identificó el siguiente pago:</p><table>
<tr><td>Número de Referencia</td><td>2310260</td></tr>
<tr><td>Clave de Rastreo</td><td>MBAN01002611120099649775</td></tr>
<tr><td>Institución emisora del pago</td><td>BBVA MEXICO</td></tr>
<tr><td>Institución receptora del pago</td><td>INBURSA</td></tr>
<tr><td>Estado del pago en Banxico</td><td>Liquidado</td></tr>
<tr><td>Fecha y hora de recepción</td><td>12/11/2026 13:32:42</td></tr>
<tr><td>Fecha y hora de procesamiento</td><td>12/11/2026 13:32:44</td></tr>
<tr><td>Cuenta Beneficiaria</td><td>036180500000000000</td></tr>
<tr><td>Monto</td><td>3443.00</td></tr></table>
<p>IMPORTANTE: Esta consulta no es un Comprobante Electrónico de Pago (CEP).</p></div>`;

const base: ConsultaCep = {
  fecha: "2026-11-10",
  claveRastreo: "mban01002611100012345",
  emisor: "40012",
  receptor: "40036",
  cuenta: "036180500000000000",
  monto: 1500,
};

describe("formulario de Banxico", () => {
  it("fecha DD-MM-YYYY, clave en mayúsculas, monto con dos decimales y captcha fijo", () => {
    const f = formularioCep(base);
    expect(f.fecha).toBe("10-11-2026");
    expect(f.criterio).toBe("MBAN01002611100012345");
    expect(f.monto).toBe("1500.00");
    expect(f.tipoCriterio).toBe("T");
    expect(f.receptorParticipante).toBe("0");
    expect(f.captcha).toBe("c");
  });

  it("frena lo que Banxico no puede contestar antes de preguntarle", () => {
    expect(validarConsulta(base)).toBeNull();
    expect(validarConsulta({ ...base, claveRastreo: "123" })).toMatch(/7 a 30/);
    expect(validarConsulta({ ...base, emisor: "" })).toMatch(/banco/);
    // Inbursa → Inbursa no es SPEI: no hay CEP.
    expect(validarConsulta({ ...base, emisor: "40036" })).toMatch(/Inbursa a Inbursa/);
    expect(validarConsulta({ ...base, monto: 0 })).toMatch(/mayor a cero/);
  });
});

describe("lo que contesta Banxico", () => {
  it("«no encontrada» (respuesta real del 12 nov 2026) NO verifica", () => {
    const r = interpretarRespuestaCep(NO_ENCONTRADA);
    expect(r.estado).toBe("no_encontrado");
    expect(r.textoBanxico).toMatch(/no encontrada/);
  });

  it("pago REAL encontrado (forma de la respuesta del 12 nov 2026): Liquidado, misma cuenta y monto → verificado", () => {
    const r = interpretarRespuestaCep(PAGO_LIQUIDADO, { cuenta: base.cuenta, monto: 3443 });
    expect(r.estado).toBe("verificado");
    expect(r.mensaje).toMatch(/12\/11\/2026 13:32:42/);
    expect(camposCep(r.textoBanxico ?? "")).toMatchObject({ estado: "Liquidado", monto: 3443, emisor: "BBVA MEXICO" });
  });

  it("encontrado pero por otro monto o a otra cuenta → NO verifica", () => {
    expect(interpretarRespuestaCep(PAGO_LIQUIDADO, { cuenta: base.cuenta, monto: 3000 }).estado).toBe("no_concluyente");
    expect(interpretarRespuestaCep(PAGO_LIQUIDADO, { cuenta: "036180500000009999", monto: 3443 }).estado).toBe("no_concluyente");
  });

  it("encontrado pero devuelto → NO verifica", () => {
    const devuelto = PAGO_LIQUIDADO.replace("Liquidado", "Devuelto");
    expect(interpretarRespuestaCep(devuelto, { cuenta: base.cuenta, monto: 3443 }).estado).toBe("no_concluyente");
  });

  it("sin el campo de estado, «liquidada» suelta NO verifica (falla hacia «revísalo a mano»)", () => {
    expect(interpretarRespuestaCep("<td>Estado:</td><td>LIQUIDADA</td>").estado).toBe("no_concluyente");
  });

  it("si pide captcha, lo dice (y manda a la página)", () => {
    expect(interpretarRespuestaCep("<label>Código de seguridad</label>").estado).toBe("sin_servicio");
  });

  it("lo que no se entiende queda «no concluyente», nunca verificado", () => {
    expect(interpretarRespuestaCep("<html><body>Mantenimiento</body></html>").estado).toBe("no_concluyente");
  });
});

describe("consulta (sin red)", () => {
  it("abre sesión y manda el formulario; un fallo de red es «sin servicio», no un error", async () => {
    const llamadas: string[] = [];
    const f = vi.fn(async (url: string | URL | Request) => {
      llamadas.push(String(url));
      if (String(url).endsWith("/cep/")) return new Response("", { headers: { "set-cookie": "JSESSIONID=abc; Path=/cep" } });
      return new Response(NO_ENCONTRADA, { status: 200 });
    }) as unknown as typeof fetch;
    const r = await consultarCep(base, f);
    expect(r.estado).toBe("no_encontrado");
    expect(llamadas[1]).toMatch(/valida\.do$/);

    const caida = vi.fn(async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    expect((await consultarCep(base, caida)).estado).toBe("sin_servicio");
  });

  it("con datos inválidos no le pregunta a Banxico", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    const r = await consultarCep({ ...base, emisor: "40036" }, f);
    expect(r.estado).toBe("datos_invalidos");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("quién verifica", () => {
  it("Erick verifica con Banxico pero no «a mano»; el guía, nada", () => {
    expect(puedeHacer("operacion", "verificarCobro")).toBe(true);
    expect(puedeHacer("operacion", "verificarCobroManual")).toBe(false);
    expect(puedeHacer("dueno", "verificarCobroManual")).toBe(true);
    expect(puedeHacer("socio", "verificarCobroManual")).toBe(true);
    expect(puedeHacer("guia", "verificarCobro")).toBe(false);
  });
});
