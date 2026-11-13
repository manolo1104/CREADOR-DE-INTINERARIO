import { describe, expect, it } from "vitest";
import { writeFileSync } from "fs";
import { correoDe, correoRecordatorio } from "../recordatorios";

describe("correo de recordatorio", () => {
  const tareas = [
    { id: "1", titulo: "Preguntar si ya decidió la fecha", vence: "2026-11-04", hora: "11:00", oportunidadId: "op1", cliente: "Lucía Prueba", telefono: "+524890001122" },
    { id: "2", titulo: "Mandar link de anticipo", vence: "2026-11-02", hora: null, oportunidadId: null, cliente: null, telefono: null },
  ];
  it("uno: el asunto dice hora, cliente y qué hacer; trae la ficha y el WhatsApp", () => {
    const c = correoRecordatorio("Erick", [tareas[0]], "2026-11-04");
    expect(c.subject).toBe("Seguimiento 11:00 · Lucía Prueba: Preguntar si ya decidió la fecha");
    expect(c.htmlContent).toContain("https://www.huasteca-potosina.com/admin/leads/op1");
    expect(c.htmlContent).toContain("https://wa.me/524890001122");
    expect(c.htmlContent).toContain('bgcolor="#F5F5F3"');
  });
  it("varios: lo vencido sale marcado y sin lead lleva a Seguimientos", () => {
    const c = correoRecordatorio("Erick", tareas, "2026-11-04");
    expect(c.subject).toBe("2 seguimientos para ti");
    expect(c.htmlContent).toContain("Vencido (2026-11-02)");
    expect(c.textContent).toContain("/admin/seguimientos");
    if (process.env.VISTA_CORREO) writeFileSync(process.env.VISTA_CORREO, c.htmlContent);
  });
  it("sin correo propio del responsable, va a los del equipo", () => {
    process.env.ADMIN_EMAIL_TOURS = "equipo@ejemplo.test";
    delete process.env.ADMIN_EMAIL_ERICK;
    expect(correoDe("Erick")).toEqual([{ email: "equipo@ejemplo.test" }]);
    process.env.ADMIN_EMAIL_ERICK = "erick@ejemplo.test";
    expect(correoDe("Erick")).toEqual([{ email: "erick@ejemplo.test" }]);
    delete process.env.ADMIN_EMAIL_ERICK;
  });
});
