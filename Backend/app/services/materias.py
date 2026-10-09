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