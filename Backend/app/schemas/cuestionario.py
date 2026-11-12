from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# lo que se espera recibir para armar un cuestionario
class CuestionarioCreate(BaseModel):
    materia_id: int
    # documentos a usar: uno o varios. Si no viene, usa todos los documentos listos de la materia
    documento_ids: list[UUID] | None = Field(default=None, min_length=1, max_length=50)
    cantidad: int = Field(ge=1, le=30)
    dificultad: Literal["facil", "media", "dificil", "mixta"] = "mixta"
    # True: la mitad de las preguntas pueden tener varias correctas. False: todas tienen una sola
    respuestas_multiples: bool = True

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
