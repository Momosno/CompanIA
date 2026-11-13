from fastapi import APIRouter, HTTPException
from app.schemas.cuestionario import CuestionarioCreate, CuestionarioResponse
from app.services.materias import buscar_materia
from app.services.cuestionarios import UnidadNoEncontrada, crear_cuestionario

router = APIRouter(prefix="/usuarios/{usuario_id}/cuestionarios", tags=["cuestionarios"])

@router.post("/", response_model=CuestionarioResponse)
def crear(usuario_id: int, datos: CuestionarioCreate):
    materia = buscar_materia(usuario_id, datos.materia_id)
    if materia is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    try:
        resultado = crear_cuestionario(
            usuario_id, materia,
            [str(i) for i in datos.documento_ids] if datos.documento_ids else None,
            datos.cantidad, datos.dificultad, datos.respuestas_multiples,
            datos.unidad_ids,
        )
    except UnidadNoEncontrada as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    if resultado is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado en esta materia")
    return resultado
