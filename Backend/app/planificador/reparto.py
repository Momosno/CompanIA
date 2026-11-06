from datetime import timedelta

from app.planificador.huecos import SLOT

def partir_en_slots(tramos):
    # corta cada tramo libre en pedacitos de 30 min (devuelve la hora de inicio de cada uno)
    slots = []
    for inicio, fin in tramos:
        t = inicio
        while t + SLOT <= fin:
            slots.append(t)
            t += SLOT
    return slots

def elegir_slots(slots, cantidad, max_seguidos):
    # elige los primeros `cantidad` slots, sin pasar de `max_seguidos` pegados (deja un descanso)
    elegidos = []
    racha = 0
    for s in slots:
        if len(elegidos) == cantidad:
            break
        pegado = bool(elegidos) and elegidos[-1] + SLOT == s
        racha = racha + 1 if pegado else 1
        if racha > max_seguidos:
            continue
        elegidos.append(s)
    return elegidos

def juntar_en_bloques(slots):
    # une los slots consecutivos: [8:00, 8:30, 9:00] -> (8:00, 9:30)
    bloques = []
    for s in slots:
        if bloques and bloques[-1][1] == s:
            bloques[-1] = (bloques[-1][0], s + SLOT)
        else:
            bloques.append((s, s + SLOT))
    return bloques

def repartir(capacidades, total, pesos):
    """
    Reparte `total` slots entre los días según `pesos`, sin pasar la capacidad de cada día.
    Devuelve la cantidad de slots para cada día (misma posición que `capacidades`).
    """
    cuotas = [0] * len(capacidades)
    restante = min(total, sum(capacidades))
    activos = [i for i, c in enumerate(capacidades) if c > 0]
    while restante > 0 and activos:
        suma = sum(pesos[i] for i in activos)
        dado = 0
        for i in activos:
            q = min(capacidades[i] - cuotas[i], int(restante * pesos[i] / suma))
            cuotas[i] += q
            dado += q
        restante -= dado
        if dado == 0:
            # sobran unos pocos por el redondeo: de a uno, empezando por el de más peso
            for i in sorted(activos, key=lambda i: -pesos[i]):
                if restante == 0:
                    break
                cuotas[i] += 1
                restante -= 1
        activos = [i for i in activos if cuotas[i] < capacidades[i]]
    return cuotas

def llenar_en_orden(capacidades, total):
    # lo más pegado posible al principio: llena el primer día, después el segundo, etc.
    cuotas = []
    restante = total
    for c in capacidades:
        q = min(c, restante)
        cuotas.append(q)
        restante -= q
    return cuotas
