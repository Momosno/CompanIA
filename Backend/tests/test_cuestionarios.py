"""
Tests del generador de cuestionarios y de la ruta POST /cuestionarios/.
Claude se reemplaza por un modelo falso que devuelve JSON armado a mano; Supabase, por una tabla en memoria.
"""
import json

import pytest

from app.ia import quiz_generator
from app.routers import cuestionarios as rutas
from app.services import cuestionarios as servicio

UNIDADES = [
    {"id": 11, "numero_unidad": 1, "nombre_tema": "Límites"},
    {"id": 12, "numero_unidad": 2, "nombre_tema": "Derivadas"},
    {"id": 13, "numero_unidad": 3, "nombre_tema": "Integrales"},
]
MATERIA = {"id": 5, "nombre": "Análisis I", "unidades": UNIDADES}

ID_LIMITES = "00000000-0000-0000-0000-000000000001"
ID_DERIVADAS = "00000000-0000-0000-0000-000000000002"
ID_PENDIENTE = "00000000-0000-0000-0000-000000000003"
DOCUMENTOS = [
    {"id": ID_LIMITES, "nombre_original": "Limites.pdf", "estado": "ready", "resumen": "Guía de límites", "unidad_id": 11},
    {"id": ID_DERIVADAS, "nombre_original": "Derivadas.pdf", "estado": "ready", "resumen": "Guía de derivadas", "unidad_id": 12},
    {"id": ID_PENDIENTE, "nombre_original": "Integrales.pdf", "estado": "processing", "resumen": None, "unidad_id": 13},
]


# ---------- dobles de prueba ----------

class Respuesta:
    def __init__(self, text):
        self.text = text


class ModeloFalso:
    """Devuelve las respuestas en orden, una por llamada a invoke()."""

    def __init__(self, *respuestas):
        self.respuestas = list(respuestas)
        self.llamadas = 0

    def invoke(self, mensajes):
        self.llamadas += 1
        return Respuesta(self.respuestas.pop(0))


class TablaFalsa:
    def __init__(self, filas):
        self.filas = filas

    def table(self, nombre):
        assert nombre == "documentos"
        return self

    def select(self, *a):
        return self

    def eq(self, *a):
        return self

    def order(self, *a):
        return self

    def execute(self):
        return type("R", (), {"data": self.filas})()


def pregunta(texto="¿Qué es un límite?", dificultad="media", correctas=("A",), incorrectas=("B", "C", "D"),
             fuente="Limites.pdf"):
    return {"dificultad": dificultad, "pregunta": texto, "correctas": list(correctas),
            "incorrectas": list(incorrectas), "explicacion": "Porque sí.", "fuente": fuente}


def como_json(*preguntas):
    return json.dumps({"preguntas": list(preguntas)})


def docs(*nombres):
    return [{"nombre_original": n, "resumen": "material"} for n in nombres]


# ---------- generador (quiz_generator) ----------

def test_descarta_preguntas_con_5_opciones_o_sin_correctas(monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso(como_json(
        pregunta("buena"),
        pregunta("cinco opciones", incorrectas=("B", "C", "D", "E")),
        pregunta("sin correctas", correctas=(), incorrectas=("A", "B", "C", "D")),
    )))
    preguntas = quiz_generator.generar_cuestionario(docs("Limites.pdf"), 1, "media")
    assert [p["pregunta"] for p in preguntas] == ["buena"]
    assert len(preguntas[0]["opciones"]) == 4


def test_json_roto_en_el_primer_intento_y_bueno_en_el_segundo(monkeypatch):
    modelo = ModeloFalso("esto no es JSON {", como_json(pregunta("buena")))
    monkeypatch.setattr(quiz_generator, "model", modelo)
    preguntas = quiz_generator.generar_cuestionario(docs("Limites.pdf"), 1, "media")
    assert modelo.llamadas == 2
    assert [p["pregunta"] for p in preguntas] == ["buena"]


def test_sin_respuestas_multiples_no_quedan_preguntas_multiples(monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso(como_json(
        pregunta("una sola"),
        pregunta("dos correctas", correctas=("A", "B"), incorrectas=("C", "D")),
    )))
    preguntas = quiz_generator.generar_cuestionario(docs("Limites.pdf"), 2, "media", multiples=False)
    assert all(not p["multiple"] and len(p["correctas"]) == 1 for p in preguntas)
    assert "dos correctas" not in [p["pregunta"] for p in preguntas]


def test_las_preguntas_salen_de_facil_a_dificil(monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso(como_json(
        pregunta("d", dificultad="dificil"), pregunta("m", dificultad="media"), pregunta("f", dificultad="facil"),
    )))
    preguntas = quiz_generator.generar_cuestionario(docs("Limites.pdf"), 3, "mixta")
    assert [p["dificultad"] for p in preguntas] == ["facil", "media", "dificil"]


