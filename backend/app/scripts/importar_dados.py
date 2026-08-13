import argparse
from pathlib import Path

from app.database import SessionLocal
from app.scripts.migrar import migrar
from app.seed import DATA_DIR, seed_all
from app.services.ingestao import EXTENSOES_SUPORTADAS, listar_arquivos, processar_arquivo, processar_zip

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def resolver_caminho_input(raw: str) -> Path:
    caminho = Path(raw).expanduser()
    if caminho.exists():
        return caminho

    fallback = DATA_DIR / "raw"
    if "data" in caminho.parts and "raw" in caminho.parts and fallback.exists():
        return fallback
    return caminho


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa arquivos oficiais colocados manualmente em data/raw.")
    parser.add_argument(
        "--input", default=str(DATA_DIR / "raw"), help="Arquivo ou diretorio com CSV, XLSX, XLS ou ZIP."
    )
    parser.add_argument("--fonte", required=True, help="Nome da fonte, por exemplo SINISA, SNIS ou IBGE.")
    parser.add_argument(
        "--ano", type=int, default=None, help="Ano de referencia usado quando o arquivo nao trouxer ano."
    )
    args = parser.parse_args()

    entrada = resolver_caminho_input(args.input)
    if not entrada.exists():
        raise SystemExit(f"Entrada nao encontrada: {entrada}")

    migrar()
    with SessionLocal() as db:
        seed_all(db)
        arquivos = listar_arquivos(entrada)
        if not arquivos:
            raise SystemExit(f"Nenhum arquivo suportado encontrado em {entrada}")

        resultados = []
        for arquivo in arquivos:
            extensao = arquivo.suffix.lower()
            if extensao == ".zip":
                resultados.extend(processar_zip(db, arquivo, args.fonte, args.ano, DATA_DIR / "processed"))
            elif extensao in EXTENSOES_SUPORTADAS:
                resultados.append(processar_arquivo(db, arquivo, args.fonte, args.ano, DATA_DIR / "processed"))

    for resultado in resultados:
        print(
            f"{resultado.arquivo}: {resultado.linhas_importadas}/{resultado.total_linhas} linhas importadas, "
            f"{resultado.linhas_com_erro} com erro"
        )
        for aviso in resultado.avisos[:10]:
            print(f"  aviso: {aviso}")
        if len(resultado.avisos) > 10:
            print(f"  ... {len(resultado.avisos) - 10} avisos adicionais registrados no banco")


if __name__ == "__main__":
    main()
