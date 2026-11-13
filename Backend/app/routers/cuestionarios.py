from fastapi import APIRouter, HTTPException
from app.evaluacion.correccion import corregir
from app.schemas.cuestionario import (
    CorreccionCreate, CorreccionResponse, CuestionarioCreate, CuestionarioResponse,
)
from app.services.materias import buscar_materia
from app.services.cuestionarios import UnidadNoEncontrada, crear_cuestionario

router = APIRouter(prefix="/usuarios/{usuario_id}/cuestionarios", tags=["cuestionarios"])

def _materia_o_404(usuario_id: int, materia_id: int):
    materia = buscar_materia(usuario_id, materia_id)
    if materia is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return materia

# /corregir va antes que cualquier ruta con parámetro, para que no la confunda con un id
@router.post("/corregir", response_model=CorreccionResponse)
def corregir_cuestionario(usuario_id: int, datos: CorreccionCreate):
    # no guarda nada: recibe las preguntas y lo que marcó la persona, y devuelve el resultado
    _materia_o_404(usuario_id, datos.materia_id)
    return corregir(
        [p.model_dump(mode="json") for p in datos.preguntas],
        [r.model_dump() for r in datos.respuestas],
    )

@router.post("/", response_model=CuestionarioResponse)
def crear(usuario_id: int, datos: CuestionarioCreate):
    materia = _materia_o_404(usuario_id, datos.materia_id)
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
