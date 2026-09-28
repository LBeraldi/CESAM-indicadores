import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** CP-05.1: ícone, frase que cita o termo buscado e ação. */
export function EmptyState({
  titulo,
  descricao,
  acao,
  className
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)} role="status">
      <SearchX className="h-6 w-6 text-ms-muted" strokeWidth={1.75} aria-hidden="true" />
      <p className="font-semibold text-ms-ink">{titulo}</p>
      {descricao ? <p className="max-w-md text-sm text-ms-muted">{descricao}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}
