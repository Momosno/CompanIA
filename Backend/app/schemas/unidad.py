from pydantic import BaseModel

# lo que se espera recibir al crear una unidad (dentro de una materia)
class UnidadCreate(BaseModel):
    numero_unidad: int
    nombre_tema: str

# lo que se devuelve al cliente
class UnidadResponse(BaseModel):
    id: int
    materia_id: int
    numero_unidad: int
    nombre_tema: str