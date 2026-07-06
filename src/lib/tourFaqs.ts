export interface FAQ {
  q: string;
  a: string;
}

/** Keyed by tour.id (from TOURS_DB) */
export const TOUR_FAQS: Record<string, FAQ[]> = {
  "tour-rzr-xilitla": [
    {
      q: "¿Necesito licencia o experiencia para manejar el RZR?",
      a: "No necesitas experiencia: te damos un briefing de manejo y el RZR es fácil de controlar. Un guía instructor abre la ruta delante de ti todo el tiempo. El conductor debe ser mayor de edad; si prefieres no manejar, puedes ir de copiloto.",
    },
    {
      q: "¿El precio es por persona o por vehículo?",
      a: "Por vehículo. Cada unidad tiene su precio según la ruta: desde $1,600 MXN el RZR 500 (2 adultos + 1 niño) en la Ruta Nanacatli, hasta el Defender Familiar (6 adultos + 2 niños) o el Polaris Pro S premium. Todos incluyen gasolina, equipo de seguridad y guía.",
    },
    {
      q: "¿Pueden ir niños?",
      a: "Sí, según el vehículo. El RZR 500 lleva 2 adultos y 1 niño, y el Defender Familiar lleva 6 adultos y 2 niños. Avísanos las edades al reservar para asignarte la unidad adecuada.",
    },
    {
      q: "¿Está incluido el transporte y la comida?",
      a: "No. El precio incluye el vehículo con gasolina, el equipo de seguridad y el guía. El punto de encuentro es nuestra base en Xilitla; el transporte hasta allí y los alimentos no están incluidos.",
    },
    {
      q: "¿Qué debo llevar?",
      a: "Ropa que se pueda ensuciar y mojar, calzado cerrado, bloqueador y una muda de cambio. Vas a salir con barro — es parte de la diversión.",
    },
    {
      q: "¿Cuánto dura el recorrido?",
      a: "Depende de la ruta: Nanacatli 2 horas (la más popular, ideal para primerizos), Miradores 3 horas, y Nacimiento o Trinidad 5 horas cada una. En la Ruta Nacimiento te prestamos kayak y chaleco salvavidas para la actividad en el nacimiento.",
    },
  ],
  "tour-rafting-tampaon": [
    {
      q: "¿Es seguro hacer rafting si no sé nadar?",
      a: "Sí. Vas con chaleco salvavidas y casco todo el descenso, y el guía certificado va dentro de la balsa contigo. Solo avísale antes de subir para ubicarte en el mejor lugar de la balsa.",
    },
    {
      q: "¿Necesito experiencia previa?",
      a: "No. Los rápidos Clase III son el punto perfecto entre emoción real y seguridad para principiantes. Antes de tocar el agua recibes un briefing completo de seguridad y técnica de remado.",
    },
    {
      q: "¿Qué pasa si el nivel del río no permite navegar?",
      a: "Tu seguridad va primero: si el río no está en condiciones (sobre todo en temporada de lluvias, julio–septiembre), te avisamos con anticipación y reprogramamos la salida o te proponemos una actividad alternativa.",
    },
    {
      q: "¿Puedo llevar mi GoPro?",
      a: "Sí, pero únicamente con soporte de pecho o casco. No se permite llevarla en la mano: las dos manos deben quedar libres para remar y sujetarte de las cuerdas de seguridad.",
    },
    {
      q: "¿Qué debo llevar?",
      a: "Traje de baño o ropa que se pueda mojar, calzado acuático o tenis que se puedan mojar (con calcetines para evitar ampollas), bloqueador biodegradable y una muda completa de ropa seca para el regreso.",
    },
    {
      q: "¿Dónde es el punto de salida? ¿Incluye transporte?",
      a: "Sí: pasamos por ti a tu hospedaje en Ciudad Valles o Xilitla, con traslado redondo incluido. Tú solo prepárate para remar.",
    },
    {
      q: "¿Incluye comida?",
      a: "Sí, tu reserva incluye una comida — antes o después de la actividad, como prefieras.",
    },
  ],
  "tour-rappel-tamul": [
    {
      q: "¿Necesito experiencia previa en rappel?",
      a: "No. El primer descenso es 100% guiado y la mayoría de nuestros visitantes nunca habían hecho rappel. Nuestros guías de alta montaña te dan el briefing de técnica antes de bajar.",
    },
    {
      q: "¿Está incluido el transporte?",
      a: "No. El precio no incluye transporte ni alimentos. El punto de encuentro es el embarcadero del río; podemos coordinarte el transporte con un costo adicional o puedes llegar por tu cuenta.",
    },
    {
      q: "¿Las fotos y el video tienen costo extra?",
      a: "No, están incluidos. Te documentamos todo el descenso con fotografía y video con dron, sin costo adicional.",
    },
    {
      q: "¿Qué equipo debo llevar?",
      a: "Nosotros ponemos todo el equipo de seguridad (arnés, casco, guantes y cuerdas). Tú solo trae ropa deportiva cómoda que se pueda mojar, calzado cerrado con suela firme y bloqueador.",
    },
    {
      q: "¿Cuánto dura la actividad?",
      a: "Entre 3 y 5 horas, dependiendo del tamaño del grupo y las condiciones del clima.",
    },
  ],
  "tour-tamul": [
    {
      q: "¿Se puede hacer si no sé nadar?",
      a: "Sí. Usamos chalecos salvavidas en toda la travesía. No es necesario saber nadar.",
    },
    {
      q: "¿A qué hora es la salida?",
      a: "Salimos entre las 8:00 y las 9:00 AM. Confirmamos la hora exacta de tu recogida al reservar.",
    },
    {
      q: "¿Qué pasa si llueve?",
      a: "Operamos con lluvia ligera. Si hay tormenta eléctrica, reprogramamos sin costo.",
    },
  ],
  "tour-edward-james": [
    {
      q: "¿Las Pozas tienen restricción de edad?",
      a: "No, pero el terreno es irregular. Para niños menores de 5 recomendamos cuidado extra.",
    },
    {
      q: "¿El guía habla inglés?",
      a: "Tenemos guías con inglés básico. Si requieres bilingüe avanzado, avísanos al reservar.",
    },
    {
      q: "¿Cuánto tiempo estamos en cada lugar?",
      a: "Aprox. 2h en Las Pozas, 1h en Huichihuayán, 45 min en cada atracción adicional.",
    },
  ],
  "tour-meco": [
    {
      q: "¿Puedo nadar en todas las cascadas?",
      a: "Sí. Todas las pozas del tour son aptas para nado con chaleco incluido.",
    },
    {
      q: "¿Hay comida incluida a mediodía?",
      a: "El desayuno está incluido. La comida del mediodía no — hay opciones en ruta.",
    },
    {
      q: "¿Es apto para adultos mayores?",
      a: "Sí, dificultad baja. El acceso a los miradores es caminata corta y plana.",
    },
  ],
  "tour-minas-micos": [
    {
      q: "¿Es seguro llevar niños pequeños?",
      a: "Sí, es uno de nuestros tours más aptos para familias. Chalecos para todos.",
    },
    {
      q: "¿Minas Viejas y Micos están cerca entre sí?",
      a: "Están en la misma ruta. En auto son 40 min entre sí — cubrimos ambos en el día.",
    },
    {
      q: "¿El agua está muy fría?",
      a: "Entre 18–22°C. Refrescante pero no helada. La mayoría lo disfruta mucho.",
    },
  ],
  "tour-puente-dios": [
    {
      q: "¿Se puede entrar al Puente de Dios con niños?",
      a: "Sí, con chaleco obligatorio. Recomendamos niños mayores de 5 años por los escalones.",
    },
    {
      q: "¿Qué tan fría está el agua?",
      a: "Entre 18–22°C — refrescante pero no helada. La mayoría lo disfruta mucho.",
    },
    {
      q: "¿La Hacienda Los Gómez tiene costo adicional?",
      a: "No, está incluida en el precio del tour.",
    },
  ],
};
