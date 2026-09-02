import type { Metadata } from "next";
import { Calculadora } from "@/components/curso/Calculadora";

export const metadata: Metadata = {
  title: "Calculadora de reservas perdidas",
  description:
    "Contesta 3 preguntas y te digo cuánto dinero se te va cada mes por contestar tarde los WhatsApps de tus clientes. No pide correo.",
  robots: { index: false, follow: false },
};

/**
 * /curso/calculadora — el imán de la campaña.
 * No pide correo a propósito: la promesa "son 30 segundos y no pide nada" es
 * la mitad de por qué la gente entra. Quien quiera más, se registra al taller.
 */
export default function CalculadoraPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-crema text-negro">
      <section className="mx-auto w-full max-w-4xl flex-1 px-5 py-14 md:py-20">
        <p className="font-dm text-xs font-medium uppercase tracking-[2.5px] text-verde-selva">
          Calculadora de reservas perdidas
        </p>
        <h1 className="mt-4 max-w-[19ch] font-cormorant text-[2.4rem] font-semibold leading-[1.05] text-verde-profundo sm:text-5xl">
          La mayoría no pierde clientes por precio. Los pierde por contestar tarde.
        </h1>
        <p className="mt-5 max-w-[52ch] font-dm text-lg leading-relaxed text-negro/75">
          Mueve las tres barras con tus números reales. No pido tu correo y no guardo nada:
          el resultado se calcula en tu propio celular.
        </p>

        <div className="mt-10">
          <Calculadora />
        </div>
      </section>

      <footer className="bg-negro px-5 py-8 text-center font-dm text-sm text-crema/60">
        <p>
          Manolo · Huasteca Potosina Tours ·{" "}
          <a href="/curso/webinar" className="underline hover:text-crema">
            El taller
          </a>{" "}
          ·{" "}
          <a href="/aviso-de-privacidad" className="underline hover:text-crema">
            Aviso de privacidad
          </a>
        </p>
      </footer>
    </main>
  );
}
