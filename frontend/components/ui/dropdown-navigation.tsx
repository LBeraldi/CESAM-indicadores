"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ElementType } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type NavSubItem = {
  label: string;
  description: string;
  icon: ElementType;
  href: string;
  external?: boolean;
};

export type NavSubMenu = {
  title: string;
  items: NavSubItem[];
};

export type NavItem = {
  id: number;
  label: string;
  link?: string;
  subMenus?: NavSubMenu[];
};

type Props = {
  navItems: NavItem[];
};

export function DropdownNavigation({ navItems }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [alignRight, setAlignRight] = useState<Record<string, boolean>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!openMenu) return;

    const panel = panelRefs.current[openMenu];
    if (!panel) return;

    const overflowsRight = panel.getBoundingClientRect().right > window.innerWidth - 16;
    setAlignRight((current) =>
      current[openMenu] === overflowsRight ? current : { ...current, [openMenu]: overflowsRight }
    );
  }, [openMenu]);

  useLayoutEffect(() => {
    const resetAlignment = () => setAlignRight({});
    window.addEventListener("resize", resetAlignment);
    return () => window.removeEventListener("resize", resetAlignment);
  }, []);

  useEffect(() => {
    if (!openMenu) return;

    function fecharSeForaOuEscape(event: MouseEvent | TouchEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpenMenu(null);
        return;
      }
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("click", fecharSeForaOuEscape);
    document.addEventListener("touchstart", fecharSeForaOuEscape);
    document.addEventListener("keydown", fecharSeForaOuEscape);
    return () => {
      document.removeEventListener("click", fecharSeForaOuEscape);
      document.removeEventListener("touchstart", fecharSeForaOuEscape);
      document.removeEventListener("keydown", fecharSeForaOuEscape);
    };
  }, [openMenu]);

  return (
    <nav ref={navRef} className="relative" aria-label="Navegação principal">
      <ul
        className="-mx-4 flex flex-nowrap items-center gap-0 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {navItems.map((navItem) => {
          const isOpen = openMenu === navItem.label;
          const triggerClassName =
            "group relative flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-3 text-sm font-medium text-ms-muted transition-colors duration-300 hover:text-ms-blue";

          const triggerContent = (
            <>
              <span className="relative z-10">{navItem.label}</span>
              {navItem.subMenus && (
                <ChevronDown
                  className={`relative z-10 h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : "group-hover:rotate-180"
                  }`}
                />
              )}
              {(hoveredId === navItem.id || isOpen) && (
                <motion.div
                  layoutId="nav-hover-bg"
                  className="absolute inset-0 size-full bg-ms-sky"
                  style={{ borderRadius: 9999 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </>
          );

          return (
            <li
              key={navItem.label}
              className="relative"
              onMouseEnter={() => setOpenMenu(navItem.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              {navItem.subMenus && !navItem.link ? (
                <button
                  type="button"
                  className={triggerClassName}
                  onMouseEnter={() => setHoveredId(navItem.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setOpenMenu((current) => (current === navItem.label ? null : navItem.label))}
                  aria-expanded={isOpen}
                >
                  {triggerContent}
                </button>
              ) : (
                <Link
                  href={navItem.link ?? "#"}
                  className={triggerClassName}
                  onMouseEnter={() => setHoveredId(navItem.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setOpenMenu(null)}
                  aria-expanded={navItem.subMenus ? isOpen : undefined}
                >
                  {triggerContent}
                </Link>
              )}

              <AnimatePresence>
                {isOpen && navItem.subMenus && (
                  <div
                    ref={(node) => {
                      panelRefs.current[navItem.label] = node;
                    }}
                    className={`absolute top-full w-auto pt-2 ${
                      alignRight[navItem.label] ? "right-0" : "left-0"
                    }`}
                  >
                    <motion.div
                      layoutId="nav-menu"
                      className="w-max max-w-[90vw] rounded-2xl border border-ms-line bg-white p-4 shadow-soft sm:max-w-[34rem]"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      <div className="flex flex-wrap gap-x-9 gap-y-6">
                        {navItem.subMenus.map((sub) => (
                          <motion.div layout className="min-w-[11rem] flex-1 basis-44" key={sub.title}>
                            <h3 className="mb-4 text-sm font-medium text-ms-muted">{sub.title}</h3>
                            <ul className="space-y-6">
                              {sub.items.map((item) => {
                                const Icon = item.icon;
                                const linkProps = item.external
                                  ? { target: "_blank", rel: "noopener noreferrer" }
                                  : {};

                                return (
                                  <li key={item.label}>
                                    <Link href={item.href} className="group flex items-start space-x-3" {...linkProps}>
                                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-ms-line text-ms-ink transition-colors duration-300 group-hover:border-ms-blue group-hover:bg-ms-sky group-hover:text-ms-blue">
                                        <Icon className="h-5 w-5 flex-none" />
                                      </div>
                                      <div className="leading-5">
                                        <p className="text-sm font-medium text-ms-ink">{item.label}</p>
                                        <p className="mt-0.5 max-w-[12rem] text-xs text-ms-muted transition-colors duration-300 group-hover:text-ms-ink">
                                          {item.description}
                                        </p>
                                      </div>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </motion.div>
                        ))}
                      </div>

                      {navItem.link && (
                        <div className="mt-4 border-t border-ms-line pt-3">
                          <Link href={navItem.link} className="text-xs font-semibold text-ms-blue hover:underline">
                            Ver {navItem.label.toLowerCase()} →
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
