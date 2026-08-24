import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardItem = {
  label: string;
  value: ReactNode;
  icon: ElementType;
  accent?: string;
  tone?: "blue" | "green" | "teal" | "amber" | "navy";
  detail?: string;
};

const STAT_TONE_CLASSES = {
  blue: { bar: "bg-ms-blue", icon: "bg-ms-sky text-ms-blue", dot: "bg-ms-blue" },
  green: { bar: "bg-ms-green", icon: "bg-[#e3f2ed] text-ms-green", dot: "bg-ms-green" },
  teal: { bar: "bg-ms-teal", icon: "bg-[#e2f3f1] text-ms-teal", dot: "bg-ms-teal" },
  amber: { bar: "bg-ms-amber", icon: "bg-[#fbf1db] text-ms-amber", dot: "bg-ms-amber" },
  navy: { bar: "bg-ms-navy", icon: "bg-[#e5ebf3] text-ms-navy", dot: "bg-ms-navy" }
} as const;

type Props = {
  items: StatCardItem[];
  className?: string;
};

export function StatCardGroup({ items, className }: Props) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "blue";
        const toneClasses = STAT_TONE_CLASSES[tone];

        return (
          <div
            key={item.label}
            className="group relative flex min-h-[9.75rem] flex-col overflow-hidden rounded-xl border border-ms-line bg-white p-5 shadow-[0_8px_24px_rgba(16,32,51,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-ms-blue/40 hover:shadow-soft"
          >
            <span className={cn("absolute inset-x-0 top-0 h-1", toneClasses.bar)} aria-hidden="true" />
            <div className="flex items-center gap-3 text-sm text-ms-muted">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  item.accent ?? toneClasses.icon
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 text-xs font-semibold uppercase tracking-[0.11em]">{item.label}</span>
            </div>
            <p className="font-data mt-4 min-h-10 text-[1.75rem] font-medium leading-tight tracking-[-0.04em] text-ms-ink sm:text-3xl">
              {item.value}
            </p>
            <div className="mt-auto flex items-center gap-2 border-t border-ms-line/80 pt-3 text-[0.7rem] font-medium text-ms-muted">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneClasses.dot)} aria-hidden="true" />
              <span>{item.detail ?? "Informação municipal"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
