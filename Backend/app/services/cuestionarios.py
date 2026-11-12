from app.core.supabase_client import supabase
from app.ia.quiz_generator import generar_cuestionario

COLUMNAS = "id, nombre_original, estado, resumen"

def buscar_documentos_para_cuestionario(usuario_id: int, materia_id: int, documento_ids: list[str] | None):
    filas = (
        supabase.table("documentos")
        .select(COLUMNAS)
        .eq("usuario_id", usuario_id)
        .eq("materia_id", materia_id)
        .order("created_at")
        .execute()
        .data
    )

    if documento_ids is not None:
        por_id = {f["id"]: f for f in filas}
        if any(i not in por_id for i in documento_ids):
            return None  # alguno no existe, o no es de este usuario / materia
        elegidos = [por_id[i] for i in dict.fromkeys(documento_ids)]  # sin repetidos
        for f in elegidos:
            if f["estado"] != "ready" or not f["resumen"]:
                raise ValueError(f"El documento «{f['nombre_original']}» todavía no está listo")
        return elegidos

    listos = [f for f in filas if f["estado"] == "ready" and f["resumen"]]
    if not listos:
        raise ValueError("Esta materia no tiene documentos listos para armar un cuestionario")
    return listos

def crear_cuestionario(usuario_id: int, materia: dict, documento_ids: list[str] | None, cantidad: int, dificultad: str,
                       respuestas_multiples: bool = True):
    documentos = buscar_documentos_para_cuestionario(usuario_id, materia["id"], documento_ids)
    if documentos is None:
        return None
    try:
        preguntas = generar_cuestionario(documentos, cantidad, dificultad, respuestas_multiples)
    except Exception as e:
        raise RuntimeError("No se pudo generar el cuestionario, probá de nuevo") from e

    return {
        "materia_id": materia["id"],
        "materia": materia["nombre"],
        "documentos": [{"id": d["id"], "nombre": d["nombre_original"]} for d in documentos],
        "dificultad": dificultad,
        "respuestas_multiples": respuestas_multiples,
        "cantidad_solicitada": cantidad,
        "cantidad": len(preguntas),
        "preguntas": [{"numero": i, **p} for i, p in enumerate(preguntas, 1)],
    }
