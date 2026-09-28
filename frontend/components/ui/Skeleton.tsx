import { cn } from "@/lib/utils";

/** CP-05.3: bloco com a forma do conteúdo final; sem animação com movimento reduzido (regra global). */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("esqueleto block h-3 rounded bg-ms-line", className)} />;
}

export function SkeletonLinhas({ linhas = 6, rotulo = "Carregando" }: { linhas?: number; rotulo?: string }) {
  return (
    <div className="grid gap-3 p-5" role="status" aria-live="polite">
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} className="flex items-center gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
