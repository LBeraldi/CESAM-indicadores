import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "info" | "warning" | "error" | "success";

const ESTILOS: Record<Variante, { classe: string; Icone: typeof Info }> = {
  info: { classe: "border-sem-info/30 bg-sem-info-bg text-ms-navy", Icone: Info },
  warning: { classe: "border-sem-warning/30 bg-sem-warning-bg text-sem-warning", Icone: AlertTriangle },
  error: { classe: "border-sem-negative/30 bg-sem-negative-bg text-sem-negative", Icone: XCircle },
  success: { classe: "border-sem-positive/30 bg-sem-positive-bg text-sem-positive", Icone: CheckCircle2 }
};

/** CP-04: ícone, título curto e texto. Erro usa role="alert"; os demais, role="status". */
export function Alert({
  variante = "info",
  titulo,
  children,
  acao,
  className
}: {
  variante?: Variante;
  titulo?: string;
  children?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  const { classe, Icone } = ESTILOS[variante];

  return (
    <div
      role={variante === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border px-4 py-3 text-sm", classe, className)}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo ? <p className="font-semibold">{titulo}</p> : null}
        {children ? <div className={titulo ? "mt-0.5" : undefined}>{children}</div> : null}
        {acao ? <div className="mt-2">{acao}</div> : null}
      </div>
    </div>
  );
}
