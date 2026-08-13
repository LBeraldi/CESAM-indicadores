import csv
import json
import os
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))
CADASTROS_INSTITUCIONAIS_PATH = Path(__file__).parent / "data" / "cadastros_institucionais.json"


MAIOR_MELHOR = "maior_melhor"
MENOR_MELHOR = "menor_melhor"
NEUTRO = "neutro"

INDICADORES_INICIAIS = [
    ("agua_atendimento_total", "Índice de atendimento total de água", "Água", "%", "SINISA/SNIS", MAIOR_MELHOR),
    ("agua_atendimento_urbano", "Índice de atendimento urbano de água", "Água", "%", "SINISA/SNIS", MAIOR_MELHOR),
    ("agua_perdas_distribuicao", "Índice de perdas na distribuição", "Água", "%", "SINISA/SNIS", MENOR_MELHOR),
    ("agua_consumo_per_capita", "Consumo médio per capita", "Água", "L/hab.dia", "SINISA/SNIS", NEUTRO),
    ("agua_extensao_rede", "Extensão da rede de distribuição de água", "Água", "km", "SINISA/SNIS", NEUTRO),
    ("esgoto_atendimento_total", "Índice de atendimento total de esgoto", "Esgoto", "%", "SINISA/SNIS", MAIOR_MELHOR),
    ("esgoto_atendimento_urbano", "Índice de atendimento urbano de esgoto", "Esgoto", "%", "SINISA/SNIS", MAIOR_MELHOR),
    ("esgoto_coleta", "Índice de coleta de esgoto", "Esgoto", "%", "SINISA/SNIS", MAIOR_MELHOR),
    ("esgoto_tratamento", "Índice de tratamento de esgoto", "Esgoto", "%", "SINISA/SNIS", MAIOR_MELHOR),
    (
        "esgoto_extensao_rede",
        "Extensão da rede pública de esgotamento sanitário",
        "Esgoto",
        "km",
        "SINISA/SNIS",
        NEUTRO,
    ),
    (
        "residuos_cobertura_coleta_domiciliar",
        "Cobertura de coleta domiciliar",
        "Resíduos sólidos",
        "%",
        "SINISA/SNIS",
        MAIOR_MELHOR,
    ),
    (
        "residuos_cobertura_coleta_seletiva",
        "Cobertura da população total com coleta seletiva",
        "Resíduos sólidos",
        "%",
        "SINISA",
        MAIOR_MELHOR,
    ),
    (
        "residuos_massa_coletada_per_capita",
        "Massa coletada per capita",
        "Resíduos sólidos",
        "kg/hab.dia",
        "SINISA/SNIS",
        NEUTRO,
    ),
    (
        "residuos_massa_recuperada_per_capita",
        "Massa recuperada de resíduos secos e orgânicos per capita",
        "Resíduos sólidos",
        "kg/hab.ano",
        "SINISA",
        MAIOR_MELHOR,
    ),
    (
        "aguas_pluviais_vias_pavimentadas",
        "Parcela de vias públicas pavimentadas na área urbana",
        "Águas pluviais",
        "%",
        "SINISA",
        MAIOR_MELHOR,
    ),
    (
        "aguas_pluviais_rede_subterranea",
        "Parcela de vias com redes de águas pluviais subterrâneas",
        "Águas pluviais",
        "%",
        "SINISA",
        MAIOR_MELHOR,
    ),
    (
        "aguas_pluviais_domicilios_risco_inundacao",
        "Parcela de domicílios sujeitos a risco de inundação",
        "Águas pluviais",
        "%",
        "SINISA",
        MENOR_MELHOR,
    ),
    (
        "aguas_pluviais_populacao_impactada",
        "Parcela da população impactada por eventos hidrológicos",
        "Águas pluviais",
        "%",
        "SINISA",
        MENOR_MELHOR,
    ),
    (
        "gestao_plano_municipal_saneamento",
        "Existência de Plano Municipal de Saneamento Básico",
        "Gestão municipal",
        "sim/não",
        "SINISA/SNIS",
        MAIOR_MELHOR,
    ),
    (
        "gestao_conselho_municipal",
        "Existência de conselho municipal",
        "Gestão municipal",
        "sim/não",
        "SINISA/SNIS",
        MAIOR_MELHOR,
    ),
    (
        "gestao_fundo_municipal",
        "Existência de fundo municipal",
        "Gestão municipal",
        "sim/não",
        "SINISA/SNIS",
        MAIOR_MELHOR,
    ),
    (
        "gestao_agencia_reguladora",
        "Existência de agência reguladora",
        "Gestão municipal",
        "sim/não",
        "SINISA/SNIS",
        MAIOR_MELHOR,
    ),
    (
        "gestao_tipo_prestacao_servico",
        "Tipo de prestação do serviço",
        "Gestão municipal",
        "código",
        "SINISA/SNIS",
        NEUTRO,
    ),
]

