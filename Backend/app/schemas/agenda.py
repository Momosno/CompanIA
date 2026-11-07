from datetime import date, datetime, time
from pydantic import BaseModel, Field, model_validator

# ---------- eventos de la agenda ----------

# lo que se espera recibir al agendar algo que ocupa tiempo (clase, trabajo, turno...)
class EventoCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    inicio: datetime
    fin: datetime
    materia_id: int | None = None
    unidad_id: int | None = None

    @model_validator(mode="after")
    def fin_despues_de_inicio(self):
        if self.fin <= self.inicio:
            raise ValueError("fin tiene que ser posterior a inicio")
        return self

class EventoResponse(BaseModel):
    id: int
    titulo: str
    inicio: datetime
    fin: datetime
    tipo: str  # "ocupado" o "estudio"
    materia_id: int | None = None
    unidad_id: int | None = None
    meta_id: int | None = None      # meta de examen a la que pertenece el bloque de estudio
    completado: bool = False

# ---------- disponibilidad semanal ----------

# compromiso que se repite todas las semanas; `dias` permite cargar varios días de una vez
# (ej. días hábiles = [0, 1, 2, 3, 4]; 0 = lunes ... 6 = domingo)
class DisponibilidadCreate(BaseModel):
    titulo: str = Field(min_length=1, max_length=100)
    dias: list[int] = Field(min_length=1, max_length=7)
    hora_inicio: time
    hora_fin: time

    @model_validator(mode="after")
    def datos_validos(self):
        if any(d < 0 or d > 6 for d in self.dias):
            raise ValueError("los días van de 0 (lunes) a 6 (domingo)")
        if len(set(self.dias)) != len(self.dias):
            raise ValueError("hay días repetidos")
        if self.hora_inicio.tzinfo is not None or self.hora_fin.tzinfo is not None:
            raise ValueError("las horas van sin zona horaria (hora argentina)")
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin tiene que ser posterior a hora_inicio")
        return self

class DisponibilidadResponse(BaseModel):
    id: int
    titulo: str
    dia_semana: int
    hora_inicio: time
    hora_fin: time

# ---------- planes de estudio ----------

# lo que se espera recibir para pedir los planes.
# Dos formas: con `meta_id` (la materia, las unidades y el rango salen de la meta de examen;
# `desde`/`hasta` son opcionales para achicarlo) o con `materia_id` + `desde` + `hasta`.
class PlanCreate(BaseModel):
    meta_id: int | None = None
    materia_id: int | None = None
    unidad_id: int | None = None
    horas: float = Field(gt=0, le=100)          # horas de estudio a planificar
    desde: date | None = None                    # primer día en que se puede estudiar
    hasta: date | None = None                    # último día (ej: el día antes del parcial)
    hora_inicio: int = Field(default=8, ge=0, le=23)   # no estudiar antes de esta hora
    hora_fin: int = Field(default=22, ge=1, le=24)     # ni después de esta

    @model_validator(mode="after")
    def rangos_validos(self):
        if self.meta_id is not None:
            if self.materia_id is not None or self.unidad_id is not None:
                raise ValueError("con meta_id no se manda materia_id ni unidad_id (salen de la meta)")
        elif self.materia_id is None or self.desde is None or self.hasta is None:
            raise ValueError("mandá meta_id, o materia_id con desde y hasta")
        if self.desde and self.hasta:
            if self.hasta < self.desde:
                raise ValueError("hasta no puede ser anterior a desde")
            if (self.hasta - self.desde).days > 60:
                raise ValueError("el rango no puede superar los 60 días")
        if self.hora_fin <= self.hora_inicio:
            raise ValueError("hora_fin tiene que ser mayor que hora_inicio")
        return self

class Bloque(BaseModel):
    inicio: datetime
    fin: datetime

    @model_validator(mode="after")
    def fin_despues_de_inicio(self):
        if self.fin <= self.inicio:
            raise ValueError("fin tiene que ser posterior a inicio")
        return self

class OpcionPlan(BaseModel):
    nombre: str
    descripcion: str
    bloques: list[Bloque]
    horas_planificadas: float
    dias_de_estudio: int
    completo: bool          # False si no entraron todas las horas pedidas
    faltan_horas: float

class UnidadResumen(BaseModel):
    id: int
    numero_unidad: int
    nombre_tema: str

class PlanesResponse(BaseModel):
    meta_id: int | None = None
    materia_id: int
    materia: str
    unidad: str | None = None                 # tema, si el plan es de una sola unidad
    unidades: list[UnidadResumen] = []
    horas_solicitadas: float
    desde: date
    hasta: date
    opciones: list[OpcionPlan]

# lo que se espera recibir al elegir un plan (se mandan los bloques de la opción elegida).
# Con `meta_id` la materia y las unidades salen de la meta; si no, va `materia_id`.
class EstudioCreate(BaseModel):
    meta_id: int | None = None
    materia_id: int | None = None
    unidad_id: int | None = None
    bloques: list[Bloque] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def sin_superposiciones(self):
        if self.meta_id is not None:
            if self.materia_id is not None or self.unidad_id is not None:
                raise ValueError("con meta_id no se manda materia_id ni unidad_id (salen de la meta)")
        elif self.materia_id is None:
            raise ValueError("mandá meta_id o materia_id")
        # se compara en el mismo tipo de hora (sin zona o con zona, no mezclado)
        if len({b.inicio.tzinfo is None for b in self.bloques} | {b.fin.tzinfo is None for b in self.bloques}) > 1:
            raise ValueError("no mezcles fechas con zona horaria y sin zona horaria")
        ordenados = sorted(self.bloques, key=lambda b: b.inicio)
        for a, b in zip(ordenados, ordenados[1:]):
            if b.inicio < a.fin:
                raise ValueError("hay bloques que se superponen entre sí")
        return self

# ---------- metas de examen ----------

def _sin_zona(hora: time | None):
    if hora is not None and hora.tzinfo is not None:
        raise ValueError("la hora va sin zona horaria (hora argentina)")

# lo que se espera recibir al crear una meta (un parcial / final de una materia)
class MetaCreate(BaseModel):
    materia_id: int
    fecha: date                                   # día del examen
    hora: time | None = None
    unidad_ids: list[int] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def datos_validos(self):
        _sin_zona(self.hora)
        self.unidad_ids = list(dict.fromkeys(self.unidad_ids))  # sin repetidos
        return self

# para editar: se manda solo lo que cambia (`hora: null` la borra)
class MetaUpdate(BaseModel):
    materia_id: int | None = None
    fecha: date | None = None
    hora: time | None = None
    unidad_ids: list[int] | None = Field(default=None, min_length=1, max_length=50)

    @model_validator(mode="after")
    def datos_validos(self):
        for campo in ("materia_id", "fecha", "unidad_ids"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"{campo} no puede ser null")
        if not self.model_fields_set:
            raise ValueError("no hay nada para cambiar")
        _sin_zona(self.hora)
        if self.unidad_ids is not None:
            self.unidad_ids = list(dict.fromkeys(self.unidad_ids))
        return self

class MetaResponse(BaseModel):
    id: int
    materia_id: int
    materia: str
    fecha: date
    hora: time | None = None
    unidades: list[UnidadResumen]
    bloques_total: int
    bloques_completados: int
