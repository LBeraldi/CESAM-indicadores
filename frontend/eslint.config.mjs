import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "out/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Efeitos existentes resetam estado derivado de forma sincrona ao
      // trocar de metrica antes de buscar os novos dados; migrar para o
      // padrao sugerido pela regra exige revisar a arquitetura desses
      // componentes, entao fica como debito tecnico separado do bump do
      // eslint-config-next.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
