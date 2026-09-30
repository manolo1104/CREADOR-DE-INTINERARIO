import Script from "next/script";

/**
 * 🔴 Los ids se limpian antes de meterlos al script. Del 29 al 30 sep 2026 la
 * variable de Railway decía `y4zee16v6k"` (una comilla de más al pegarla): el
 * script de Clarity quedaba con un error de sintaxis, no arrancaba en ningún
 * navegador y NO se grabó ni una sesión real. Nada avisaba: el sitio andaba
 * normal y GA4, en su propio script, sí medía.
 */
const GA_ID      = process.env.NEXT_PUBLIC_GA4_ID?.replace(/[^A-Za-z0-9-]/g, "");
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.replace(/[^A-Za-z0-9]/g, "");

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

/**
 * ¿El visitante dejó encendido este servicio en el aviso de cookies?
 * Mismas claves que `src/lib/cookiesPrefs.ts` (este script en línea no puede
 * importarlo). Mientras no decida, se mide; "rejected" es el botón Rechazar
 * del aviso anterior, que apagaba todo.
 */
const PERMITE = `
  function hpPermite(clave) {
    try {
      if (localStorage.getItem('hp_cookie_consent') === 'rejected') return false;
      var p = JSON.parse(localStorage.getItem('hp_cookie_prefs') || '{}');
      return p[clave] !== false;
    } catch (e) { return true; }
  }
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
                ${PERMITE}
                // El aviso de cookies la llama si el visitante lo vuelve a
                // encender sin recargar la página.
                window.hpActivarGA = function(){
                  window['ga-disable-${GA_ID}'] = false;
                  if (window.gtag) return;
                  window.dataLayer = window.dataLayer || [];
                  window.gtag = function(){dataLayer.push(arguments);};
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                    send_page_view: true
                  });
                };
                if (hpPermite('analitica')) window.hpActivarGA();
                else window['ga-disable-${GA_ID}'] = true;
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
              ${PERMITE}
              window.hpActivarClarity = function(){
                if (!window.clarity) {
                  (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window,document,"clarity","script","${CLARITY_ID}");
                }
                // Quien ya aceptó en el aviso: se le dice a Clarity. Sin esta
                // señal, a los visitantes de Europa (y cualquiera, si alguien
                // apaga las cookies en la configuración de Clarity) les parte
                // la visita en una sesión por página y el embudo sale roto.
                // Sólo con decisión tomada: al que no ha contestado se le deja
                // el comportamiento por omisión de Clarity.
                try {
                  if (localStorage.getItem('hp_cookie_consent')) {
                    clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
                  }
                } catch (e) {}
              };
              if (hpPermite('grabacion')) window.hpActivarClarity();
            })();
          `}
        </Script>
      )}
    </>
  );
}
