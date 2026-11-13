"""Tests de la corrección de cuestionarios: la función pura y la ruta POST /cuestionarios/corregir."""
from app.evaluacion.correccion import SIN_UNIDAD, corregir
from app.routers import cuestionarios as rutas

U1 = {"unidad_id": 11, "unidad": "U1 · Límites"}
U2 = {"unidad_id": 12, "unidad": "U2 · Derivadas"}
SIN = {"unidad_id": None, "unidad": None}


def pregunta(numero, correctas=(0,), unidad=U1):
    opciones = ["A", "B", "C", "D"]
    return {
        "numero": numero, "pregunta": f"Pregunta {numero}", "dificultad": "media", "opciones": opciones,
        "correctas": list(correctas), "respuestas_correctas": [opciones[i] for i in correctas],
        "multiple": len(correctas) > 1, "explicacion": "Porque sí.", "fuente": "Limites.pdf",
        "documento_id": None, **unidad,
    }


def resp(numero, *marcadas):
    return {"numero": numero, "marcadas": list(marcadas)}


# ---------- función pura ----------

def test_todo_bien_da_100_y_sin_puntos_debiles():
    r = corregir([pregunta(1), pregunta(2, (1, 2))], [resp(1, 0), resp(2, 2, 1)])
    assert (r["aciertos"], r["total"], r["porcentaje"]) == (2, 2, 100.0)
    assert r["puntos_debiles"] == []
    assert all(d["acertada"] for d in r["detalle"])


def test_multiple_marcando_una_de_dos_correctas_es_error():
    r = corregir([pregunta(1, (0, 2))], [resp(1, 0)])
    assert r["detalle"][0]["acertada"] is False
    assert r["aciertos"] == 0


def test_multiple_marcando_de_mas_es_error():
    r = corregir([pregunta(1, (0, 2))], [resp(1, 0, 1, 2)])
    assert r["detalle"][0]["acertada"] is False


def test_simple_marcando_de_mas_es_error():
    r = corregir([pregunta(1, (0,))], [resp(1, 0, 1)])
    assert r["detalle"][0]["acertada"] is False


def test_pregunta_sin_responder_es_error():
    r = corregir([pregunta(1), pregunta(2)], [resp(1, 0)])
    sin_responder = r["detalle"][1]
    assert sin_responder["acertada"] is False
    assert sin_responder["respondida"] is False
    assert sin_responder["marcadas"] == []
    assert r["porcentaje"] == 50.0


def test_respuesta_con_marcadas_vacia_cuenta_como_sin_responder():
    r = corregir([pregunta(1)], [resp(1)])
    assert r["detalle"][0]["acertada"] is False
    assert r["detalle"][0]["respondida"] is False


def test_unidad_con_mas_porcentaje_de_error_va_primero():
    preguntas = [pregunta(1, unidad=U1), pregunta(2, unidad=U1), pregunta(3, unidad=U2), pregunta(4, unidad=U2)]
    # U1: 1 de 2 mal (50 %) · U2: 2 de 2 mal (100 %)
    r = corregir(preguntas, [resp(1, 0), resp(2, 1), resp(3, 1), resp(4, 1)])
    assert [(d["unidad"], d["errores"], d["total"], d["porcentaje_error"]) for d in r["puntos_debiles"]] == [
        ("U2 · Derivadas", 2, 2, 100.0),
        ("U1 · Límites", 1, 2, 50.0),
    ]
    assert r["puntos_debiles"][0]["preguntas"] == [3, 4]


def test_si_empatan_en_porcentaje_va_primero_la_de_mas_errores():
    preguntas = [pregunta(1, unidad=U1), pregunta(2, unidad=U2), pregunta(3, unidad=U2)]
    # U1: 1/1 (100 %) · U2: 2/2 (100 %) -> U2 primero por tener más errores
    r = corregir(preguntas, [resp(1, 1), resp(2, 1), resp(3, 1)])
    assert [d["unidad_id"] for d in r["puntos_debiles"]] == [12, 11]


def test_unidad_sin_errores_no_es_punto_debil():
    r = corregir([pregunta(1, unidad=U1), pregunta(2, unidad=U2)], [resp(1, 0), resp(2, 1)])
    assert [d["unidad_id"] for d in r["puntos_debiles"]] == [12]


def test_pregunta_sin_unidad_va_a_sin_unidad_asignada():
    r = corregir([pregunta(1, unidad=SIN)], [resp(1, 3)])
    assert r["puntos_debiles"] == [{
        "unidad_id": None, "unidad": SIN_UNIDAD, "errores": 1, "total": 1,
        "porcentaje_error": 100.0, "preguntas": [1],
    }]


def test_porcentaje_redondeado():
    r = corregir([pregunta(1), pregunta(2), pregunta(3)], [resp(1, 0)])
    assert r["porcentaje"] == 33.3


# ---------- ruta ----------

URL = "/usuarios/1/cuestionarios/corregir"


def _cuerpo(**cambios):
    return {"materia_id": 5, "preguntas": [pregunta(1), pregunta(2, (1, 3), U2)],
            "respuestas": [resp(1, 0), resp(2, 1)], **cambios}


def _con_materia(monkeypatch):
    monkeypatch.setattr(rutas, "buscar_materia", lambda uid, mid: {"id": 5, "nombre": "Análisis I"} if mid == 5 else None)


def test_ruta_corrige_y_devuelve_puntos_debiles(client, monkeypatch):
    _con_materia(monkeypatch)
    r = client.post(URL, json=_cuerpo())
    assert r.status_code == 200
    cuerpo = r.json()
    assert (cuerpo["aciertos"], cuerpo["total"]) == (1, 2)
    assert [d["unidad"] for d in cuerpo["puntos_debiles"]] == ["U2 · Derivadas"]


def test_ruta_corregir_no_se_confunde_con_crear(client, monkeypatch):
    # si /corregir cayera en POST / pediría `cantidad` y daría 422
    _con_materia(monkeypatch)
    assert client.post(URL, json=_cuerpo()).status_code == 200


def test_posicion_fuera_de_rango_da_422(client, monkeypatch):
    _con_materia(monkeypatch)
    assert client.post(URL, json=_cuerpo(respuestas=[resp(1, 4)])).status_code == 422


def test_posiciones_repetidas_da_422(client, monkeypatch):
    _con_materia(monkeypatch)
    assert client.post(URL, json=_cuerpo(respuestas=[resp(1, 0, 0)])).status_code == 422


def test_respuesta_a_pregunta_inexistente_da_422(client, monkeypatch):
    _con_materia(monkeypatch)
    assert client.post(URL, json=_cuerpo(respuestas=[resp(9, 0)])).status_code == 422


def test_materia_inexistente_da_404(client, monkeypatch):
    _con_materia(monkeypatch)
    assert client.post(URL, json=_cuerpo(materia_id=999)).status_code == 404
