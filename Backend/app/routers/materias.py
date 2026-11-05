import json
import logging
from itertools import chain

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from app.schemas.documento import PreguntaCreate, PreguntaMateriaResponse
from app.schemas.materia import MateriaCreate, MateriaResponse, MateriaUpdate, MateriaEditResponse
from app.schemas.unidad import UnidadCreate, UnidadResponse, UnidadUpdate
from app.services.materias import (
    crear_materia, listar_materias, buscar_materia, editar_materia,
    agregar_unidad, buscar_unidad, editar_unidad, eliminar_unidad, eliminar_materia, _is_mock,
)
from app.services.documentos import eliminar_documento, eliminar_vectores, listar_documentos
from app.services.uso import preguntas_restantes, registrar_pregunta

router = APIRouter(prefix="/usuarios/{usuario_id}/materias", tags=["materias"])

logger = logging.getLogger(__name__)

LIMITE_ALCANZADO = "Alcanzaste el límite de preguntas por hoy."
IA_NO_DISPONIBLE = "El servicio de IA no está disponible. Probá de nuevo en unos minutos."
RESPUESTA_MOCK = {
    "respuesta": "Modo mock: sin IA no se puede responder sobre el material.",
    "fuentes": [],
    "sin_fuente": True,
}

def _evento(nombre: str, datos: dict):
    return f"event: {nombre}\ndata: {json.dumps(datos, ensure_ascii=False)}\n\n"

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

@router.get("/{materia_id}", response_model=MateriaResponse)
def obtener(usuario_id: int, materia_id: int):
    resultado = buscar_materia(usuario_id, materia_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return resultado

@router.get("/{materia_id}/unidades/{unidad_id}", response_model=UnidadResponse)
def obtener_unidad(usuario_id: int, materia_id: int, unidad_id: int):
    resultado = buscar_unidad(usuario_id, materia_id, unidad_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return resultado

@router.put("/{materia_id}", response_model=MateriaEditResponse)
def editar(usuario_id: int, materia_id: int, materia: MateriaUpdate):
    try:
        resultado = editar_materia(usuario_id, materia_id, materia.nombre)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if resultado is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    return resultado

@router.post("/{materia_id}/preguntas", response_model=PreguntaMateriaResponse)
def preguntar(usuario_id: int, materia_id: int, pregunta: PreguntaCreate):
    if buscar_materia(usuario_id, materia_id) is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    restantes = preguntas_restantes(usuario_id)
    if restantes <= 0:
        return JSONResponse(
            status_code=429,
            content={"detail": LIMITE_ALCANZADO, "restantes": 0},
        )

    if _is_mock():
        resultado = RESPUESTA_MOCK
    else:
        from app.ia.pdf_questions import LLMNoDisponible, responder_materia
        try:
            resultado = responder_materia(pregunta.pregunta, materia_id)
        except LLMNoDisponible:
            # una pregunta que falló no gasta cupo
            return JSONResponse(
                status_code=503,
                content={"detail": IA_NO_DISPONIBLE, "restantes": restantes},
            )

    return {**resultado, "restantes": registrar_pregunta(usuario_id)}

@router.post("/{materia_id}/preguntas/stream")
def preguntar_stream(usuario_id: int, materia_id: int, pregunta: PreguntaCreate):
    if buscar_materia(usuario_id, materia_id) is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    restantes = preguntas_restantes(usuario_id)
    if restantes <= 0:
        return JSONResponse(
            status_code=429,
            content={"detail": LIMITE_ALCANZADO, "restantes": 0},
        )

    if _is_mock():
        eventos = iter([("token", RESPUESTA_MOCK["respuesta"]), ("fin", RESPUESTA_MOCK)])
    else:
        from app.ia.pdf_questions import LLMNoDisponible, responder_materia_stream
        eventos = responder_materia_stream(pregunta.pregunta, materia_id)
        # se pide el primer evento acá para poder responder 503 antes de empezar el stream
        try:
            eventos = chain([next(eventos)], eventos)
        except LLMNoDisponible:
            return JSONResponse(
                status_code=503,
                content={"detail": IA_NO_DISPONIBLE, "restantes": restantes},
            )

    def transmitir():
        try:
            for tipo, contenido in eventos:
                if tipo == "token":
                    yield _evento("token", {"texto": contenido})
                else:
                    yield _evento("done", {**contenido, "restantes": registrar_pregunta(usuario_id)})
        except Exception:
            # con el stream empezado ya no se puede cambiar el código HTTP
            logger.exception("Falló el stream de la materia %s", materia_id)
            yield _evento("error", {"detail": IA_NO_DISPONIBLE, "restantes": restantes})

    return StreamingResponse(
        transmitir(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )

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
def eliminar_unidad_endpoint(usuario_id: int, materia_id: int, unidad_id: int, background_tasks: BackgroundTasks):
    if buscar_unidad(usuario_id, materia_id, unidad_id) is None:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    # primero los documentos: la tabla no limpia sus PDF ni sus vectores
    for documento in listar_documentos(usuario_id, materia_id):
        if documento["unidad_id"] == unidad_id:
            documento_id = str(documento["id"])
            eliminar_documento(usuario_id, documento_id)
            background_tasks.add_task(eliminar_vectores, documento_id)

    eliminado = eliminar_unidad(usuario_id, materia_id, unidad_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

@router.delete("/{materia_id}", status_code=204)
def eliminar_materia_endpoint(usuario_id: int, materia_id: int, background_tasks: BackgroundTasks):
    if buscar_materia(usuario_id, materia_id) is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    # primero los documentos: la tabla no limpia sus PDF ni sus vectores
    for documento in listar_documentos(usuario_id, materia_id):
        documento_id = str(documento["id"])
        eliminar_documento(usuario_id, documento_id)
        background_tasks.add_task(eliminar_vectores, documento_id)

    eliminado = eliminar_materia(usuario_id, materia_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Materia no encontrada")