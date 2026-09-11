import type { Metadata } from "next";

const SITE = "https://www.huasteca-potosina.com";

/**
 * Layout del panel interno. No pinta nada: existe solo para colgar aquí los
 * metadatos que heredan TODAS las rutas de /admin (el grupo (dashboard) y
 * /admin/login).
 *
 * 1) `robots: noindex, nofollow`. `Disallow: /admin` sigue en robots.txt y ahí
 *    se queda (es lo que evita que los bots paseen por el panel), pero
 *    bloquear no es despublicar: una URL bloqueada puede acabar indexada si
 *    alguien la enlaza. OJO: mientras siga el Disallow, Googlebot no entra a
 *    leer esta etiqueta; sirve para los bots que rastrean sin pedir permiso y
 *    para que toda subruta futura del panel nazca con ella. Si algún día
 *    /admin aparece indexada de verdad, el camino es el de /planear: quitar el
 *    Disallow el tiempo justo para que Google lea el noindex y la saque.
 * 2) Título, descripción y og:url propios. Sin ellos, /admin/login responde
 *    200 heredando los metadatos de la PORTADA: quien pegaba el enlace del
 *    panel en WhatsApp veía la vista previa de la página de inicio.
 */
export const metadata: Metadata = {
  title: "Panel interno — Tours Huasteca Potosina",
  description: "Acceso restringido al panel de administración de Tours Huasteca Potosina.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Panel interno — Tours Huasteca Potosina",
    description: "Acceso restringido al panel de administración.",
    url: `${SITE}/admin`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Panel interno — Tours Huasteca Potosina",
    description: "Acceso restringido al panel de administración.",
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
