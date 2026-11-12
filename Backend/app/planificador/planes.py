import math

from app.planificador.reparto import (
    Dia, partir_en_slots, repartir, llenar_en_orden, ajustar_cuotas,
)

MIN_SLOTS = 1  # lo mínimo que se planifica son 30 min


def slots_pedidos(horas):
    # las horas se redondean hacia arriba a múltiplos de 30 min, con mínimo 30 min
    return max(MIN_SLOTS, math.ceil(round(horas * 2, 6)))


def armar_planes(huecos, horas, max_horas_dia=4):
    """
    huecos: lo que devuelve calcular_huecos
    horas: horas de estudio que la persona quiere planificar
    Devuelve 3 opciones de plan (Constante, Intensivo, Progresivo).
    Los bloques duran 60 o 90 min; los de 30 min solo aparecen cuando la agenda está
    apretada o para completar un resto. Hay 30 min de pausa entre bloques del mismo día
    y como mucho `max_horas_dia` horas de estudio por día.
    """
    fechas = sorted(huecos)
    dias = [Dia(partir_en_slots(huecos[f]), int(max_horas_dia * 2)) for f in fechas]
    capacidades = [d.capacidad for d in dias]
    total = slots_pedidos(horas)

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
    for nombre, descripcion, ideales in cuotas_por_plan:
        cuotas = ajustar_cuotas(ideales, dias, total)
        bloques = []
        for dia, cuota in zip(dias, cuotas):
            bloques += dia.bloques(cuota)
        planeadas = sum(cuotas) / 2
        planes.append({
            "nombre": nombre,
            "descripcion": descripcion,
            "bloques": bloques,
            "horas_planificadas": planeadas,
            "dias_de_estudio": sum(1 for c in cuotas if c > 0),
            "completo": sum(cuotas) >= total,
            "faltan_horas": max(0.0, (total - sum(cuotas)) / 2),
        })
    return planes
