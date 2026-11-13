from app.core.supabase_client import supabase
from app.ia.quiz_generator import generar_cuestionario

COLUMNAS = "id, nombre_original, estado, resumen, unidad_id"


class UnidadNoEncontrada(LookupError):
    pass


def _listo(documento: dict) -> bool:
    return documento["estado"] == "ready" and bool(documento["resumen"])


def buscar_documentos_para_cuestionario(usuario_id: int, materia_id: int, documento_ids: list[str] | None,
                                        unidad_ids: list[int] | None = None):
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
            if not _listo(f):
                raise ValueError(f"El documento «{f['nombre_original']}» todavía no está listo")
        return elegidos

    if unidad_ids is not None:
        listos = [f for f in filas if _listo(f) and f["unidad_id"] in unidad_ids]
        if not listos:
            raise ValueError("Las unidades elegidas no tienen documentos listos")
        return listos

    listos = [f for f in filas if _listo(f)]
    if not listos:
        raise ValueError("Esta materia no tiene documentos listos para armar un cuestionario")
    return listos


def nombre_unidad(unidad: dict) -> str:
    return f"U{unidad['numero_unidad']} · {unidad['nombre_tema']}"


def completar_origen(preguntas: list[dict], documentos: list[dict], unidades: list[dict]) -> list[dict]:
    """
    Agrega a cada pregunta de qué documento y de qué unidad sale, a partir de `fuente`
    (el nombre del documento que devuelve Claude). Si `fuente` no vino y se usó un solo
    documento, es ese. Si no se puede saber, quedan en None.
    """
    unidades_por_id = {u["id"]: u for u in unidades}
    por_nombre: dict[str, list[dict]] = {}
    for d in documentos:
        por_nombre.setdefault(d["nombre_original"], []).append(d)

    completas = []
    for p in preguntas:
        if p.get("fuente") is not None:
            candidatos = por_nombre.get(p["fuente"], [])
        else:
            candidatos = documentos if len(documentos) == 1 else []
        # si dos documentos se llaman igual no se sabe cuál es, pero puede que estén en la misma unidad
        documento_id = candidatos[0]["id"] if len(candidatos) == 1 else None
        unidades_candidatas = {d["unidad_id"] for d in candidatos}
        unidad_id = unidades_candidatas.pop() if len(unidades_candidatas) == 1 else None
        unidad = unidades_por_id.get(unidad_id)
        completas.append({
            **p,
            "documento_id": documento_id,
            "unidad_id": unidad["id"] if unidad else None,
            "unidad": nombre_unidad(unidad) if unidad else None,
        })
    return completas


def crear_cuestionario(usuario_id: int, materia: dict, documento_ids: list[str] | None, cantidad: int, dificultad: str,
                       respuestas_multiples: bool = True, unidad_ids: list[int] | None = None):
    unidades = materia.get("unidades") or []
    if unidad_ids is not None:
        validas = {u["id"] for u in unidades}
        if not set(unidad_ids) <= validas:
            raise UnidadNoEncontrada("Unidad no encontrada en esta materia")

    documentos = buscar_documentos_para_cuestionario(usuario_id, materia["id"], documento_ids, unidad_ids)
    if documentos is None:
        return None
    try:
        preguntas = generar_cuestionario(documentos, cantidad, dificultad, respuestas_multiples)
    except Exception as e:
        raise RuntimeError("No se pudo generar el cuestionario, probá de nuevo") from e

    preguntas = completar_origen(preguntas, documentos, unidades)
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