INDICADORES_LEGADOS_SEM_DADOS = {
    "residuos_coleta_seletiva",
    "residuos_destinacao_final_adequada",
    "drenagem_plano",
    "drenagem_cadastro_tecnico",
    "drenagem_alagamentos",
    "drenagem_areas_risco_mapeadas",
}


def seed_municipios(db: Session) -> int:
    csv_path = DATA_DIR / "examples" / "municipios_ms.csv"
    if not csv_path.exists():
        return 0

    criados = 0
    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            codigo = str(row["codigo_ibge"]).strip()
            exists = db.scalar(select(models.Municipio).where(models.Municipio.codigo_ibge == codigo))
            if exists:
                continue
            db.add(
                models.Municipio(
                    codigo_ibge=codigo,
                    nome=row["nome"].strip(),
                    uf=row.get("uf", "MS").strip().upper(),
                )
            )
            criados += 1
    db.commit()
    return criados


def seed_indicadores(db: Session) -> int:
    criados = 0
    for codigo, nome, tema, unidade, fonte, sentido in INDICADORES_INICIAIS:
        exists = db.scalar(select(models.Indicador).where(models.Indicador.codigo == codigo))
        if exists:
            continue
        db.add(
            models.Indicador(
                codigo=codigo,
                nome=nome,
                tema=tema,
                descricao=f"Indicador inicial para o tema {tema}.",
                unidade=unidade,
                fonte=fonte,
                sentido=sentido,
            )
        )
        criados += 1
    db.commit()
    return criados


def remover_indicadores_legados_sem_dados(db: Session) -> int:
    removidos = 0
    indicadores = db.scalars(
        select(models.Indicador).where(models.Indicador.codigo.in_(INDICADORES_LEGADOS_SEM_DADOS))
    ).all()
    for indicador in indicadores:
        possui_valores = db.scalar(
            select(models.ValorIndicador.id).where(models.ValorIndicador.indicador_id == indicador.id).limit(1)
        )
        if possui_valores is None:
            db.delete(indicador)
            removidos += 1
    db.commit()
    return removidos


def seed_cadastros_institucionais(db: Session) -> tuple[int, int]:
    if not CADASTROS_INSTITUCIONAIS_PATH.exists():
        return 0, 0

    dados = json.loads(CADASTROS_INSTITUCIONAIS_PATH.read_text(encoding="utf-8"))
    municipios = {item.codigo_ibge: item for item in db.scalars(select(models.Municipio)).all()}
    atendimentos_criados = 0
    recursos_criados = 0

    for item in dados["atendimentos"]:
        municipio = municipios.get(item["codigo_ibge"])
        if not municipio:
            continue
        registro = db.scalar(select(models.AtendimentoAgua).where(models.AtendimentoAgua.municipio_id == municipio.id))
        prestador = item["prestador"]
        atendimento = item["atendimento"]
        valores = {
            "prestador_nome": prestador["nome"],
            "sigla": prestador["sigla"],
            "natureza_juridica": prestador["natureza_juridica"],
            "area_atuacao": prestador["area_atuacao"],
            "forma_prestacao": prestador["forma_prestacao"],
            "instrumento_delegacao": prestador["instrumento_delegacao"],
            "fonte": prestador["fonte"],
            "ano_referencia": prestador["ano_referencia"],
            "endereco": atendimento["endereco"],
            "site_url": atendimento["siteUrl"],
            "site_label": atendimento["siteLabel"],
            "maps_url": atendimento["mapsUrl"],
            "fonte_endereco": atendimento["fonteEndereco"],
        }
        if registro:
            for campo, valor in valores.items():
                setattr(registro, campo, valor)
        else:
            db.add(models.AtendimentoAgua(municipio_id=municipio.id, **valores))
            atendimentos_criados += 1

    for item in dados["documentos"]:
        municipio = municipios.get(item["codigo_ibge"])
        if not municipio:
            continue
        registro = db.scalar(
            select(models.RecursoMunicipal).where(
                models.RecursoMunicipal.municipio_id == municipio.id,
                models.RecursoMunicipal.tipo == item["tipo"],
            )
        )
        if registro:
            registro.url = item["url"]
            registro.direto = item["direto"]
        else:
            db.add(
                models.RecursoMunicipal(
                    municipio_id=municipio.id, **{k: v for k, v in item.items() if k != "codigo_ibge"}
                )
            )
            recursos_criados += 1

    db.commit()
    return atendimentos_criados, recursos_criados


def seed_all(db: Session) -> None:
    seed_municipios(db)
    seed_indicadores(db)
    remover_indicadores_legados_sem_dados(db)
    seed_cadastros_institucionais(db)
