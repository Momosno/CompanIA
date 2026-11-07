from datetime import date, datetime, time, timedelta

from app.planificador.disponibilidad import expandir_disponibilidad
from app.planificador.huecos import calcular_huecos
from app.planificador.planes import armar_planes

VIERNES = date(2026, 11, 13)


def compromiso(titulo, dia_semana, desde, hasta):
    return {"titulo": titulo, "dia_semana": dia_semana, "hora_inicio": desde, "hora_fin": hasta}


TRABAJO = [compromiso("Trabajo", d, time(9), time(18)) for d in range(5)]  # lun a vie


def test_rango_que_cruza_un_fin_de_semana():
    # viernes a martes: trabaja viernes, lunes y martes (sábado y domingo no)
    ocupados = expandir_disponibilidad(TRABAJO, VIERNES, VIERNES + timedelta(days=4))
    assert [o[0].date() for o in ocupados] == [
        date(2026, 11, 13), date(2026, 11, 16), date(2026, 11, 17),
    ]
    assert ocupados[0] == (datetime(2026, 11, 13, 9), datetime(2026, 11, 13, 18), "Trabajo")


def test_dia_sin_compromisos_no_agrega_nada():
    sabado = VIERNES + timedelta(days=1)
    assert expandir_disponibilidad(TRABAJO, sabado, sabado) == []


def test_sin_filas_no_hay_ocupados():
    assert expandir_disponibilidad([], VIERNES, VIERNES + timedelta(days=30)) == []


def test_varios_compromisos_el_mismo_dia_salen_ordenados():
    filas = [compromiso("Cursada", 4, time(18), time(22)), compromiso("Trabajo", 4, time(9), time(13, 30))]
    ocupados = expandir_disponibilidad(filas, VIERNES, VIERNES)
    assert [o[2] for o in ocupados] == ["Trabajo", "Cursada"]
    assert ocupados[0][1] == datetime(2026, 11, 13, 13, 30)


def test_los_planes_no_caen_en_la_disponibilidad():
    lunes = date(2026, 11, 16)
    ocupados = [(a, b) for a, b, _ in expandir_disponibilidad(TRABAJO, lunes, lunes + timedelta(days=6))]
    huecos = calcular_huecos(ocupados, lunes, lunes + timedelta(days=6))
    for plan in armar_planes(huecos, 12):
        assert plan["completo"] is True
        for inicio, fin in plan["bloques"]:
            if inicio.weekday() < 5:
                assert fin <= inicio.replace(hour=9) or inicio >= inicio.replace(hour=18)
