from app.services.institucional import obter_cadastro_estatico


def test_catalogo_institucional_inclui_saae_municipal_de_sao_gabriel() -> None:
    atendimento, recursos = obter_cadastro_estatico("5007695")

    assert atendimento is not None
    assert atendimento["sigla"] == "SAAE"
    assert "São Gabriel" in atendimento["site_label"]
    assert atendimento["site_url"].startswith("https://")
    assert isinstance(recursos, list)
