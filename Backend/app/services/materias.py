from app.core.supabase_client import supabase
from postgrest.exceptions import APIError

def crear_materia(usuario_id: int, nombre: str, cuatrimestre: str, unidades: list[dict]):
    try:
        # paso 1: crear la materia
        response = supabase.table("materias").insert({
            "usuario_id": usuario_id,
            "nombre": nombre,
            "cuatrimestre": cuatrimestre,
        }).execute()
    except APIError as e:
        if e.code == "23505":  # código de Postgres para "violación de restricción única"
            raise ValueError("Ya existe una materia con ese nombre en ese cuatrimestre.")
        raise  # cualquier otro error, lo dejamos pasar tal cual

    materia = response.data[0]

    # paso 2: crear las unidades, asociadas al id de la materia recién creada
    unidades_a_insertar = [
        {**u, "materia_id": materia["id"]} for u in unidades
    ]
    unidades_creadas = supabase.table("unidades").insert(unidades_a_insertar).execute()

    materia["unidades"] = unidades_creadas.data
    return materia

def listar_materias(usuario_id: int):
    response = (
        supabase.table("materias")
        .select("*, unidades(*)")
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data

def editar_materia(usuario_id: int, materia_id: int, nombre: str):
    try:
        response = (
            supabase.table("materias")
            .update({"nombre": nombre})
            .eq("id", materia_id)
            .eq("usuario_id", usuario_id)
            .execute()
        )
    except APIError as e:
        if e.code == "23505":
            raise ValueError("Ya existe una materia con ese nombre en ese cuatrimestre.")
        raise

    if not response.data:
        return None  # no existe, o no pertenece a este usuario

    return response.data[0]

def agregar_unidad(usuario_id: int, materia_id: int, numero_unidad: int, nombre_tema: str):
    materia = (
        supabase.table("materias")
        .select("id")
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not materia.data:
        return None  # la materia no existe o no es de este usuario

    response = supabase.table("unidades").insert({
        "materia_id": materia_id,
        "numero_unidad": numero_unidad,
        "nombre_tema": nombre_tema,
    }).execute()
    return response.data[0]

def editar_unidad(usuario_id: int, materia_id: int, unidad_id: int, datos: dict):
    materia = (
        supabase.table("materias")
        .select("id")
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not materia.data:
        return None  # la materia no existe o no es de este usuario

    response = (
        supabase.table("unidades")
        .update(datos)
        .eq("id", unidad_id)
        .eq("materia_id", materia_id)
        .execute()
    )
    if not response.data:
        return None  # la unidad no existe, o no pertenece a esa materia

    return response.data[0]

def eliminar_unidad(usuario_id: int, materia_id: int, unidad_id: int):
    materia = (
        supabase.table("materias")
        .select("id")
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not materia.data:
        return False  # la materia no existe o no es de este usuario

    # TODO (US02): bloquear el borrado si la unidad tiene documentos asociados. La tabla documentos aun no existe
    response = (
        supabase.table("unidades")
        .delete()
        .eq("id", unidad_id)
        .eq("materia_id", materia_id)
        .execute()
    )
    return len(response.data) > 0

def eliminar_materia(usuario_id: int, materia_id: int):
    response = (
        supabase.table("materias")
        .delete()
        .eq("id", materia_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return len(response.data) > 0