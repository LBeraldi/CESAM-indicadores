import { describe, expect, it } from "vitest";
import { classeDaNota, classePorQuebras, quebrasPorQuintil } from "@/lib/escalaMapa";

describe("escala do mapa (DS-05)", () => {
  it("usa limites fixos de 20 pontos para a nota", () => {
    expect(classeDaNota(0)).toBe(1);
    expect(classeDaNota(19.9)).toBe(1);
    expect(classeDaNota(20)).toBe(2);
    expect(classeDaNota(59.99)).toBe(3);
    expect(classeDaNota(60)).toBe(4);
    expect(classeDaNota(80)).toBe(5);
    expect(classeDaNota(100)).toBe(5);
  });

  it("não colore ausência de dado", () => {
    expect(classeDaNota(null)).toBeNull();
    expect(classeDaNota(undefined)).toBeNull();
    expect(classePorQuebras(null, [1, 2, 3, 4])).toBeNull();
  });

  it("calcula quintis e inverte a escala quando menor é melhor", () => {
    const quebras = quebrasPorQuintil([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(quebras).toEqual([20, 40, 60, 80]);
    expect(classePorQuebras(5, quebras)).toBe(1);
    expect(classePorQuebras(95, quebras)).toBe(5);
    expect(classePorQuebras(5, quebras, true)).toBe(5);
    expect(classePorQuebras(95, quebras, true)).toBe(1);
  });
});
