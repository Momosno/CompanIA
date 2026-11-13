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
