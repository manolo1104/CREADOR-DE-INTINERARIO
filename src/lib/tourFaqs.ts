export interface FAQ {
  q: string;
  a: string;
}

/** Keyed by tour.id (from TOURS_DB) */
export const TOUR_FAQS: Record<string, FAQ[]> = {
  "tour-tamul": [
    {
      q: "¿Se puede hacer si no sé nadar?",
      a: "Sí. Usamos chalecos salvavidas en toda la travesía. No es necesario saber nadar.",
    },
    {
      q: "¿A qué hora es la salida?",
      a: "Salimos a las 5:30 AM desde Ciudad Valles para llegar al Sótano al amanecer.",
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
