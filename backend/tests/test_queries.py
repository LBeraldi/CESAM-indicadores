from sqlalchemy import event

from app.api.routes_indicadores import INDICADORES_RANKING_SANEAMENTO
from app.crud import get_ranking_saneamento
from sqlalchemy.orm import Session

from app.database import engine


def test_ranking_consolidado_usa_uma_consulta(db_session: Session) -> None:
    statements: list[str] = []

    def registrar(_conn, _cursor, statement, _parameters, _context, _executemany) -> None:
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", registrar)
    try:
        resultado = get_ranking_saneamento(db_session, INDICADORES_RANKING_SANEAMENTO, 2023)
        assert isinstance(resultado, list)
    finally:
        event.remove(engine, "before_cursor_execute", registrar)

    selects = [statement for statement in statements if statement.lstrip().upper().startswith("SELECT")]
    assert len(selects) == 1
