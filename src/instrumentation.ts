// Next llama `register()` una vez al arrancar el servidor. Aquí solo se
// enciende el reloj de los recordatorios de seguimiento (3 nov 2026), y solo
// en el servidor Node de producción: ni en el build, ni en `next dev` (que en
// esta Mac puede apuntar a la base real), ni donde se apague con
// RECORDATORIOS_INTERNOS=0.
//
// 🔴 El import va DENTRO del `if (NEXT_RUNTIME === "nodejs")`: Next reemplaza
// esa variable al compilar y así borra la rama del paquete «edge». Con un
// `return` antes, la rama no se borra y el reloj (que ya lee salidas y el
// cupo, con `crypto` de Node) tumba la compilación (4 nov 2026).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
    if (process.env.RECORDATORIOS_INTERNOS === "0") return;
    const { iniciarRecordatorios } = await import("./lib/admin/recordatoriosTimer");
    iniciarRecordatorios();
  }
}
