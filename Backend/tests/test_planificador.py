import random
from collections import defaultdict
from datetime import date, datetime, timedelta

import pytest

from app.planificador.huecos import calcular_huecos
from app.planificador.planes import armar_planes, slots_pedidos
from app.planificador.reparto import Dia, partir_en_slots

LUNES = date(2026, 11, 9)


def h(dia, hora, minuto=0):
    return datetime(dia.year, dia.month, dia.day, hora, minuto)


def todos_los_bloques(planes):
    return [b for p in planes for b in p["bloques"]]


# ---------- calcular_huecos ----------

def test_dia_sin_eventos_es_un_hueco_de_8_a_22():
    huecos = calcular_huecos([], LUNES, LUNES)
    assert huecos == {LUNES: [(h(LUNES, 8), h(LUNES, 22))]}


def test_evento_en_el_medio_deja_dos_huecos():
    ocupados = [(h(LUNES, 12), h(LUNES, 14))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    assert huecos[LUNES] == [(h(LUNES, 8), h(LUNES, 12)), (h(LUNES, 14), h(LUNES, 22))]


def test_evento_que_tapa_todo_el_dia_no_deja_huecos():
    ocupados = [(h(LUNES, 7), h(LUNES, 23))]
    assert calcular_huecos(ocupados, LUNES, LUNES)[LUNES] == []


def test_ahora_redondea_a_la_media_hora_siguiente():
    huecos = calcular_huecos([], LUNES, LUNES, ahora=h(LUNES, 10, 10))
    assert huecos[LUNES][0][0] == h(LUNES, 10, 30)


def test_huecos_de_menos_de_30_min_se_descartan():
    ocupados = [(h(LUNES, 8, 20), h(LUNES, 22))]
    assert calcular_huecos(ocupados, LUNES, LUNES)[LUNES] == []


def test_un_dia_por_fecha_incluyendo_los_extremos():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=6))
    assert len(huecos) == 7


# ---------- armar_planes: comportamiento general ----------

def test_siempre_devuelve_las_tres_opciones():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=4))
    planes = armar_planes(huecos, 6)
    assert [p["nombre"] for p in planes] == ["Constante", "Intensivo", "Progresivo"]


def test_sin_huecos_los_bloques_vienen_vacios_y_no_esta_completo():
    ocupados = [(h(LUNES, 0), h(LUNES, 23, 59))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    for plan in armar_planes(huecos, 3):
        assert plan["bloques"] == []
        assert plan["completo"] is False
        assert plan["faltan_horas"] == 3


def test_pedir_mas_horas_de_las_que_entran_informa_lo_que_falta():
    huecos = calcular_huecos([], LUNES, LUNES)  # un solo día: máximo 4 h
    for plan in armar_planes(huecos, 10):
        assert plan["completo"] is False
        assert plan["faltan_horas"] > 0
        assert plan["horas_planificadas"] + plan["faltan_horas"] == 10


def test_examen_al_dia_siguiente_rango_de_un_dia_no_rompe():
    huecos = calcular_huecos([], LUNES, LUNES)
    for plan in armar_planes(huecos, 2):
        assert plan["completo"] is True
        assert plan["dias_de_estudio"] == 1


def test_ningun_bloque_cae_sobre_un_evento_ocupado():
    ocupados = [
        (h(LUNES, 9), h(LUNES, 18)),
        (h(LUNES + timedelta(days=1), 9), h(LUNES + timedelta(days=1), 18)),
        (h(LUNES + timedelta(days=1), 19, 10), h(LUNES + timedelta(days=1), 20)),
    ]
    huecos = calcular_huecos(ocupados, LUNES, LUNES + timedelta(days=2))
    for inicio, fin in todos_los_bloques(armar_planes(huecos, 8)):
        for o_ini, o_fin in ocupados:
            assert fin <= o_ini or inicio >= o_fin


def test_si_entra_todo_el_plan_esta_completo():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=4))
    for plan in armar_planes(huecos, 6):
        assert plan["completo"] is True
        assert plan["faltan_horas"] == 0
        assert plan["horas_planificadas"] == 6


# ---------- armar_planes: bloques de 60/90 min (30 min solo si hace falta) ----------

def verificar_invariantes(planes, ocupados, horas):
    pedidas = slots_pedidos(horas) / 2
    for plan in planes:
        por_dia = defaultdict(list)
        for inicio, fin in plan["bloques"]:
            assert fin - inicio in (timedelta(minutes=30), timedelta(minutes=60), timedelta(minutes=90))
            assert inicio.hour >= 8 and (fin.hour, fin.minute) <= (22, 0)
            for o_ini, o_fin in ocupados:
                assert fin <= o_ini or inicio >= o_fin
            por_dia[inicio.date()].append((inicio, fin))

        for bloques in por_dia.values():
            bloques.sort()
            for (_, fin_a), (ini_b, _) in zip(bloques, bloques[1:]):
                assert ini_b - fin_a >= timedelta(minutes=30)
            assert sum((f - i for i, f in bloques), timedelta()) <= timedelta(hours=4)

        estudiadas = sum((f - i for i, f in plan["bloques"]), timedelta()) / timedelta(hours=1)
        assert estudiadas == plan["horas_planificadas"]
        if plan["completo"]:
            assert estudiadas == pedidas
            assert plan["faltan_horas"] == 0
        else:
            assert plan["faltan_horas"] == pedidas - estudiadas > 0


