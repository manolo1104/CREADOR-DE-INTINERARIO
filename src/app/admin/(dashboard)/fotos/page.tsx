import FotosClient from "./FotosClient";

export const metadata = { title: "Fotos — Admin" };

// Sin base de datos ni servidor: las fotos se procesan en el navegador de
// quien las elige y nunca salen de su dispositivo.
export default function FotosPage() {
  return <FotosClient />;
}
