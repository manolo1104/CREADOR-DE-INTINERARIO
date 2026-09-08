/**
 * ¿Es un bot y no una persona?
 *
 * Vivía suelta dentro de `middleware.ts`. Se sacó aquí porque la descarga de
 * los workbooks necesita exactamente el mismo criterio: la liga se pega en un
 * grupo de WhatsApp, y WhatsApp y Facebook piden la URL con su propio robot
 * para armar la vista previa. Si eso contara como descarga, el panel diría que
 * alguien se llevó el cuaderno antes de que nadie lo tocara.
 *
 * Sin user-agent se cuenta como bot: un navegador de verdad siempre manda uno.
 */
export function esBot(ua: string | null | undefined): boolean {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|gptbot|chatgpt|headless|python-|curl|wget|scrapy|facebookexternalhit|whatsapp|preview|wp-admin|scan/i.test(
    ua
  );
}
