import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Database, Trophy } from "lucide-react";
import "./globals.css";

const TITULO = "Observatório de Saneamento";
const DESCRICAO =
  "Plataforma do Centro de Estudos em Saneamento Ambiental para consulta, comparação e exportação de indicadores municipais de saneamento de Mato Grosso do Sul.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002"),
  title: {
    default: TITULO,
    template: `%s | ${TITULO}`
  },
  description: DESCRICAO,
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  },
  openGraph: {
    locale: "pt_BR",
    type: "website",
    images: ["/brand/observatorio-saneamento.svg"]
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/observatorio-saneamento.svg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-ms-bg font-sans text-ms-ink antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="no-print sticky top-0 z-40 border-b border-ms-line/80 bg-white/95 backdrop-blur">
            <div className="border-b border-ms-line/60 bg-ms-navy text-white">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs">
                <span className="font-medium">Centro de Estudos em Saneamento Ambiental</span>
                <span className="hidden text-white/75 sm:inline">Dados oficiais para analise municipal</span>
              </div>
            </div>

            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="flex items-center" aria-label="Observatório de Saneamento, página inicial">
                <Image
                  src="/brand/observatorio-saneamento.svg"
                  alt="Observatório de Saneamento"
                  width={272}
                  height={56}
                  priority
                  className="h-10 w-auto max-w-[13rem] sm:h-14 sm:max-w-[17rem]"
                />
              </Link>

              <nav
                className="-mx-4 flex flex-nowrap items-center justify-between gap-0 overflow-x-auto px-4 text-sm font-medium text-ms-muted [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-start sm:gap-2 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
                aria-label="Navegacao principal"
              >
                <Link
                  href="/"
                  className="inline-flex h-10 shrink-0 items-center rounded-md px-1.5 hover:bg-ms-sky hover:text-ms-blue sm:px-3"
                >
                  Visao geral
                </Link>
                <Link
                  href="/municipios"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-1.5 hover:bg-ms-sky hover:text-ms-blue sm:gap-2 sm:px-3"
                >
                  <BarChart3 className="h-4 w-4" />
                  Municipios
                </Link>
                <Link
                  href="/ranking"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-1.5 hover:bg-ms-sky hover:text-ms-blue sm:gap-2 sm:px-3"
                >
                  <Trophy className="h-4 w-4" />
                  Ranking
                </Link>
                <a
                  href={`${apiUrl}/docs`}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-ms-line bg-white px-1.5 text-ms-ink hover:border-ms-blue hover:text-ms-blue sm:gap-2 sm:px-3"
                >
                  <Database className="h-4 w-4" />
                  API
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="no-print border-t border-ms-line bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <Image
                  src="/brand/observatorio-saneamento.svg"
                  alt="Observatório de Saneamento"
                  width={288}
                  height={64}
                  className="h-12 w-auto max-w-[14rem] sm:h-16 sm:max-w-[18rem]"
                />
                <p className="mt-3 max-w-xl text-sm leading-6 text-ms-muted">
                  Plataforma para consulta, comparação e exportação de indicadores municipais de saneamento.
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-ms-ink">Navegacao</h2>
                <div className="mt-3 grid gap-2 text-sm text-ms-muted">
                  <Link href="/" className="hover:text-ms-blue">Visao geral</Link>
                  <Link href="/municipios" className="hover:text-ms-blue">Municipios</Link>
                  <Link href="/ranking" className="hover:text-ms-blue">Ranking</Link>
                  <a href={`${apiUrl}/docs`} className="hover:text-ms-blue">Documentacao da API</a>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-ms-ink">Fontes</h2>
                <div className="mt-3 grid gap-2 text-sm text-ms-muted">
                  <span>SINISA 2023</span>
                  <span>SNIS Serie Historica 1995-2022</span>
                  <span>Malha municipal IBGE</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
