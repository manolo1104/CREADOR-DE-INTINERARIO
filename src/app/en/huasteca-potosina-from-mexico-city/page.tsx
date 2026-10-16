// The Mexico City–Xilitla trip in English (16 oct 2026). Same template as
// /viaje-cdmx-xilitla; the middleware's x-locale header turns it English. Its own
// slug, not /en/viaje-cdmx-xilitla: it's what English speakers search for.
export { default, generateMetadata } from "../../viaje-cdmx-xilitla/page";
export const dynamic = "force-dynamic";
