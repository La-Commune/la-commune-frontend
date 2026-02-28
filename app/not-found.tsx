import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-10 px-6">

      <div className="text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.5em] text-stone-700">
          404
        </p>
        <h1
          className="text-5xl sm:text-6xl font-light tracking-wide text-stone-200"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Página no encontrada
        </h1>
        <div className="w-6 h-px bg-stone-700 mx-auto" />
        <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">
          Parece que esta página no existe o fue movida. ¿Regresamos?
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-stone-400 hover:text-white transition-colors duration-300 group"
      >
        <span className="w-6 h-px bg-stone-600 group-hover:w-10 group-hover:bg-white transition-all duration-500" />
        Volver al inicio
      </Link>

    </div>
  );
}