def test_correctas_apuntan_a_las_opciones_correctas(monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso(como_json(
        pregunta(correctas=("A", "B"), incorrectas=("C", "D")))))
    p = quiz_generator.generar_cuestionario(docs("Limites.pdf"), 1, "media")[0]
    assert sorted(p["opciones"][i] for i in p["correctas"]) == ["A", "B"]
    assert p["multiple"] is True


# ---------- origen de cada pregunta ----------

def test_origen_por_fuente():
    p = servicio.completar_origen([{"fuente": "Derivadas.pdf"}], DOCUMENTOS[:2], UNIDADES)[0]
    assert p["documento_id"] == ID_DERIVADAS
    assert p["unidad_id"] == 12
    assert p["unidad"] == "U2 · Derivadas"


def test_origen_con_fuente_desconocida_queda_vacio():
    p = servicio.completar_origen([{"fuente": None}], DOCUMENTOS[:2], UNIDADES)[0]
    assert (p["documento_id"], p["unidad_id"], p["unidad"]) == (None, None, None)


def test_origen_sin_fuente_y_un_solo_documento_usa_ese():
    p = servicio.completar_origen([{"fuente": None}], DOCUMENTOS[:1], UNIDADES)[0]
    assert p["documento_id"] == ID_LIMITES
    assert p["unidad"] == "U1 · Límites"


def test_origen_de_documento_sin_unidad():
    sin_unidad = [{**DOCUMENTOS[0], "unidad_id": None}]
    p = servicio.completar_origen([{"fuente": "Limites.pdf"}], sin_unidad, UNIDADES)[0]
    assert p["documento_id"] == ID_LIMITES
    assert p["unidad_id"] is None and p["unidad"] is None


def test_origen_con_dos_documentos_del_mismo_nombre_en_la_misma_unidad():
    repetidos = [DOCUMENTOS[0], {**DOCUMENTOS[0], "id": "otro"}]
    p = servicio.completar_origen([{"fuente": "Limites.pdf"}], repetidos, UNIDADES)[0]
    assert p["documento_id"] is None      # no se sabe cuál de los dos
    assert p["unidad"] == "U1 · Límites"  # pero sí de qué unidad


# ---------- ruta POST /cuestionarios/ ----------

URL = "/usuarios/1/cuestionarios/"


@pytest.fixture
def base_falsa(monkeypatch):
    monkeypatch.setattr(rutas, "buscar_materia", lambda uid, mid: MATERIA if mid == MATERIA["id"] else None)
    monkeypatch.setattr(servicio, "supabase", TablaFalsa(DOCUMENTOS))


def test_unidades_y_documentos_juntos_da_422(client, base_falsa):
    r = client.post(URL, json={"materia_id": 5, "cantidad": 5, "unidad_ids": [11], "documento_ids": [ID_LIMITES]})
    assert r.status_code == 422


def test_unidad_de_otra_materia_da_404(client, base_falsa):
    r = client.post(URL, json={"materia_id": 5, "cantidad": 5, "unidad_ids": [11, 99]})
    assert r.status_code == 404
    assert r.json()["detail"] == "Unidad no encontrada en esta materia"


def test_unidades_sin_documentos_listos_da_409(client, base_falsa):
    r = client.post(URL, json={"materia_id": 5, "cantidad": 5, "unidad_ids": [13]})
    assert r.status_code == 409
    assert r.json()["detail"] == "Las unidades elegidas no tienen documentos listos"


def test_por_unidades_usa_solo_sus_documentos_y_devuelve_el_origen(client, base_falsa, monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso(como_json(
        pregunta("p1", fuente="Limites.pdf"), pregunta("p2", fuente="Derivadas.pdf"))))
    r = client.post(URL, json={"materia_id": 5, "cantidad": 2, "unidad_ids": [11, 12, 13]})
    assert r.status_code == 200
    cuerpo = r.json()
    assert {d["id"] for d in cuerpo["documentos"]} == {ID_LIMITES, ID_DERIVADAS}  # el que no está listo, no
    assert [(p["pregunta"], p["unidad"], p["documento_id"]) for p in cuerpo["preguntas"]] == [
        ("p1", "U1 · Límites", ID_LIMITES),
        ("p2", "U2 · Derivadas", ID_DERIVADAS),
    ]


def test_si_claude_falla_da_502(client, base_falsa, monkeypatch):
    monkeypatch.setattr(quiz_generator, "model", ModeloFalso("roto", "roto"))
    r = client.post(URL, json={"materia_id": 5, "cantidad": 2, "unidad_ids": [11]})
    assert r.status_code == 502
