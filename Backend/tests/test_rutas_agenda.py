"""
Tests de las rutas de la agenda: códigos de respuesta y validaciones.
No tocan la base: se reemplazan las funciones de `services/` que leen o escriben en Supabase.
El planificador (huecos, armado de planes, reprogramación) corre de verdad.
"""
from datetime import date, datetime, timedelta

import pytest

from app.routers import agenda as rutas
from app.services import agenda as servicio

USUARIO = 1
BASE = f"/usuarios/{USUARIO}/agenda"
AHORA = datetime(2026, 11, 12, 10, 0)   # jueves
HOY = AHORA.date()

UNIDADES = [
    {"id": 11, "numero_unidad": 1, "nombre_tema": "Límites"},
    {"id": 12, "numero_unidad": 2, "nombre_tema": "Derivadas"},
    {"id": 13, "numero_unidad": 3, "nombre_tema": "Integrales"},
]
MATERIA = {"id": 5, "nombre": "Análisis I", "unidades": UNIDADES}


def _no_llamar(*args, **kwargs):
    raise AssertionError("no se tendría que haber llamado")


@pytest.fixture(autouse=True)
def base_falsa(monkeypatch):
    """Usuario y materia existentes, hora fija y sin nada ocupado en la agenda."""
    monkeypatch.setattr(rutas, "buscar_usuario", lambda uid: {"id": uid} if uid == USUARIO else None)
    monkeypatch.setattr(rutas, "buscar_materia", lambda uid, mid: MATERIA if mid == MATERIA["id"] else None)
    monkeypatch.setattr(rutas, "buscar_unidad",
                        lambda uid, mid, unid: next((u for u in UNIDADES if u["id"] == unid), None))
    monkeypatch.setattr(rutas, "ahora_local", lambda: AHORA)
    monkeypatch.setattr(servicio, "ahora_local", lambda: AHORA)
    monkeypatch.setattr(rutas, "obtener_preferencias", lambda uid: {"hora_inicio": 8, "hora_fin": 22})
    monkeypatch.setattr(servicio, "_ocupados_para_planificar", lambda *a, **k: [])


def _evento(**cambios):
    evento = {
        "id": 100, "titulo": "Estudio Análisis I", "tipo": "estudio",
        "inicio": datetime(2026, 11, 13, 18, 0), "fin": datetime(2026, 11, 13, 19, 30),
        "materia_id": MATERIA["id"], "unidad_id": None, "meta_id": None, "completado": False,
    }
    return {**evento, **cambios}


def _meta(fecha, unidades=UNIDADES[:1]):
    return {"id": 7, "materia_id": MATERIA["id"], "materia": MATERIA["nombre"], "fecha": fecha,
            "hora": None, "unidades": unidades, "bloques_total": 0, "bloques_completados": 0}


# ---------- POST /eventos ----------

