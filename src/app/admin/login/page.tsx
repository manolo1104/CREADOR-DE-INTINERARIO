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
    <div className="min-h-screen bg-[#14342a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-cormorant text-[#FAFAF8] text-3xl font-light tracking-[4px] uppercase mb-1">
            HUASTECA
          </div>
          <div className="text-[10px] tracking-[3px] uppercase text-[#52B788] font-dm">
            Potosina · Panel Admin
          </div>
        </div>

        <div className="border border-white/10 bg-[#1B4332]/30 p-8">
          <h1 className="font-cormorant text-[#FAFAF8] text-xl mb-6 text-center">
            Acceso Administrativo
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#FAFAF8]/50 font-dm mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Manolo"
                required
                autoFocus
                className="w-full bg-[#14342a]/50 border border-white/15 text-[#FAFAF8] font-dm text-sm px-4 py-3 focus:outline-none focus:border-[#52B788] transition-colors placeholder:text-[#FAFAF8]/20"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[2px] uppercase text-[#FAFAF8]/50 font-dm mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#14342a]/50 border border-white/15 text-[#FAFAF8] font-dm text-sm px-4 py-3 focus:outline-none focus:border-[#52B788] transition-colors placeholder:text-[#FAFAF8]/20"
              />
            </div>

            {error && (
              <p className="text-[#C9484A] font-dm text-xs text-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B4332] text-[#FAFAF8] py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-[#2D5A45] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Verificando..." : "Acceder al Panel"}
            </button>
          </form>

          <a
            href="/"
            className="block text-center mt-5 text-[10px] tracking-[1px] uppercase text-[#FAFAF8]/30 hover:text-[#FAFAF8]/60 font-dm transition-colors"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>
    </div>
  );
}
