from fastapi import APIRouter, HTTPException
from app.schemas.materia import MateriaCreate, MateriaResponse
from app.services.materias import crear_materia, listar_materias

router = APIRouter(prefix="/usuarios/{usuario_id}/materias", tags=["materias"])

@router.post("/", response_model=MateriaResponse)
def crear(usuario_id: int, materia: MateriaCreate):
    try:
        unidades_dicts = [u.model_dump() for u in materia.unidades]
        return crear_materia(usuario_id, materia.nombre, materia.cuatrimestre, unidades_dicts)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/", response_model=list[MateriaResponse])
def listar(usuario_id: int):
    return listar_materias(usuario_id)