def test_evento_con_fin_antes_de_inicio_da_422(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_evento", _no_llamar)
    r = client.post(f"{BASE}/eventos", json={
        "titulo": "Turno médico", "inicio": "2026-11-13T10:00:00", "fin": "2026-11-13T10:00:00"})
    assert r.status_code == 422


def test_evento_bien_formado_da_201(client, monkeypatch):
    def crear(uid, titulo, inicio, fin, materia_id, unidad_id):
        return _evento(id=1, titulo=titulo, tipo="ocupado", inicio=inicio, fin=fin,
                       materia_id=materia_id, unidad_id=unidad_id)
    monkeypatch.setattr(rutas, "crear_evento", crear)
    r = client.post(f"{BASE}/eventos", json={
        "titulo": "Turno médico", "inicio": "2026-11-13T10:00:00", "fin": "2026-11-13T11:00:00"})
    assert r.status_code == 201
    assert r.json()["titulo"] == "Turno médico"
    assert r.json()["tipo"] == "ocupado"


def test_evento_con_unidad_sin_materia_da_422(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_evento", _no_llamar)
    r = client.post(f"{BASE}/eventos", json={
        "titulo": "Clase", "inicio": "2026-11-13T10:00:00", "fin": "2026-11-13T11:00:00", "unidad_id": 11})
    assert r.status_code == 422


def test_evento_de_usuario_inexistente_da_404(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_evento", _no_llamar)
    r = client.post("/usuarios/999/agenda/eventos", json={
        "titulo": "Clase", "inicio": "2026-11-13T10:00:00", "fin": "2026-11-13T11:00:00"})
    assert r.status_code == 404


# ---------- PATCH /eventos/{id} ----------

def test_completar_evento_ocupado_da_400(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: _evento(tipo="ocupado"))
    monkeypatch.setattr(rutas, "marcar_completado", _no_llamar)
    r = client.patch(f"{BASE}/eventos/100", json={"completado": True})
    assert r.status_code == 400


def test_completar_evento_inexistente_da_404(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: None)
    r = client.patch(f"{BASE}/eventos/100", json={"completado": True})
    assert r.status_code == 404


def test_completar_bloque_de_estudio_da_200(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: _evento())
    monkeypatch.setattr(rutas, "marcar_completado", lambda uid, eid, c: _evento(completado=c))
    r = client.patch(f"{BASE}/eventos/100", json={"completado": True})
    assert r.status_code == 200
    assert r.json()["completado"] is True


# ---------- POST /eventos/{id}/reprogramar ----------

def test_reprogramar_sin_hueco_da_409_en_espanol(client, monkeypatch):
    examen = HOY + timedelta(days=3)
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: _evento(meta_id=7))
    monkeypatch.setattr(rutas, "buscar_meta", lambda uid, mid: _meta(examen))
    # todo el rango está ocupado: no hay dónde moverlo
    lleno = [(datetime.combine(HOY, datetime.min.time()), datetime.combine(examen, datetime.min.time()))]
    monkeypatch.setattr(servicio, "_ocupados_para_planificar", lambda *a, **k: lleno)
    monkeypatch.setattr(servicio, "_actualizar_evento", _no_llamar)
    r = client.post(f"{BASE}/eventos/100/reprogramar")
    assert r.status_code == 409
    assert r.json()["detail"] == "No hay un hueco libre de 90 min antes del examen"


def test_reprogramar_con_hueco_lo_mueve(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: _evento())
    monkeypatch.setattr(servicio, "_actualizar_evento",
                        lambda uid, eid, cambios: _evento(**{k: servicio.de_base(v) for k, v in cambios.items()}))
    r = client.post(f"{BASE}/eventos/100/reprogramar")
    assert r.status_code == 200
    inicio = datetime.fromisoformat(r.json()["inicio"])
    fin = datetime.fromisoformat(r.json()["fin"])
    assert fin - inicio == timedelta(minutes=90)
    assert inicio.date() >= HOY + timedelta(days=1)   # por defecto busca desde mañana


def test_reprogramar_bloque_completado_da_400(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_evento", lambda uid, eid: _evento(completado=True))
    r = client.post(f"{BASE}/eventos/100/reprogramar")
    assert r.status_code == 400


# ---------- POST /disponibilidad ----------

@pytest.mark.parametrize("cuerpo", [
    {"titulo": "Trabajo", "dias": [0, 7], "hora_inicio": "09:00", "hora_fin": "18:00"},
    {"titulo": "Trabajo", "dias": [-1], "hora_inicio": "09:00", "hora_fin": "18:00"},
    {"titulo": "Trabajo", "dias": [0, 0], "hora_inicio": "09:00", "hora_fin": "18:00"},
    {"titulo": "Trabajo", "dias": [0], "hora_inicio": "18:00", "hora_fin": "18:00"},
    {"titulo": "Trabajo", "dias": [0], "hora_inicio": "18:00", "hora_fin": "09:00"},
])
def test_disponibilidad_invalida_da_422(client, monkeypatch, cuerpo):
    monkeypatch.setattr(rutas, "crear_disponibilidad", _no_llamar)
    assert client.post(f"{BASE}/disponibilidad", json=cuerpo).status_code == 422


def test_disponibilidad_valida_da_201_una_fila_por_dia(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_disponibilidad", lambda uid, titulo, dias, hi, hf: [
        {"id": i, "titulo": titulo, "dia_semana": d, "hora_inicio": hi, "hora_fin": hf}
        for i, d in enumerate(dias)])
    r = client.post(f"{BASE}/disponibilidad", json={
        "titulo": "Trabajo", "dias": [0, 1, 2, 3, 4], "hora_inicio": "09:00", "hora_fin": "18:00"})
    assert r.status_code == 201
    assert [f["dia_semana"] for f in r.json()] == [0, 1, 2, 3, 4]


# ---------- POST /metas ----------

def _cuerpo_meta(**cambios):
    return {"materia_id": MATERIA["id"], "fecha": str(HOY + timedelta(days=5)), "unidad_ids": [11, 13], **cambios}


def test_meta_con_fecha_pasada_da_400(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_meta", _no_llamar)
    r = client.post(f"{BASE}/metas", json=_cuerpo_meta(fecha=str(HOY - timedelta(days=1))))
    assert r.status_code == 400


def test_meta_con_unidades_de_otra_materia_da_422(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_meta", _no_llamar)
    r = client.post(f"{BASE}/metas", json=_cuerpo_meta(unidad_ids=[11, 99]))
    assert r.status_code == 422


def test_meta_de_materia_inexistente_da_404(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_meta", _no_llamar)
    r = client.post(f"{BASE}/metas", json=_cuerpo_meta(materia_id=999))
    assert r.status_code == 404


def test_meta_valida_da_201(client, monkeypatch):
    monkeypatch.setattr(rutas, "crear_meta", lambda uid, mid, fecha, hora, unidad_ids: _meta(
        fecha, [u for u in UNIDADES if u["id"] in unidad_ids]))
    r = client.post(f"{BASE}/metas", json=_cuerpo_meta())
    assert r.status_code == 201
    assert [u["id"] for u in r.json()["unidades"]] == [11, 13]


# ---------- DELETE /metas/{id} ----------

def test_borrar_meta_da_204(client, monkeypatch):
    monkeypatch.setattr(rutas, "eliminar_meta", lambda uid, mid: True)
    r = client.delete(f"{BASE}/metas/7")
    assert r.status_code == 204
    assert r.content == b""


def test_borrar_meta_inexistente_da_404(client, monkeypatch):
    monkeypatch.setattr(rutas, "eliminar_meta", lambda uid, mid: False)
    assert client.delete(f"{BASE}/metas/7").status_code == 404


# ---------- POST /planes ----------

def test_planes_con_meta_usa_el_rango_de_la_meta_y_da_3_opciones(client, monkeypatch):
    examen = HOY + timedelta(days=5)
    monkeypatch.setattr(rutas, "buscar_meta", lambda uid, mid: _meta(examen))
    r = client.post(f"{BASE}/planes", json={"meta_id": 7, "horas": 6})
    assert r.status_code == 200
    plan = r.json()
    assert plan["desde"] == str(HOY)
    assert plan["hasta"] == str(examen - timedelta(days=1))
    assert plan["meta_id"] == 7
    assert len(plan["opciones"]) == 3
    for opcion in plan["opciones"]:
        for bloque in opcion["bloques"]:
            assert datetime.fromisoformat(bloque["fin"]).date() < examen


def test_planes_sin_meta_da_3_opciones(client):
    r = client.post(f"{BASE}/planes", json={
        "materia_id": MATERIA["id"], "horas": 4, "desde": str(HOY), "hasta": str(HOY + timedelta(days=3))})
    assert r.status_code == 200
    assert len(r.json()["opciones"]) == 3


def test_plan_imposible_avisa_faltan_horas_sin_romper(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_meta", lambda uid, mid: _meta(HOY + timedelta(days=2)))
    r = client.post(f"{BASE}/planes", json={"meta_id": 7, "horas": 40})
    assert r.status_code == 200
    opciones = r.json()["opciones"]
    assert len(opciones) == 3
    assert all(not o["completo"] and o["faltan_horas"] > 0 for o in opciones)


def test_planes_con_meta_y_materia_da_422(client):
    r = client.post(f"{BASE}/planes", json={"meta_id": 7, "materia_id": MATERIA["id"], "horas": 6})
    assert r.status_code == 422


def test_planes_con_meta_inexistente_da_404(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_meta", lambda uid, mid: None)
    assert client.post(f"{BASE}/planes", json={"meta_id": 7, "horas": 6}).status_code == 404


def test_planes_para_examen_de_hoy_da_400(client, monkeypatch):
    monkeypatch.setattr(rutas, "buscar_meta", lambda uid, mid: _meta(HOY))
    assert client.post(f"{BASE}/planes", json={"meta_id": 7, "horas": 6}).status_code == 400
