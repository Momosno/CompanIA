from datetime import timedelta

MAX_DIAS_PLAN = 60


def rango_para_meta(fecha_examen, hoy, desde=None, hasta=None):
    """
    Días en los que se puede estudiar para un examen (ambos incluidos).
    Por defecto: desde hoy hasta el día anterior al examen.
    Tira ValueError con un mensaje para el usuario si el rango no sirve.
    """
    ultimo_posible = fecha_examen - timedelta(days=1)
    desde = desde or hoy
    hasta = hasta or ultimo_posible
    if hasta > ultimo_posible:
        raise ValueError("El plan tiene que terminar antes del día del examen")
    if hasta < hoy:
        raise ValueError("No quedan días para estudiar antes del examen")
    desde = max(desde, hoy)
    if hasta < desde:
        raise ValueError("desde no puede ser posterior a hasta")
    if (hasta - desde).days > MAX_DIAS_PLAN:
        raise ValueError(f"El rango no puede superar los {MAX_DIAS_PLAN} días: elegí un 'desde' más cercano al examen")
    return desde, hasta


def titulo_estudio(materia, unidades):
    """
    Título de los bloques de estudio.
    Sin unidades: "Estudiar Análisis I"; una: "Estudiar Análisis I – Límites";
    varias: "Estudiar Análisis I – U1, U3".
    """
    titulo = f"Estudiar {materia}"
    if len(unidades) == 1:
        titulo += f" – {unidades[0]['nombre_tema']}"
    elif unidades:
        numeros = sorted(u["numero_unidad"] for u in unidades)
        titulo += " – " + ", ".join(f"U{n}" for n in numeros)
    return titulo


def contar_bloques(eventos):
    """
    eventos: [{"meta_id", "completado"}, ...] (solo bloques de estudio)
    Devuelve {meta_id: (bloques_total, bloques_completados)}.
    """
    conteo = {}
    for e in eventos:
        total, hechos = conteo.get(e["meta_id"], (0, 0))
        conteo[e["meta_id"]] = (total + 1, hechos + bool(e["completado"]))
    return conteo
