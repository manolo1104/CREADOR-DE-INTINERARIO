import type { Metadata } from "next";
import { emailDeToken } from "@/lib/baja";
import { BajaForm } from "./BajaForm";

export const dynamic = "force-dynamic";

// Una página de baja no se indexa: no aporta nada en búsqueda y no queremos
// que aparezca suelta sin token.
export const metadata: Metadata = {
  title: "Darse de baja · Tours Huasteca Potosina",
  robots: { index: false, follow: false },
};

export default function BajaPage({ searchParams }: { searchParams: { t?: string } }) {
  const email = searchParams.t ? emailDeToken(searchParams.t) : null;

  return (
    <main className="min-h-screen bg-negro flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <p className="font-dm text-[10px] tracking-[4px] uppercase text-dorado mb-5">
          Tours Huasteca Potosina
        </p>

        {email ? (
          <BajaForm token={searchParams.t!} email={email} />
        ) : (
          <>
            <h1 className="font-cormorant font-light text-crema text-4xl mb-4">
              Este enlace no funciona
            </h1>
            <p className="font-dm text-sm text-crema/55 leading-relaxed">
              Puede que esté incompleto por cómo lo copió tu correo. Respóndenos el
              correo con la palabra <strong className="text-crema">baja</strong> y te
              sacamos de la lista a mano.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
