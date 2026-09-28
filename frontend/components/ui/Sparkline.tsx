export type PontoSerie = { ano: number; valor: number };

/** CP-09.1: 88×24, linha na cor da dimensão, ponto final destacado, decorativa. */
export function Sparkline({ pontos, cor = "currentColor" }: { pontos: PontoSerie[]; cor?: string }) {
  if (pontos.length < 2) {
    return null;
  }

  const largura = 88;
  const altura = 24;
  const valores = pontos.map((ponto) => ponto.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const amplitude = maximo - minimo || 1;
  const passo = largura / (pontos.length - 1);
  const coordenadas = pontos.map((ponto, indice) => [indice * passo, altura - 3 - ((ponto.valor - minimo) / amplitude) * (altura - 6)] as const);
  const linha = coordenadas.map(([x, y], indice) => `${indice === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ultimoX, ultimoY] = coordenadas[coordenadas.length - 1];

  return (
    <svg width={largura} height={altura} viewBox={`-2 0 ${largura + 4} ${altura}`} className="block shrink-0" aria-hidden="true">
      <path d={linha} fill="none" stroke={cor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ultimoX} cy={ultimoY} r={2.5} fill={cor} />
    </svg>
  );
}
