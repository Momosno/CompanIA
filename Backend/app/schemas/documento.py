from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

# lo que se espera recibir al hacer una pregunta sobre un documento
class PreguntaCreate(BaseModel):
    pregunta: str = Field(min_length=1, max_length=2000)

# lo que se devuelve al subir un documento (el procesamiento sigue en segundo plano)
class DocumentoSubidoResponse(BaseModel):
    id: UUID
    estado: str

# lo que se devuelve al listar documentos
class DocumentoListaResponse(BaseModel):
    id: UUID
    materia_id: int
    unidad_id: int | None = None
    nombre_original: str
    estado: str
    paginas: int | None = None
    created_at: datetime

# lo que se devuelve al consultar un documento (incluye el resumen cuando está listo)
class DocumentoResponse(BaseModel):
    id: UUID
    materia_id: int
    unidad_id: int | None = None
    nombre_original: str
    tamano_bytes: int | None = None
    estado: str
    paginas: int | None = None
    resumen: str | None = None
    error: str | None = None
    created_at: datetime

class PreguntaResponse(BaseModel):
    respuesta: str
    paginas: list[int]
