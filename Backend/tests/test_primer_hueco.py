from datetime import date, datetime, timedelta

from app.planificador.huecos import calcular_huecos, con_pausa, primer_hueco

LUNES = date(2026, 11, 9)
UNA_HORA = timedelta(hours=1)


def h(dia, hora, minuto=0):
    return datetime(dia.year, dia.month, dia.day, hora, minuto)


def test_agenda_libre_devuelve_el_principio_del_primer_dia():
    huecos = calcular_huecos([], LUNES, LUNES + timedelta(days=2))
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 8), h(LUNES, 9))


def test_saltea_los_huecos_donde_no_entra():
    # libre 8:00-8:30 (no entra 1 h) y después desde las 10
    ocupados = [(h(LUNES, 8, 30), h(LUNES, 10))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 10), h(LUNES, 11))


def test_pasa_al_dia_siguiente_si_hoy_no_entra():
    martes = LUNES + timedelta(days=1)
    ocupados = [(h(LUNES, 8), h(LUNES, 21, 30))]
    huecos = calcular_huecos(ocupados, LUNES, martes)
    assert primer_hueco(huecos, timedelta(minutes=90)) == (h(martes, 8), h(martes, 9, 30))


def test_sin_lugar_devuelve_none():
    ocupados = [(h(LUNES, 8), h(LUNES, 21, 30))]
    huecos = calcular_huecos(ocupados, LUNES, LUNES)
    assert primer_hueco(huecos, UNA_HORA) is None
    assert primer_hueco({}, UNA_HORA) is None


def test_respeta_el_ahora():
    huecos = calcular_huecos([], LUNES, LUNES, ahora=h(LUNES, 15, 10))
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 15, 30), h(LUNES, 16, 30))


# ---------- pausa con otros bloques de estudio ----------

PAUSA = timedelta(minutes=30)


def test_con_pausa_agranda_para_los_dos_lados():
    assert con_pausa([(h(LUNES, 10), h(LUNES, 11))], PAUSA) == [(h(LUNES, 9, 30), h(LUNES, 11, 30))]


def test_reprogramado_no_queda_pegado_a_otro_bloque_de_estudio():
    # estudio 8:00-9:00 ya agendado: lo nuevo arranca recién a las 9:30
    estudio = [(h(LUNES, 8), h(LUNES, 9))]
    huecos = calcular_huecos(con_pausa(estudio, PAUSA), LUNES, LUNES)
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 9, 30), h(LUNES, 10, 30))


def test_entre_dos_bloques_de_estudio_tiene_que_entrar_con_pausa_a_los_dos_lados():
    # libre 9:00-11:00 entre dos bloques: con pausas quedan 9:30-10:30, justo 1 h
    estudio = [(h(LUNES, 8), h(LUNES, 9)), (h(LUNES, 11), h(LUNES, 12))]
    huecos = calcular_huecos(con_pausa(estudio, PAUSA), LUNES, LUNES)
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 9, 30), h(LUNES, 10, 30))
    assert primer_hueco(huecos, timedelta(minutes=90)) == (h(LUNES, 12, 30), h(LUNES, 14))


def test_franja_de_la_noche():
    # alguien que estudia de 14 a 24
    huecos = calcular_huecos([], LUNES, LUNES, hora_inicio=14, hora_fin=24)
    assert huecos[LUNES] == [(h(LUNES, 14), h(LUNES, 0) + timedelta(days=1))]
    assert primer_hueco(huecos, UNA_HORA) == (h(LUNES, 14), h(LUNES, 15))
