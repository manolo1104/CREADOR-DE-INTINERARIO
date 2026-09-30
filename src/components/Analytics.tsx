import Script from "next/script";

const GA_ID      = process.env.NEXT_PUBLIC_GA4_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * ¿Esta visita se mide? Se evalúa en el navegador, ANTES de cargar nada.
 *
 * 🔴 Al revisar Clarity (29 sep 2026) las 27 grabaciones de la semana eran
 * NUESTRAS: sesiones de desarrollo en localhost/127.0.0.1 y horas del panel
 * /admin — con nombres, teléfonos e importes de clientes en pantalla, que el
 * enmascaramiento «equilibrado» no oculta porque son texto, no campos. Ningún
 * visitante real. Así el embudo mide al equipo y no a los clientes.
 *
 * Reglas:
 *  - localhost / 127.0.0.1 / *.local → nunca se mide.
 *  - /admin → nunca se mide, y además marca el navegador como INTERNO
 *    (`hp_interno` en localStorage): quien abre el panel es del equipo, y sus
 *    visitas al sitio público (revisar precios, mandar ligas) tampoco deben
 *    contar como clientes. Para medir desde ese navegador, usar incógnito.
 */
const GUARDA = `
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || /\\.local$/.test(h)) return;
  if (location.pathname.indexOf('/admin') === 0) {
    try { localStorage.setItem('hp_interno', '1'); } catch (e) {}
    return;
  }
  try { if (localStorage.getItem('hp_interno') === '1') return; } catch (e) {}
`;

export function Analytics() {
  return (
    <>
      {/* ── Google Analytics 4 ──
          gtag.js se descarga siempre, pero sin el `config` de abajo no manda
          ningún hit, y `window.gtag` queda sin definir: los `track*` del sitio
          ya revisan que exista antes de llamarlo. */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              (function(){
                ${GUARDA}
                window.dataLayer = window.dataLayer || [];
                window.gtag = function(){dataLayer.push(arguments);};
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              })();
            `}
          </Script>
        </>
      )}

      {/* ── Microsoft Clarity ── */}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(){
              ${GUARDA}
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${CLARITY_ID}");
            })();
          `}
        </Script>
      )}
    </>
  );
}
