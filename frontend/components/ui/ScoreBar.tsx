import { cn } from "@/lib/utils";

/** Barra da nota em escala fixa 0–100 com marca em 50. Decorativa: o valor está no texto ao lado. */
export function ScoreBar({ valor, cor, className }: { valor: number | null; cor?: string; className?: string }) {
  const largura = valor === null ? 0 : Math.max(0, Math.min(100, valor));

  return (
    <span aria-hidden="true" className={cn("relative inline-block h-1.5 w-20 shrink-0 rounded-[1px] bg-ms-line", className)}>
      <span
        className="absolute inset-y-0 left-0 rounded-[1px] bg-ms-green"
        style={{ width: `${largura}%`, background: cor }}
      />
      <span className="absolute -inset-y-[3px] left-1/2 w-px bg-ms-line-strong" />
    </span>
  );
}
