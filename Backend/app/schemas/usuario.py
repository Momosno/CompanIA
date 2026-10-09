from pydantic import BaseModel
from datetime import datetime

# lo que se espera recibir al crear un usuario
class UsuarioCreate(BaseModel):
    nombre: str

# lo que se devuelve al cliente (incluye campos generados por la DB)
class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    created_at: datetime