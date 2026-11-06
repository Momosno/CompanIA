import math

from app.planificador.reparto import (
    partir_en_slots, elegir_slots, juntar_en_bloques, repartir, llenar_en_orden,
)

def armar_planes(huecos, horas, max_horas_dia=4, max_seguidas_horas=3):
    """
    huecos: lo que devuelve calcular_huecos
    horas: horas de estudio que la persona quiere planificar
    Devuelve 3 opciones de plan (Constante, Intensivo, Progresivo).
    """
    max_seguidos = int(max_seguidas_horas * 2)
    dias = sorted(huecos)
    slots_por_dia = [partir_en_slots(huecos[d]) for d in dias]
    capacidades = [
        min(len(elegir_slots(s, 10**6, max_seguidos)), int(max_horas_dia * 2)) for s in slots_por_dia
    ]
    total = math.ceil(horas * 2)

    cuotas_por_plan = [
        (
            "Constante",
            "Las mismas horas todos los días disponibles. Ritmo parejo y tranquilo.",
            repartir(capacidades, total, [1] * len(dias)),
        ),
        (
            "Intensivo",
            "Estudiás fuerte los primeros días y después te queda libre. Termina antes.",
            llenar_en_orden(capacidades, total),
        ),
        (
            "Progresivo",
            "Arrancás con pocas horas y vas subiendo hacia el final.",
            repartir(capacidades, total, list(range(1, len(dias) + 1))),
        ),
    ]

    planes = []
    for nombre, descripcion, cuotas in cuotas_por_plan:
        bloques = []
        for slots, cuota in zip(slots_por_dia, cuotas):
            bloques += juntar_en_bloques(elegir_slots(slots, cuota, max_seguidos))
        planeadas = sum(cuotas) / 2
        planes.append({
            "nombre": nombre,
            "descripcion": descripcion,
            "bloques": bloques,
            "horas_planificadas": planeadas,
            "dias_de_estudio": sum(1 for c in cuotas if c > 0),
            "completo": sum(cuotas) >= total,
            "faltan_horas": max(0.0, round(total / 2 - planeadas, 2)),
        })
    return planes
