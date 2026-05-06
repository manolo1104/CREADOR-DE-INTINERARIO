"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/admin/reservas");
      } else {
        const d = await res.json();
        setError(d.error || "Credenciales incorrectas");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-negro flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-cormorant text-crema text-3xl font-light tracking-[4px] uppercase mb-1">
            HUASTECA
          </div>
          <div className="text-[10px] tracking-[3px] uppercase text-verde-vivo font-dm">
            Potosina · Panel Admin
          </div>
        </div>

        <div className="border border-white/10 bg-verde-profundo/30 p-8">
          <h1 className="font-cormorant text-crema text-xl mb-6 text-center">
            Acceso Administrativo
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-crema/50 font-dm mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Manolo"
                required
                autoFocus
                className="w-full bg-negro/50 border border-white/15 text-crema font-dm text-sm px-4 py-3 focus:outline-none focus:border-verde-vivo transition-colors placeholder:text-crema/20"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-crema/50 font-dm mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-negro/50 border border-white/15 text-crema font-dm text-sm px-4 py-3 focus:outline-none focus:border-verde-vivo transition-colors placeholder:text-crema/20"
              />
            </div>

            {error && (
              <p className="text-terracota font-dm text-xs text-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-verde-selva text-crema py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Verificando..." : "Acceder al Panel"}
            </button>
          </form>

          <a
            href="/"
            className="block text-center mt-5 text-[10px] tracking-[1px] uppercase text-crema/30 hover:text-crema/60 font-dm transition-colors"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>
    </div>
  );
}
