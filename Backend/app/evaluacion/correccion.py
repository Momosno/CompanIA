"""
Corrección de un cuestionario. Lógica pura: no lee ni guarda nada.

Regla de acierto: el conjunto marcado tiene que ser EXACTAMENTE el de las correctas.
Marcar de menos, de más o no responder cuenta como error (no hay puntaje parcial).
"""

SIN_UNIDAD = "Sin unidad asignada"


def _porcentaje(parte: int, total: int) -> float:
    return round(parte * 100 / total, 1) if total else 0.0


def corregir(preguntas: list[dict], respuestas: list[dict]) -> dict:
    """
    preguntas: como las devuelve POST /cuestionarios/ (numero, correctas, opciones, unidad_id, unidad, ...).
    respuestas: [{numero, marcadas: [posiciones]}]. Las preguntas sin respuesta cuentan como error.
    """
    marcadas_por_numero = {r["numero"]: sorted(set(r["marcadas"])) for r in respuestas}

    detalle = []
    por_unidad: dict[int | None, dict] = {}
    for p in sorted(preguntas, key=lambda p: p["numero"]):
        marcadas = marcadas_por_numero.get(p["numero"], [])
        correctas = sorted(p["correctas"])
        acertada = marcadas == correctas
        detalle.append({
            "numero": p["numero"],
            "pregunta": p.get("pregunta"),
            "opciones": p.get("opciones", []),
            "acertada": acertada,
            "respondida": bool(marcadas),
            "marcadas": marcadas,
            "correctas": correctas,
            "respuestas_correctas": p.get("respuestas_correctas", []),
            "explicacion": p.get("explicacion", ""),
            "fuente": p.get("fuente"),
            "documento_id": p.get("documento_id"),
            "unidad_id": p.get("unidad_id"),
            "unidad": p.get("unidad"),
        })

        unidad_id = p.get("unidad_id")
        grupo = por_unidad.setdefault(unidad_id, {
            "unidad_id": unidad_id,
            "unidad": p.get("unidad") if unidad_id is not None else SIN_UNIDAD,
            "errores": 0,
            "total": 0,
            "preguntas": [],
        })
        grupo["total"] += 1
        if not acertada:
            grupo["errores"] += 1
            grupo["preguntas"].append(p["numero"])

    # puntos débiles: unidades con al menos un error, de la peor a la mejor (% de error y, si empatan, más errores)
    debiles = [g for g in por_unidad.values() if g["errores"] > 0]
    debiles.sort(key=lambda g: (-g["errores"] / g["total"], -g["errores"]))
    for g in debiles:
        g["porcentaje_error"] = _porcentaje(g["errores"], g["total"])

    aciertos = sum(d["acertada"] for d in detalle)
    total = len(detalle)
    return {
        "aciertos": aciertos,
        "total": total,
        "porcentaje": _porcentaje(aciertos, total),
        "detalle": detalle,
        "puntos_debiles": debiles,
    }
