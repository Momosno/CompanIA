from app.planificador.huecos import SLOT

# Un bloque de estudio dura 60 o 90 min (2 o 3 slots). Los de 30 min (1 slot) solo se usan
# como último recurso, cuando la agenda está apretada o para completar un resto.
# Entre dos bloques del mismo día queda al menos 1 slot (30 min) de pausa.
TAMANIOS_BLOQUE = (3, 2, 1)
CORTO = 1
PAUSA = SLOT
IMPOSIBLE = float("inf")


def partir_en_slots(tramos):
    # corta cada tramo libre en pedacitos de 30 min (devuelve la hora de inicio de cada uno)
    slots = []
    for inicio, fin in tramos:
        t = inicio
        while t + SLOT <= fin:
            slots.append(t)
            t += SLOT
    return slots


class Dia:
    """
    Los slots libres de un día y qué bloques se pueden armar con ellos.
    - `posibles`: totales de slots que se pueden estudiar ese día (pausa y máximo diario incluidos).
    - `posibles_largos`: los que se arman solo con bloques de 60/90 min.
    """

    def __init__(self, slots, max_slots):
        self.slots = slots
        self.max_slots = max_slots
        self._memo = {}
        self.posibles = [t for t in range(max_slots + 1) if self._cortos(0, t) < IMPOSIBLE]
        self.posibles_largos = [t for t in self.posibles if self._cortos(0, t) == 0]
        self.capacidad = max(self.posibles_largos)

    def cortos(self, total):
        # cuántos bloques de 30 min hacen falta para estudiar `total` slots este día
        return self._cortos(0, total)

    def _bloque_en(self, i, tamanio):
        # ¿hay `tamanio` slots pegados empezando en el slot i?
        if i + tamanio > len(self.slots):
            return False
        return all(self.slots[i + k] == self.slots[i] + k * SLOT for k in range(tamanio))

    def _siguiente(self, i, tamanio):
        # primer slot donde puede arrancar otro bloque (después de la pausa)
        fin = self.slots[i] + tamanio * SLOT
        j = i + tamanio
        while j < len(self.slots) and self.slots[j] < fin + PAUSA:
            j += 1
        return j

    def _con_bloque(self, i, tamanio, total):
        # cuántos bloques de 30 min hacen falta si se arranca un bloque de `tamanio` en el slot i
        if tamanio > total or not self._bloque_en(i, tamanio):
            return IMPOSIBLE
        return (tamanio == CORTO) + self._cortos(self._siguiente(i, tamanio), total - tamanio)

    def _cortos(self, i, total):
        # mínima cantidad de bloques de 30 min para estudiar exactamente `total` slots
        # usando los slots desde el i (IMPOSIBLE si no se puede)
        if total == 0:
            return 0
        if i >= len(self.slots):
            return IMPOSIBLE
        if (i, total) not in self._memo:
            self._memo[(i, total)] = min(
                min(self._con_bloque(i, t, total) for t in TAMANIOS_BLOQUE),
                self._cortos(i + 1, total),
            )
        return self._memo[(i, total)]

    def bloques(self, total):
        """
        Bloques (inicio, fin) que suman `total` slots: con la menor cantidad posible
        de bloques de 30 min y, a igualdad, lo más temprano posible.
        """
        bloques = []
        i = 0
        while total > 0:
            objetivo = self._cortos(i, total)
            for tamanio in TAMANIOS_BLOQUE:
                if self._con_bloque(i, tamanio, total) == objetivo:
                    bloques.append((self.slots[i], self.slots[i] + tamanio * SLOT))
                    i = self._siguiente(i, tamanio)
                    total -= tamanio
                    break
            else:
                i += 1  # en este slot no conviene arrancar: probar en el siguiente
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


# cuánto "cuesta" usar un bloque de 30 min, comparado con correr 30 min las horas de un día
COSTO_CORTO = 100


def ajustar_cuotas(ideales, dias, total):
    """
    Las cuotas ideales pueden pedir cantidades que no se arman con bloques de 60/90 min
    (ej. 1 slot = 30 min). Busca las cuotas reales (una por día) que:
      1. sumen lo pedido (o lo máximo que entra en la agenda),
      2. usen la menor cantidad posible de bloques de 30 min,
      3. se parezcan lo más posible a las ideales (para no perder la forma del plan).
    Es una mochila chica: mejor[s] = (costo, cuotas) para llegar a s slots con los días vistos.
    """
    objetivo = min(total, sum(d.posibles[-1] for d in dias))
    mejor = {0: (0, [])}
    for ideal, dia in zip(ideales, dias):
        nuevo = {}
        for suma, (costo, cuotas) in mejor.items():
            for v in dia.posibles:
                if suma + v > objetivo:
                    break
                c = costo + COSTO_CORTO * dia.cortos(v) + abs(v - ideal)
                if suma + v not in nuevo or c < nuevo[suma + v][0]:
                    nuevo[suma + v] = (c, cuotas + [v])
        mejor = nuevo
    return mejor[max(mejor)][1]
