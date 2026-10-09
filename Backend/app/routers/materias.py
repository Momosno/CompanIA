from fastapi import APIRouter, HTTPException
from app.schemas.materia import MateriaCreate, MateriaResponse, MateriaUpdate, MateriaEditResponse
from app.services.materias import crear_materia, listar_materias, editar_materia
from app.schemas.unidad import UnidadCreate, UnidadResponse, UnidadUpdate
from app.services.materias import crear_materia, listar_materias, editar_materia, agregar_unidad, editar_unidad, eliminar_unidad, eliminar_materia

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

@router.put("/{materia_id}", response_model=MateriaEditResponse)
def editar(usuario_id: int, materia_id: int, materia: MateriaUpdate):
    try:
        resultado = editar_materia(usuario_id, materia_id, materia.nombre)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if resultado is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    return resultado

@router.post("/{materia_id}/unidades", response_model=UnidadResponse)
def agregar_unidad_endpoint(usuario_id: int, materia_id: int, unidad: UnidadCreate):
    resultado = agregar_unidad(usuario_id, materia_id, unidad.numero_unidad, unidad.nombre_tema)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return resultado

@router.put("/{materia_id}/unidades/{unidad_id}", response_model=UnidadResponse)
def editar_unidad_endpoint(usuario_id: int, materia_id: int, unidad_id: int, unidad: UnidadUpdate):
    datos = unidad.model_dump(exclude_unset=True)
    resultado = editar_unidad(usuario_id, materia_id, unidad_id, datos)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return resultado

@router.delete("/{materia_id}/unidades/{unidad_id}", status_code=204)
def eliminar_unidad_endpoint(usuario_id: int, materia_id: int, unidad_id: int):
    eliminado = eliminar_unidad(usuario_id, materia_id, unidad_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

@router.delete("/{materia_id}", status_code=204)
def eliminar_materia_endpoint(usuario_id: int, materia_id: int):
    eliminado = eliminar_materia(usuario_id, materia_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Materia no encontrada")