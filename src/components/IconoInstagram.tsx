/**
 * El glifo de Instagram, con su degradado oficial.
 *
 * 🔴 Vive SOLO aquí a propósito. Es una marca registrada de Meta puesta como
 * sello de un producto nuestro (decisión de Manolo, 6 oct 2026, sabiendo que
 * sus reglas la permiten para enlazar a una cuenta, no para rotular un
 * servicio). Si algún día hay que quitarlo, se borra este archivo y los dos
 * sitios que lo pintan —la insignia del hero y la de la tarjeta—, y no hay que
 * ir a buscar un SVG pegado a mano en media docena de pantallas.
 *
 * Se pinta donde el recorrido trae `icon: "Instagram"` en el catálogo, que es
 * el campo que ya existía y nadie usaba.
 *
 * El `id` del degradado se repite si hay dos en la misma página: no importa,
 * las dos definiciones son idénticas y el navegador se queda con la primera.
 */
export function IconoInstagram({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="glifo-ig" cx="30%" cy="107%" r="150%">
          <stop offset="0%"   stopColor="#fdf497" />
          <stop offset="26%"  stopColor="#fd5949" />
          <stop offset="60%"  stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285aeb" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#glifo-ig)" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.3" fill="#fff" />
    </svg>
  );
}
