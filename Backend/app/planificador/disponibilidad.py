from datetime import datetime, timedelta


def expandir_disponibilidad(filas, desde, hasta):
    """
    Convierte los compromisos semanales en horarios ocupados concretos.
    filas: [{"titulo", "dia_semana" (0 = lunes ... 6 = domingo), "hora_inicio", "hora_fin"}]
           con hora_inicio / hora_fin como datetime.time
    desde, hasta: fechas (date), ambas incluidas
    Devuelve [(inicio, fin, titulo), ...] como datetime sin zona (hora local), ordenado.
    """
    por_dia = {}
    for fila in filas:
        por_dia.setdefault(fila["dia_semana"], []).append(fila)

    ocupados = []
    dia = desde
    while dia <= hasta:
        for fila in por_dia.get(dia.weekday(), []):
            ocupados.append((
                datetime.combine(dia, fila["hora_inicio"]),
                datetime.combine(dia, fila["hora_fin"]),
                fila["titulo"],
            ))
        dia += timedelta(days=1)
    return sorted(ocupados)
