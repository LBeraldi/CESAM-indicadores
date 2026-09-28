import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "primary" | "secondary" | "ghost";
type Tamanho = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const VARIANTES: Record<Variante, string> = {
  primary:
    "border-transparent bg-ms-blue text-white hover:bg-ms-navy disabled:bg-sem-neutral-bg disabled:text-sem-neutral aria-disabled:bg-sem-neutral-bg aria-disabled:text-sem-neutral",
  secondary:
    "border-ms-line-strong bg-ms-surface text-ms-ink hover:border-ms-blue hover:text-ms-blue disabled:text-sem-neutral",
  ghost: "border-transparent bg-transparent text-ms-blue hover:bg-ms-sky"
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-2.5 text-[13px]"
};

export function buttonClasses(variante: Variante = "secondary", tamanho: Tamanho = "md", className?: string) {
  return cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamanho?: Tamanho;
};

export function Button({ variante, tamanho, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variante, tamanho, className)} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  children: ReactNode;
  externo?: boolean;
};

export function ButtonLink({ href, variante, tamanho, className, externo, children, ...props }: ButtonLinkProps) {
  const classes = buttonClasses(variante, tamanho, className);
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
