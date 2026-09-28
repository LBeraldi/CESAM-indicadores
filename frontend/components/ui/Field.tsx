import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// CP-02: altura 40px, 16px no celular (evita zoom no iOS), borda line-strong.
export const campoClasses =
  "h-10 w-full rounded-md border border-ms-line-strong bg-ms-surface px-3 text-base text-ms-ink outline-none focus:border-ms-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ms-blue disabled:cursor-not-allowed disabled:bg-ms-surface-muted disabled:text-ms-muted md:text-sm";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

/** Rótulo sempre visível acima do controle (CP-02.1). */
export function Field({ label, htmlFor, hint, className, labelClassName, children }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className={cn("text-[13px] font-semibold text-ms-ink", labelClassName)}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ms-muted">{hint}</p> : null}
    </div>
  );
}
