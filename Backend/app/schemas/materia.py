from pydantic import BaseModel, Field
from app.schemas.unidad import UnidadCreate, UnidadResponse

# lo que se espera recibir al crear una materia (con sus unidades incluidas)
class MateriaCreate(BaseModel):
    nombre: str
    cuatrimestre: str
    unidades: list[UnidadCreate] = Field(min_length=1)

# lo que se devuelve al cliente
class MateriaResponse(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    cuatrimestre: str
    unidades: list[UnidadResponse]