import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariante = "official" | "historical" | "inverse" | "missing" | "warning" | "neutral";

const VARIANTES: Record<BadgeVariante, string> = {
  official: "bg-sem-positive-bg text-sem-positive",
  historical: "bg-sem-info-bg text-sem-info",
  inverse: "border border-ms-line-strong bg-ms-surface text-ms-ink",
  missing: "border border-dashed border-sem-neutral bg-ms-surface text-sem-neutral",
  warning: "bg-sem-warning-bg text-sem-warning",
  neutral: "bg-sem-neutral-bg text-sem-neutral"
};

/** CP-03: raio 4px, altura 22px, texto 12px 600. O texto carrega o significado. */
export function Badge({
  variante = "neutral",
  className,
  children
}: {
  variante?: BadgeVariante;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded px-2 text-xs font-semibold",
        VARIANTES[variante],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Rótulo de fonte sempre com o ano (CP-03.2). */
export function rotuloFonte(fonte: string | null | undefined, ano: number): string {
  const texto = fonte?.trim() || "Fonte não informada";
  if (!fonte) return texto;
  return /\b(19|20)\d{2}\b/.test(texto) ? texto : `${texto} ${ano}`;
}

export function varianteFonte(fonte: string | null | undefined, status?: string | null): BadgeVariante {
  const texto = `${fonte ?? ""} ${status ?? ""}`.toLocaleLowerCase("pt-BR");
  if (texto.includes("sinisa")) return "official";
  if (texto.includes("snis")) return "historical";
  return "neutral";
}

export function BadgeFonte({ fonte, ano, status }: { fonte: string | null | undefined; ano: number; status?: string | null }) {
  return <Badge variante={varianteFonte(fonte, status)}>{rotuloFonte(fonte, ano)}</Badge>;
}
