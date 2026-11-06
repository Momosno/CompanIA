from datetime import datetime, timedelta

SLOT = timedelta(minutes=30)  # el mínimo que vale la pena para estudiar

def calcular_huecos(ocupados, desde, hasta, hora_inicio=8, hora_fin=22, ahora=None):
    """
    ocupados: lista de (inicio, fin) como datetime sin zona (hora local)
    desde, hasta: fechas (date), ambas incluidas
    Devuelve {fecha: [(inicio, fin), ...]} con los tramos libres de 30 min o más.
    """
    ocupados = sorted(ocupados)
    if ahora is not None:
        # no ofrecer horarios que ya pasaron (se redondea a la media hora siguiente)
        resto = (ahora.minute % 30, ahora.second, ahora.microsecond)
        ahora = ahora.replace(second=0, microsecond=0)
        if resto != (0, 0, 0):
            ahora += timedelta(minutes=30 - ahora.minute % 30)

    huecos = {}
    dia = desde
    while dia <= hasta:
        inicio = datetime(dia.year, dia.month, dia.day, hora_inicio)
        fin = datetime(dia.year, dia.month, dia.day) + timedelta(hours=hora_fin)
        if ahora is not None:
            inicio = max(inicio, ahora)

        libres = []
        cursor = inicio
        for o_ini, o_fin in ocupados:
            if o_fin <= cursor:
                continue
            if o_ini >= fin:
                break
            if o_ini > cursor:
                libres.append((cursor, o_ini))
            cursor = max(cursor, o_fin)
        if cursor < fin:
            libres.append((cursor, fin))

        huecos[dia] = [(a, b) for a, b in libres if b - a >= SLOT]
        dia += timedelta(days=1)
    return huecos
