from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

# lo que se espera recibir para armar un cuestionario
class CuestionarioCreate(BaseModel):
    materia_id: int
    # qué evaluar: unidades (usa sus documentos listos) o documentos sueltos, no las dos cosas.
    # Si no viene ninguna, usa todos los documentos listos de la materia
    unidad_ids: list[int] | None = Field(default=None, min_length=1, max_length=50)
    documento_ids: list[UUID] | None = Field(default=None, min_length=1, max_length=50)
    cantidad: int = Field(ge=1, le=30)
    dificultad: Literal["facil", "media", "dificil", "mixta"] = "mixta"
    # True: la mitad de las preguntas pueden tener varias correctas. False: todas tienen una sola
    respuestas_multiples: bool = True

    @model_validator(mode="after")
    def unidades_o_documentos(self):
        if self.unidad_ids is not None and self.documento_ids is not None:
            raise ValueError("mandá unidad_ids o documento_ids, no los dos")
        if self.unidad_ids is not None:
            self.unidad_ids = list(dict.fromkeys(self.unidad_ids))  # sin repetidos
        return self

class PreguntaCuestionario(BaseModel):
    numero: int
    pregunta: str
    dificultad: str          # "facil", "media" o "dificil"
    opciones: list[str]      # siempre 4, ya mezcladas
    correctas: list[int]             # posiciones (0 a 3) de TODAS las opciones correctas (1 a 3)
    respuestas_correctas: list[str]  # el texto de esas opciones
    multiple: bool                   # True si hay más de una correcta (hay que marcar varias)
    explicacion: str
    fuente: str | None = None  # nombre del documento del que sale
    # de dónde sale la pregunta (None si no se pudo saber)
    documento_id: UUID | None = None
    unidad_id: int | None = None
    unidad: str | None = None  # "U3 · Derivadas"

# ---------- corrección ----------

class RespuestaPregunta(BaseModel):
    numero: int
    marcadas: list[int] = Field(default=[], max_length=4)   # posiciones elegidas (0 a 3); vacía = sin responder

    @model_validator(mode="after")
    def posiciones_validas(self):
        if any(m < 0 or m > 3 for m in self.marcadas):
            raise ValueError("las posiciones marcadas van de 0 a 3")
        if len(set(self.marcadas)) != len(self.marcadas):
            raise ValueError("hay posiciones marcadas repetidas")
        return self

# lo que se espera recibir para corregir: las preguntas tal cual vinieron y lo que marcó la persona
class CorreccionCreate(BaseModel):
    materia_id: int
    preguntas: list[PreguntaCuestionario] = Field(min_length=1, max_length=30)
    respuestas: list[RespuestaPregunta] = Field(default=[], max_length=30)

    @model_validator(mode="after")
    def numeros_validos(self):
        numeros = [p.numero for p in self.preguntas]
        if len(set(numeros)) != len(numeros):
            raise ValueError("hay preguntas con el mismo número")
        respondidas = [r.numero for r in self.respuestas]
        if len(set(respondidas)) != len(respondidas):
            raise ValueError("hay más de una respuesta para la misma pregunta")
        sobran = sorted(set(respondidas) - set(numeros))
        if sobran:
            raise ValueError(f"hay respuestas para preguntas que no existen: {sobran}")
        return self

class PreguntaCorregida(BaseModel):
    numero: int
    pregunta: str | None = None
    opciones: list[str]
    acertada: bool
    respondida: bool
    marcadas: list[int]
    correctas: list[int]
    respuestas_correctas: list[str]
    explicacion: str
    fuente: str | None = None
    documento_id: UUID | None = None
    unidad_id: int | None = None
    unidad: str | None = None

class PuntoDebil(BaseModel):
    unidad_id: int | None = None   # None = preguntas sin unidad asignada
    unidad: str
    errores: int
    total: int
    porcentaje_error: float
    preguntas: list[int]           # números de las preguntas con error

class CorreccionResponse(BaseModel):
    aciertos: int
    total: int
    porcentaje: float
    detalle: list[PreguntaCorregida]
    puntos_debiles: list[PuntoDebil]   # de la unidad más floja a la menos floja

class DocumentoUsado(BaseModel):
    id: UUID
    nombre: str

class CuestionarioResponse(BaseModel):
    materia_id: int
    materia: str
    documentos: list[DocumentoUsado]   # los documentos de los que salieron las preguntas
    dificultad: str
    respuestas_multiples: bool
    cantidad_solicitada: int
    cantidad: int            # las que se generaron de verdad (puede ser menor a la pedida)
    preguntas: list[PreguntaCuestionario]
