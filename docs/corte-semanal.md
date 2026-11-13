# Cómo se calcula el corte semanal

Motor: `src/lib/admin/corteSemanal.ts` (puro; pruebas en `src/lib/admin/__tests__/corteSemanal.test.ts`).
Reglas de Manolo del 20 oct 2026, confirmadas el 3 nov 2026 con el corte del 19–25 oct.

1. **Cobrado**: lo escrito a mano en «La semana», cobro por cobro, con quién lo recibió, si vino de Stripe y si es de RZR.
2. **− Stripe**: 3.6 % + IVA (4.176 %) de los cobros marcados «vino de Stripe».
3. **− Railway**: 2 % de todo lo cobrado (lo recibe Manolo, que paga el hosting).
4. **− Erick**: 10 % de lo cobrado de RZR (se lo paga Martín).
5. **− Hotel**: el hospedaje de las reservas (lo recibe Manolo, que le paga al hotel).
6. **= Lo que queda real.**
7. **− Costos operativos**: los capturados en las tarjetas (tours + RZR). Los paga Martín.
8. **= Ganancia.**
9. **Reparto**: la ganancia de tours (sin RZR) va 50/50. Del RZR, ya sin Erick, Stripe y Railway, Manolo 20 % y Martín 80 %, y Martín paga de ahí los costos del RZR.
10. **Cuentas con Martín**: costos de tours que pagó + su 50 % + su 80 % del RZR + lo de Erick − lo que ya cobró él.

## El corte del 19–25 oct 2026, al peso

| Paso | Monto |
| --- | --- |
| Cobrado | $37,730 |
| − Stripe (de $20,762 con tarjeta) | $867 |
| − Railway 2 % | $755 |
| − Erick (10 % del RZR de $1,600) | $160 |
| = Lo que queda real | $35,948 |
| − Costos | $24,560 |
| = Ganancia | $11,388 |
| Manolo: 50 % de tours $4,990 + 20 % del RZR $282 | $5,272 |
| Martín: $4,990 + $1,126 del RZR | $6,116 |

«Ventas − costos = $13,170» no es la ganancia: faltan Stripe, Railway y Erick ($1,782). La parte de Manolo no es la mitad
porque el RZR se reparte 20/80. Las semanas anteriores al 19 oct responden «Error al cargar» a propósito.
