"use client";

import {
  BarChart3,
  CloudRain,
  Database,
  Droplets,
  FileText,
  Globe,
  History,
  MapPinned,
  ShieldCheck,
  Trash2,
  Trophy,
  Waves
} from "lucide-react";

import { DropdownNavigation, type NavItem } from "@/components/ui/dropdown-navigation";

type NavbarProps = {
  apiUrl: string;
};

export function Navbar({ apiUrl }: NavbarProps) {
  const navItems: NavItem[] = [
    {
      id: 1,
      label: "Visão geral",
      link: "/"
    },
    {
      id: 2,
      label: "Municípios",
      link: "/municipios",
      subMenus: [
        {
          title: "Dimensões avaliadas",
          items: [
            {
              label: "Água",
              description: "Abastecimento e perdas na distribuição",
              icon: Droplets,
              href: "/municipios"
            },
            {
              label: "Esgoto",
              description: "Coleta e tratamento de esgotamento sanitário",
              icon: Waves,
              href: "/municipios"
            },
            {
              label: "Resíduos sólidos",
              description: "Coleta e destinação dos resíduos urbanos",
              icon: Trash2,
              href: "/municipios"
            },
            {
              label: "Águas pluviais",
              description: "Drenagem urbana e gestão de risco",
              icon: CloudRain,
              href: "/municipios"
            },
            {
              label: "Gestão municipal",
              description: "Capacidade institucional de gestão do saneamento",
              icon: ShieldCheck,
              href: "/municipios"
            }
          ]
        },
        {
          title: "Consultar",
          items: [
            {
              label: "Lista de municípios",
              description: "Os 79 municípios de MS com indicadores por tema",
              icon: MapPinned,
              href: "/municipios"
            },
            {
              label: "Mapa interativo",
              description: "Selecione um município no mapa para abrir a ficha",
              icon: Globe,
              href: "/#mapa-ms"
            }
          ]
        }
      ]
    },
    {
      id: 3,
      label: "Ranking",
      link: "/ranking",
      subMenus: [
        {
          title: "Metodologia GRMD/PNQS",
          items: [
            {
              label: "Nota geral",
              description: "Nota de 0 a 100 com os indicadores oficiais disponíveis",
              icon: Trophy,
              href: "/ranking"
            },
            {
              label: "Cinco módulos",
              description: "Água (25%), esgoto (25%), resíduos (20%), águas pluviais (20%) e gestão (10%)",
              icon: BarChart3,
              href: "/ranking"
            },
            {
              label: "Cobertura de dados",
              description: "Indicadores ausentes não são estimados e recebem contribuição zero",
              icon: ShieldCheck,
              href: "/ranking"
            }
          ]
        }
      ]
    },
    {
      id: 4,
      label: "Dados",
      subMenus: [
        {
          title: "Fontes oficiais",
          items: [
            {
              label: "SINISA 2023",
              description: "Sistema Nacional de Informações sobre Saneamento",
              icon: Database,
              href: "/municipios"
            },
            {
              label: "SNIS Série Histórica",
              description: "Série histórica de indicadores entre 1995 e 2022",
              icon: History,
              href: "/municipios"
            },
            {
              label: "Malha municipal IBGE",
              description: "Delimitação geográfica dos 79 municípios de MS",
              icon: Globe,
              href: "/#mapa-ms"
            }
          ]
        },
        {
          title: "Documentação",
          items: [
            {
              label: "API",
              description: "Endpoints REST documentados para consulta dos dados",
              icon: FileText,
              href: `${apiUrl}/docs`,
              external: true
            }
          ]
        }
      ]
    }
  ];

  return <DropdownNavigation navItems={navItems} />;
}
