import Script from "next/script";
import { JS_GUARDA, JS_URL_PRIVADA } from "@/lib/medicionPrivada";

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
 * Las reglas (localhost, /admin y la marca `hp_interno`, /checkin, /opina y,
 * desde el lote 8, /baja) viven en `lib/medicionPrivada.ts` con sus pruebas.
 * Lote 8 (10 nov 2026): la marca del equipo es UNA para todo —GA4, Clarity,
 * /api/track y el servidor—: va también en cookie para que el servidor la lea.
 */
const GUARDA = JS_GUARDA;

/**
 * ¿El visitante dejó encendido este servicio en el aviso de cookies?
 * Mismas claves que `src/lib/cookiesPrefs.ts` (este script en línea no puede
 * importarlo): 'analitica' (GA4), 'grabacion' (Clarity) y 'publicidad' (Pixel
 * de Meta, Google Ads). Mientras no decida, se mide; "rejected" es el botón
 * Rechazar del aviso anterior, que apagaba todo.
 *
 * 'publicidad' todavía no la consulta nadie: no se pauta y no hay pixel. El
 * día que se instale, su script se carga solo si `hpPermite('publicidad')`.
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
                ${JS_URL_PRIVADA}
                // El aviso de cookies la llama si el visitante lo vuelve a
                // encender sin recargar la página.
                window.hpActivarGA = function(){
                  window['ga-disable-${GA_ID}'] = false;
                  if (window.gtag) return;
                  window.dataLayer = window.dataLayer || [];
                  window.gtag = function(){dataLayer.push(arguments);};
                  gtag('js', new Date());
                  var hpCfg = {
                    page_path: window.location.pathname,
                    send_page_view: true
                  };
                  // Lote 8 (10 nov 2026): con un token o un correo en la
                  // dirección (carrito recuperado, regreso de Stripe), GA4
                  // recibe la dirección sin ellos, en la vista y en los eventos.
                  var hpLoc = hpLimpia(location.href);
                  if (hpLoc !== location.href) hpCfg.page_location = hpLoc;
                  if (document.referrer && hpPrivada(document.referrer)) hpCfg.page_referrer = hpLimpia(document.referrer);
                  gtag('config', '${GA_ID}', hpCfg);
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
              ${JS_URL_PRIVADA}
              // Lote 8 (10 nov 2026): Clarity graba la dirección tal cual: con
              // un token o un correo en ella, esta visita no se graba.
              if (hpPrivada(location.href) || (document.referrer && hpPrivada(document.referrer))) return;
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
