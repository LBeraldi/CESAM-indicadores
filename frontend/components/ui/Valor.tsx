import { cn } from "@/lib/utils";
import { SEM_DADO, formatarValor } from "@/lib/formatters";

/** Número em mono tabular; unidade separada em Public Sans menor e cinza (DS-06, CP-06.2). */
export function Valor({
  valor,
  unidade,
  className,
  numeroClassName
}: {
  valor: number | null | undefined;
  unidade: string | null | undefined;
  className?: string;
  numeroClassName?: string;
}) {
  const formatado = formatarValor(valor, unidade);

  if (formatado.numero === SEM_DADO) {
    return (
      <span className={cn("text-ms-muted", className)}>
        <span aria-hidden="true">{SEM_DADO}</span>
        <span className="sr-only">sem dado</span>
      </span>
    );
  }

  return (
    <span className={cn("whitespace-nowrap", className)}>
      <span className={cn("font-data", numeroClassName)}>{formatado.numero}</span>
      {formatado.unidade ? <span className="ml-1 font-sans text-xs font-normal text-ms-muted">{formatado.unidade}</span> : null}
    </span>
  );
}
