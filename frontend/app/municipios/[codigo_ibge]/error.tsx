"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MunicipioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao carregar a ficha municipal", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
      <p className="eyebrow">Ficha municipal</p>
      <h1 className="t-h2 mt-4 text-ms-ink">Não foi possível carregar os dados</h1>
      <p className="mt-3 text-sm text-ms-muted">
        A API pode estar temporariamente indisponível. Tente novamente em alguns instantes.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-ms-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Tentar novamente
        </button>
        <Link href="/municipios" className="rounded-md border border-ms-line px-4 py-2 text-sm font-semibold text-ms-ink hover:border-ms-blue">
          Voltar aos municípios
        </Link>
      </div>
    </main>
  );
}
