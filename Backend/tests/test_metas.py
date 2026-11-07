from datetime import date, timedelta

import pytest

from app.planificador.metas import contar_bloques, rango_para_meta, titulo_estudio

HOY = date(2026, 11, 9)
EXAMEN = date(2026, 11, 14)


# ---------- rango_para_meta ----------

def test_por_defecto_va_de_hoy_al_dia_anterior_al_examen():
    assert rango_para_meta(EXAMEN, HOY) == (HOY, date(2026, 11, 13))


def test_examen_manana_deja_solo_hoy():
    assert rango_para_meta(HOY + timedelta(days=1), HOY) == (HOY, HOY)


def test_examen_hoy_no_deja_dias():
    with pytest.raises(ValueError, match="No quedan días"):
        rango_para_meta(HOY, HOY)


def test_se_puede_achicar_el_rango():
    assert rango_para_meta(EXAMEN, HOY, desde=date(2026, 11, 11), hasta=date(2026, 11, 12)) \
        == (date(2026, 11, 11), date(2026, 11, 12))


def test_hasta_no_puede_ser_el_dia_del_examen():
    with pytest.raises(ValueError, match="antes del día del examen"):
        rango_para_meta(EXAMEN, HOY, hasta=EXAMEN)


def test_desde_en_el_pasado_arranca_hoy():
    assert rango_para_meta(EXAMEN, HOY, desde=HOY - timedelta(days=3))[0] == HOY


def test_desde_despues_de_hasta_falla():
    with pytest.raises(ValueError):
        rango_para_meta(EXAMEN, HOY, desde=date(2026, 11, 13), hasta=date(2026, 11, 11))


def test_examen_muy_lejano_pide_achicar_el_rango():
    with pytest.raises(ValueError, match="60 días"):
        rango_para_meta(HOY + timedelta(days=120), HOY)
    desde = HOY + timedelta(days=100)
    assert rango_para_meta(HOY + timedelta(days=120), HOY, desde=desde)[0] == desde


# ---------- titulo_estudio ----------

U1 = {"id": 1, "numero_unidad": 1, "nombre_tema": "Límites"}
U3 = {"id": 3, "numero_unidad": 3, "nombre_tema": "Derivadas"}


def test_titulo_sin_unidades():
    assert titulo_estudio("Análisis I", []) == "Estudiar Análisis I"


def test_titulo_con_una_unidad_usa_el_tema():
    assert titulo_estudio("Análisis I", [U3]) == "Estudiar Análisis I – Derivadas"


def test_titulo_con_varias_unidades_las_ordena():
    assert titulo_estudio("Análisis I", [U3, U1]) == "Estudiar Análisis I – U1, U3"


# ---------- contar_bloques ----------

def test_contar_bloques_por_meta():
    eventos = [
        {"meta_id": 1, "completado": True},
        {"meta_id": 1, "completado": False},
        {"meta_id": 2, "completado": False},
    ]
    assert contar_bloques(eventos) == {1: (2, 1), 2: (1, 0)}


def test_contar_bloques_sin_eventos():
    assert contar_bloques([]) == {}