@pytest.mark.parametrize("horas, esperado", [(0.1, 0.5), (0.5, 0.5), (1, 1), (1.2, 1.5), (2.5, 2.5), (2.6, 3)])
def test_horas_se_redondean_a_media_hora_con_minimo_media(horas, esperado):
    assert slots_pedidos(horas) / 2 == esperado


def test_bloques_de_60_o_90_con_pausa_y_maximo_diario():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=4))
    planes = armar_planes(huecos, 12)
    verificar_invariantes(planes, [], 12)
    for plan in planes:
        assert plan["completo"] is True


def test_un_dia_libre_entero_aguanta_4_horas_y_no_mas():
    huecos = calcular_huecos([], LUNES, LUNES)
    for plan in armar_planes(huecos, 5):
        assert plan["horas_planificadas"] == 4
        assert plan["faltan_horas"] == 1


def es_corto(bloque):
    return bloque[1] - bloque[0] == timedelta(minutes=30)


@pytest.mark.parametrize("horas", [x / 2 for x in range(2, 41)])  # de 1 h a 20 h
def test_con_la_agenda_libre_no_hay_bloques_de_30_min(horas):
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=4))
    for plan in armar_planes(huecos, horas):
        assert plan["completo"] is True
        assert not any(es_corto(b) for b in plan["bloques"])


def test_media_hora_pedida_es_un_bloque_de_30_min():
    huecos = calcular_huecos([], LUNES, LUNES)
    for plan in armar_planes(huecos, 0.5):
        assert plan["bloques"] == [(h(LUNES, 8), h(LUNES, 8, 30))]


def test_media_hora_suelta_se_usa_si_no_hay_otra_cosa():
    # entre 10:00 y 10:30 hay un hueco de 30 min: es lo único libre del día
    ocupados = [(h(LUNES, 8), h(LUNES, 10)), (h(LUNES, 10, 30), h(LUNES, 22))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    for plan in armar_planes(huecos, 1):
        assert plan["bloques"] == [(h(LUNES, 10), h(LUNES, 10, 30))]
        assert plan["completo"] is False
        assert plan["faltan_horas"] == 0.5


def test_agenda_apretada_completa_con_baches_de_30_min():
    # libre: 8:00-9:30 y dos baches de 30 min (12:00 y 16:00); se piden 2,5 h
    ocupados = [(h(LUNES, 9, 30), h(LUNES, 12)), (h(LUNES, 12, 30), h(LUNES, 16)),
                (h(LUNES, 16, 30), h(LUNES, 22))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    for plan in armar_planes(huecos, 2.5):
        assert plan["completo"] is True
        assert plan["bloques"] == [(h(LUNES, 8), h(LUNES, 9, 30)), (h(LUNES, 12), h(LUNES, 12, 30)),
                                   (h(LUNES, 16), h(LUNES, 16, 30))]


def test_se_usan_los_menos_bloques_de_30_posibles():
    # día libre y 3,5 h: se arma 90 + 60 + 60 (sin bloques de 30)
    huecos = calcular_huecos([], LUNES, LUNES)
    for plan in armar_planes(huecos, 3.5):
        assert not any(es_corto(b) for b in plan["bloques"])
        assert plan["horas_planificadas"] == 3.5


def test_hueco_de_2_horas_y_media_da_dos_bloques_de_una_hora():
    # 2:30 libres: 60 + pausa 30 + 60
    ocupados = [(h(LUNES, 10, 30), h(LUNES, 22))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    for plan in armar_planes(huecos, 2):
        assert plan["bloques"] == [(h(LUNES, 8), h(LUNES, 9)), (h(LUNES, 9, 30), h(LUNES, 10, 30))]


def test_progresivo_carga_mas_al_final_e_intensivo_al_principio():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=4))
    constante, intensivo, progresivo = armar_planes(huecos, 8)
    primer_dia = lambda plan: min(b[0] for b in plan["bloques"]).date()
    ultimo_dia = lambda plan: max(b[0] for b in plan["bloques"]).date()
    assert primer_dia(intensivo) == LUNES and ultimo_dia(intensivo) == LUNES + timedelta(days=1)
    assert ultimo_dia(progresivo) == LUNES + timedelta(days=4)
    assert constante["dias_de_estudio"] >= 4


def test_invariantes_con_agendas_al_azar():
    rnd = random.Random(1234)
    for _ in range(300):
        dias = rnd.randint(1, 7)
        ocupados = []
        for d in range(dias):
            dia = LUNES + timedelta(days=d)
            for _ in range(rnd.randint(0, 4)):
                inicio = h(dia, 7) + timedelta(minutes=10 * rnd.randint(0, 90))
                ocupados.append((inicio, inicio + timedelta(minutes=10 * rnd.randint(1, 30))))
        horas = rnd.choice([0.5, 1, 1.5, 2, 3, 4.5, 6, 10, 20, 40])
        huecos = calcular_huecos(ocupados, LUNES, LUNES + timedelta(days=dias - 1))
        planes = armar_planes(huecos, horas)
        assert len(planes) == 3
        verificar_invariantes(planes, ocupados, horas)
        # si no entró todo, es porque se usó toda la capacidad de la agenda
        capacidad = sum(Dia(partir_en_slots(t), 8).posibles[-1] for t in huecos.values()) / 2
        for plan in planes:
            if not plan["completo"]:
                assert plan["horas_planificadas"] == capacidad
