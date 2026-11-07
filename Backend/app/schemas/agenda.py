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

# lo que se espera recibir para pedir los planes
class PlanCreate(BaseModel):
    materia_id: int
    unidad_id: int | None = None
    horas: float = Field(gt=0, le=100)          # horas de estudio a planificar
    desde: date                                  # primer día en que se puede estudiar
    hasta: date                                  # último día (ej: el día antes del parcial)
    hora_inicio: int = Field(default=8, ge=0, le=23)   # no estudiar antes de esta hora
    hora_fin: int = Field(default=22, ge=1, le=24)     # ni después de esta

    @model_validator(mode="after")
    def rangos_validos(self):
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

class PlanesResponse(BaseModel):
    materia_id: int
    materia: str
    unidad: str | None = None
    horas_solicitadas: float
    desde: date
    hasta: date
    opciones: list[OpcionPlan]

# lo que se espera recibir al elegir un plan (se mandan los bloques de la opción elegida)
class EstudioCreate(BaseModel):
    materia_id: int
    unidad_id: int | None = None
    bloques: list[Bloque] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def sin_superposiciones(self):
        # se compara en el mismo tipo de hora (sin zona o con zona, no mezclado)
        if len({b.inicio.tzinfo is None for b in self.bloques} | {b.fin.tzinfo is None for b in self.bloques}) > 1:
            raise ValueError("no mezcles fechas con zona horaria y sin zona horaria")
        ordenados = sorted(self.bloques, key=lambda b: b.inicio)
        for a, b in zip(ordenados, ordenados[1:]):
            if b.inicio < a.fin:
                raise ValueError("hay bloques que se superponen entre sí")
        return self
