"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { campoClasses } from "@/components/ui/Field";
import { buttonClasses } from "@/components/ui/Button";
import { CLIENT_API_BASE_URL, type Municipio } from "@/lib/api";
import { filtrarMunicipios, normalizarBusca, type MunicipioBusca } from "@/lib/buscaMunicipio";
import { cn } from "@/lib/utils";

type Props = {
  /** Lista já carregada pela página; sem ela, a lista é buscada ao focar o campo. */
  municipios?: MunicipioBusca[];
  rotulo?: string;
  rotuloVisivel?: boolean;
  placeholder?: string;
  mostrarBotao?: boolean;
  autoFocus?: boolean;
  className?: string;
  onNavegar?: () => void;
};

const LIMITE_SUGESTOES = 8;

export function BuscaMunicipio({
  municipios: municipiosIniciais,
  rotulo = "Buscar município",
  rotuloVisivel = true,
  placeholder = "Nome ou código IBGE",
  mostrarBotao = false,
  autoFocus = false,
  className,
  onNavegar
}: Props) {
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-campo`;
  const listaId = `${id}-lista`;
  const [municipios, setMunicipios] = useState<MunicipioBusca[] | null>(municipiosIniciais ?? null);
  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const carregando = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function carregarLista() {
    if (municipios || carregando.current) return;
    carregando.current = true;
    fetch(`${CLIENT_API_BASE_URL}/municipios`)
      .then((resposta) => (resposta.ok ? (resposta.json() as Promise<Municipio[]>) : Promise.reject()))
      .then((lista) => setMunicipios(lista.map(({ codigo_ibge, nome }) => ({ codigo_ibge, nome }))))
      .catch(() => {
        carregando.current = false;
      });
  }

  const resultados = useMemo(() => filtrarMunicipios(municipios ?? [], termo), [municipios, termo]);
  const sugestoes = resultados.slice(0, LIMITE_SUGESTOES);
  const temTermo = termo.trim().length > 0;
  const listaVisivel = aberta && temTermo;

  function navegar(municipio: MunicipioBusca) {
    setAberta(false);
    setTermo("");
    onNavegar?.();
    router.push(`/municipios/${municipio.codigo_ibge}`);
  }

  function confirmar() {
    const escolhido = sugestoes[ativo] ?? (resultados.length === 1 ? resultados[0] : null);
    if (escolhido) {
      navegar(escolhido);
      return;
    }
    const codigo = termo.trim();
    if (/^\d{7}$/.test(codigo)) {
      const exato = municipios?.find((municipio) => municipio.codigo_ibge === codigo);
      navegar(exato ?? { codigo_ibge: codigo, nome: codigo });
      return;
    }
    const exatoPorNome = resultados.find((municipio) => normalizarBusca(municipio.nome) === normalizarBusca(termo));
    if (exatoPorNome) navegar(exatoPorNome);
  }

  function aoTeclar(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAberta(true);
      setAtivo((atual) => Math.min(sugestoes.length - 1, atual + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setAtivo((atual) => Math.max(-1, atual - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      confirmar();
    } else if (event.key === "Escape") {
      if (listaVisivel) {
        event.stopPropagation();
        setAberta(false);
        setAtivo(-1);
      }
    }
  }

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={inputId} className={rotuloVisivel ? "mb-1.5 block text-[13px] font-semibold text-ms-ink" : "sr-only"}>
        {rotulo}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={listaVisivel}
            aria-controls={listaId}
            aria-activedescendant={listaVisivel && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
            value={termo}
            placeholder={placeholder}
            onFocus={() => {
              carregarLista();
              setAberta(true);
            }}
            onBlur={() => setTimeout(() => setAberta(false), 120)}
            onChange={(event) => {
              setTermo(event.target.value);
              setAtivo(-1);
              setAberta(true);
            }}
            onKeyDown={aoTeclar}
            className={cn(campoClasses, "pl-9")}
          />
        </div>
        {mostrarBotao ? (
          <button type="button" onClick={confirmar} className={buttonClasses("primary", "md", "shrink-0")}>
            Abrir ficha
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <ul
        id={listaId}
        role="listbox"
        aria-label="Municípios encontrados"
        hidden={!listaVisivel}
        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-ms-line bg-ms-surface py-1 text-sm shadow-e2"
      >
        {municipios === null ? (
          <li className="px-3 py-2 text-ms-muted">Carregando municípios…</li>
        ) : sugestoes.length === 0 ? (
          <li className="px-3 py-2 text-ms-muted">Nenhum município encontrado</li>
        ) : (
          sugestoes.map((municipio, indice) => (
            <li
              key={municipio.codigo_ibge}
              id={`${listaId}-${indice}`}
              role="option"
              aria-selected={indice === ativo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => navegar(municipio)}
              onMouseEnter={() => setAtivo(indice)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-ms-ink",
                indice === ativo && "bg-ms-sky"
              )}
            >
              <span className="font-medium">{municipio.nome}</span>
              <span className="font-data text-xs text-ms-muted">{municipio.codigo_ibge}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
