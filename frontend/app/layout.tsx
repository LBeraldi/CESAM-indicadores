import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const fontSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap"
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap"
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";

  return (
    <html lang="pt-BR" className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`}>
      <body className="min-h-screen bg-ms-bg font-sans text-ms-ink antialiased">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <div className="flex min-h-screen flex-col">
          <header className="no-print sticky top-0 z-40 border-b border-ms-line bg-ms-surface">
            <div className="bg-ms-navy text-white">
              <div className="mx-auto flex h-7 max-w-7xl items-center justify-between gap-4 px-4 text-xs md:h-8 md:px-6 lg:px-8">
                <span className="truncate font-medium">Centro de Estudos em Saneamento Ambiental · UEMS</span>
                <span className="hidden text-white/80 sm:inline">Dados oficiais para análise municipal</span>
              </div>
            </div>
            <Navbar apiUrl={apiUrl} />
          </header>

          <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>

          <footer className="no-print relative overflow-hidden border-t border-ms-line bg-ms-surface">
            <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 md:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
              <div>
                <Image
                  src="/brand/observatorio-saneamento.svg"
                  alt="Observatório de Saneamento"
                  width={288}
                  height={64}
                  className="h-12 w-auto max-w-[14rem]"
                />
                <p className="mt-3 max-w-sm text-sm leading-[22px] text-ms-muted">
                  Plataforma do Centro de Estudos em Saneamento Ambiental (CESAM/UEMS) para consulta, comparação e
                  exportação de indicadores municipais de saneamento.
                </p>
              </div>

              <div>
                <h2 className="t-label text-ms-ink">Navegação</h2>
                <ul className="mt-3 grid gap-2 text-sm text-ms-muted">
                  <li><Link href="/" className="hover:text-ms-blue">Visão geral</Link></li>
                  <li><Link href="/municipios" className="hover:text-ms-blue">Lista de municípios</Link></li>
                  <li><Link href="/ranking" className="hover:text-ms-blue">Ranking</Link></li>
                  <li><Link href="/metodologia" className="hover:text-ms-blue">Metodologia e fontes</Link></li>
                </ul>
              </div>

              <div>
                <h2 className="t-label text-ms-ink">Fontes</h2>
                <ul className="mt-3 grid gap-2 text-sm text-ms-muted">
                  <li>SINISA 2024</li>
                  <li>SNIS Série Histórica 1995–2022</li>
                  <li>Malha municipal IBGE</li>
                </ul>
              </div>

              <div>
                <h2 className="t-label text-ms-ink">Dados abertos</h2>
                <ul className="mt-3 grid gap-2 text-sm text-ms-muted">
                  <li>
                    <a href={`${apiUrl}/docs`} target="_blank" rel="noopener noreferrer" className="hover:text-ms-blue">
                      Documentação da API ↗
                    </a>
                  </li>
                  <li>Exportação CSV em cada ficha municipal</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-ms-line">
              <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-ms-muted md:px-6 lg:px-8">
                © CESAM · UEMS
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
