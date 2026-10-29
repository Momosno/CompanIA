from app.core.supabase_client import supabase, FakeSupabaseClient
from postgrest.exceptions import APIError
from datetime import datetime

# Base de datos en memoria para cuando no se conecta a Supabase remoto
_mock_db = {
    "usuarios": [
        {"id": 1, "nombre": "Jimmy", "created_at": datetime.now().isoformat()},
        {"id": 2, "nombre": "Camila", "created_at": datetime.now().isoformat()},
    ],
    "materias": [
        {
            "id": 1,
            "usuario_id": 1,
            "nombre": "Análisis Matemático I",
            "cuatrimestre": "1C 2026",
            "unidades": [
                {"id": 101, "materia_id": 1, "numero_unidad": 1, "nombre_tema": "Números reales y funciones"},
                {"id": 102, "materia_id": 1, "numero_unidad": 2, "nombre_tema": "Límites y continuidad"},
                {"id": 103, "materia_id": 1, "numero_unidad": 3, "nombre_tema": "Derivadas y aplicaciones"}
            ]
        },
        {
            "id": 2,
            "usuario_id": 1,
            "nombre": "Física I",
            "cuatrimestre": "1C 2026",
            "unidades": [
                {"id": 201, "materia_id": 2, "numero_unidad": 1, "nombre_tema": "Cinemática"},
                {"id": 202, "materia_id": 2, "numero_unidad": 2, "nombre_tema": "Dinámica y Leyes de Newton"}
            ]
        }
    ]
}

def _is_mock():
    return isinstance(supabase, FakeSupabaseClient)

def crear_materia(usuario_id: int, nombre: str, cuatrimestre: str, unidades: list[dict]):
    if _is_mock():
        nueva_id = len(_mock_db["materias"]) + 1
        nuevas_unidades = []
        for i, u in enumerate(unidades, start=1):
            nuevas_unidades.append({
                "id": nueva_id * 100 + i,
                "materia_id": nueva_id,
                "numero_unidad": u.get("numero_unidad", i),
                "nombre_tema": u.get("nombre_tema", "")
            })
        nueva_mat = {
            "id": nueva_id,
            "usuario_id": usuario_id,
            "nombre": nombre,
            "cuatrimestre": cuatrimestre,
            "unidades": nuevas_unidades
        }
        _mock_db["materias"].append(nueva_mat)
        return nueva_mat

    try:
        response = supabase.table("materias").insert({
            "usuario_id": usuario_id,
            "nombre": nombre,
            "cuatrimestre": cuatrimestre,
        }).execute()
    except APIError as e:
        if e.code == "23505":
            raise ValueError("Ya existe una materia con ese nombre en ese cuatrimestre.")
        raise

    materia = response.data[0]
    unidades_a_insertar = [{**u, "materia_id": materia["id"]} for u in unidades]
    unidades_creadas = supabase.table("unidades").insert(unidades_a_insertar).execute()
    materia["unidades"] = unidades_creadas.data
    return materia

def listar_materias(usuario_id: int):
    if _is_mock():
        return [m for m in _mock_db["materias"] if m["usuario_id"] == usuario_id]

    response = (
        supabase.table("materias")
        .select("*, unidades(*)")
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data

def buscar_materia(usuario_id: int, materia_id: int):
    if _is_mock():
        for m in _mock_db["materias"]:
            if m["id"] == materia_id and m["usuario_id"] == usuario_id:
                return m
        return None

    response = (
        supabase.table("materias")
        .select("*, unidades(*)")
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data[0] if response.data else None

def buscar_unidad(usuario_id: int, materia_id: int, unidad_id: int):
    materia = buscar_materia(usuario_id, materia_id)
    if not materia:
        return None
    for u in materia.get("unidades", []):
        if u["id"] == unidad_id:
            return u
    return None

def editar_materia(usuario_id: int, materia_id: int, nuevo_nombre: str):
    if _is_mock():
        m = buscar_materia(usuario_id, materia_id)
        if m:
            m["nombre"] = nuevo_nombre
            return m
        return None

    response = (
        supabase.table("materias")
        .update({"nombre": nuevo_nombre})
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data[0] if response.data else None

def agregar_unidad(usuario_id: int, materia_id: int, numero_unidad: int, nombre_tema: str):
    m = buscar_materia(usuario_id, materia_id)
    if not m:
        return None
    if _is_mock():
        u = {
            "id": len(m.get("unidades", [])) + (materia_id * 100) + 1,
            "materia_id": materia_id,
            "numero_unidad": numero_unidad,
            "nombre_tema": nombre_tema
        }
        m.setdefault("unidades", []).append(u)
        return u

    response = supabase.table("unidades").insert({
        "materia_id": materia_id,
        "numero_unidad": numero_unidad,
        "nombre_tema": nombre_tema,
    }).execute()
    return response.data[0]

def editar_unidad(usuario_id: int, materia_id: int, unidad_id: int, datos: dict):
    m = buscar_materia(usuario_id, materia_id)
    if not m:
        return None
    if _is_mock():
        for u in m.get("unidades", []):
            if u["id"] == unidad_id:
                u.update(datos)
                return u
        return None

    response = (
        supabase.table("unidades")
        .update(datos)
        .eq("id", unidad_id)
        .execute()
    )
    return response.data[0] if response.data else None

def eliminar_unidad(usuario_id: int, materia_id: int, unidad_id: int):
    m = buscar_materia(usuario_id, materia_id)
    if not m:
        return False
    if _is_mock():
        prev_len = len(m.get("unidades", []))
        m["unidades"] = [u for u in m.get("unidades", []) if u["id"] != unidad_id]
        return len(m["unidades"]) < prev_len

    response = supabase.table("unidades").delete().eq("id", unidad_id).execute()
    return len(response.data) > 0

def eliminar_materia(usuario_id: int, materia_id: int):
    if _is_mock():
        prev = len(_mock_db["materias"])
        _mock_db["materias"] = [m for m in _mock_db["materias"] if not (m["id"] == materia_id and m["usuario_id"] == usuario_id)]
        return len(_mock_db["materias"]) < prev

    response = (
        supabase.table("materias")
        .delete()
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return len(response.data) > 0
