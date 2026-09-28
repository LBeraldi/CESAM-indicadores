"use client";

import { ExternalLink, Menu, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { cn } from "@/lib/utils";

type NavbarProps = {
  apiUrl: string;
};

type ItemNav = {
  rotulo: string;
  href: string;
  externo?: boolean;
};

function estaAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** CP-14: navegação plana com cinco destinos reais, sem submenus. */
export function Navbar({ apiUrl }: NavbarProps) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const botaoMenuRef = useRef<HTMLButtonElement>(null);
  const botaoBuscaRef = useRef<HTMLButtonElement>(null);

  const itens: ItemNav[] = [
    { rotulo: "Visão geral", href: "/" },
    { rotulo: "Municípios", href: "/municipios" },
    { rotulo: "Ranking", href: "/ranking" },
    { rotulo: "Metodologia e fontes", href: "/metodologia" },
    { rotulo: "API", href: `${apiUrl}/docs`, externo: true }
  ];

  useEffect(() => {
    if (!menuAberto && !buscaAberta) return;

    function aoTeclar(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuAberto) {
        setMenuAberto(false);
        botaoMenuRef.current?.focus();
      }
      if (buscaAberta) {
        setBuscaAberta(false);
        botaoBuscaRef.current?.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto, buscaAberta]);

  function fecharTudo() {
    setMenuAberto(false);
    setBuscaAberta(false);
  }

  function renderizarLink(item: ItemNav, variante: "barra" | "lista") {
    const ativo = !item.externo && estaAtivo(pathname, item.href);
    const classe =
      variante === "barra"
        ? cn(
            "inline-flex h-10 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium",
            ativo ? "text-ms-ink shadow-[inset_0_-2px_0_var(--color-action)]" : "text-ms-muted hover:text-ms-ink"
          )
        : cn(
            "flex h-11 items-center justify-between gap-2 rounded-md px-3 text-base font-medium",
            ativo ? "bg-ms-sky text-ms-ink" : "text-ms-ink hover:bg-ms-surface-muted"
          );

    if (item.externo) {
      return (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={classe} onClick={fecharTudo}>
          {item.rotulo}
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      );
    }

    return (
      <Link href={item.href} className={classe} aria-current={ativo ? "page" : undefined} onClick={fecharTudo}>
        {item.rotulo}
      </Link>
    );
  }

  return (
    <>
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Observatório de Saneamento, página inicial" onClick={fecharTudo}>
          <Image
            src="/brand/observatorio-saneamento.svg"
            alt="Observatório de Saneamento"
            width={272}
            height={56}
            priority
            className="h-9 w-auto max-w-[11rem] md:h-11 md:max-w-[14rem]"
          />
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center">
            {itens.map((item) => (
              <li key={item.rotulo}>{renderizarLink(item, "barra")}</li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <BuscaMunicipio rotuloVisivel={false} className="hidden w-60 xl:block" />
          <button
            ref={botaoBuscaRef}
            type="button"
            aria-expanded={buscaAberta}
            aria-controls="busca-cabecalho"
            aria-label="Buscar município"
            onClick={() => {
              setBuscaAberta((atual) => !atual);
              setMenuAberto(false);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ms-line text-ms-ink hover:border-ms-blue hover:text-ms-blue xl:hidden"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            ref={botaoMenuRef}
            type="button"
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            onClick={() => {
              setMenuAberto((atual) => !atual);
              setBuscaAberta(false);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-ms-line px-3 text-sm font-semibold text-ms-ink hover:border-ms-blue hover:text-ms-blue lg:hidden"
          >
            {menuAberto ? (
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            Menu
          </button>
        </div>
      </div>

      {buscaAberta ? (
        <div id="busca-cabecalho" className="border-t border-ms-line bg-ms-surface xl:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 lg:px-8">
            <BuscaMunicipio rotuloVisivel={false} autoFocus onNavegar={fecharTudo} />
          </div>
        </div>
      ) : null}

      {menuAberto ? (
        <nav id="menu-celular" aria-label="Navegação principal" className="border-t border-ms-line bg-ms-surface lg:hidden">
          <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-3 md:px-6">
            {itens.map((item) => (
              <li key={item.rotulo}>{renderizarLink(item, "lista")}</li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
