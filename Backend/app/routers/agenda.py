from datetime import date

from fastapi import APIRouter, HTTPException
from app.schemas.agenda import (
    EventoCreate, EventoResponse, PlanCreate, PlanesResponse, EstudioCreate,
    DisponibilidadCreate, DisponibilidadResponse,
)
from app.services.usuarios import buscar_usuario
from app.services.materias import buscar_materia, buscar_unidad
from app.services.agenda import (
    crear_evento, listar_eventos, eliminar_evento, generar_planes, confirmar_estudio,
    ahora_local, a_local,
    listar_disponibilidad, crear_disponibilidad, eliminar_disponibilidad,
)

router = APIRouter(prefix="/usuarios/{usuario_id}/agenda", tags=["agenda"])

def _usuario_o_404(usuario_id: int):
    if buscar_usuario(usuario_id) is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

def _materia_y_unidad_o_404(usuario_id: int, materia_id: int, unidad_id: int | None):
    materia = buscar_materia(usuario_id, materia_id)
    if materia is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    unidad = None
    if unidad_id is not None:
        unidad = buscar_unidad(usuario_id, materia_id, unidad_id)
        if unidad is None:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return materia, unidad

@router.post("/eventos", response_model=EventoResponse, status_code=201)
def crear(usuario_id: int, evento: EventoCreate):
    _usuario_o_404(usuario_id)
    if evento.materia_id is not None:
        _materia_y_unidad_o_404(usuario_id, evento.materia_id, evento.unidad_id)
    elif evento.unidad_id is not None:
        raise HTTPException(status_code=422, detail="unidad_id necesita materia_id")
    return crear_evento(usuario_id, evento.titulo, evento.inicio, evento.fin,
                        evento.materia_id, evento.unidad_id)

@router.get("/eventos", response_model=list[EventoResponse])
def listar(usuario_id: int, desde: date | None = None, hasta: date | None = None):
    _usuario_o_404(usuario_id)
    return listar_eventos(usuario_id, desde, hasta)

@router.delete("/eventos/{evento_id}", status_code=204)
def eliminar(usuario_id: int, evento_id: int):
    if not eliminar_evento(usuario_id, evento_id):
        raise HTTPException(status_code=404, detail="Evento no encontrado")

@router.get("/disponibilidad", response_model=list[DisponibilidadResponse])
def ver_disponibilidad(usuario_id: int):
    _usuario_o_404(usuario_id)
    return listar_disponibilidad(usuario_id)

@router.post("/disponibilidad", response_model=list[DisponibilidadResponse], status_code=201)
def agregar_disponibilidad(usuario_id: int, datos: DisponibilidadCreate):
    _usuario_o_404(usuario_id)
    return crear_disponibilidad(usuario_id, datos.titulo, datos.dias, datos.hora_inicio, datos.hora_fin)

@router.delete("/disponibilidad/{disponibilidad_id}", status_code=204)
def borrar_disponibilidad(usuario_id: int, disponibilidad_id: int):
    if not eliminar_disponibilidad(usuario_id, disponibilidad_id):
        raise HTTPException(status_code=404, detail="Compromiso no encontrado")

@router.post("/planes", response_model=PlanesResponse)
def planes(usuario_id: int, datos: PlanCreate):
    materia, unidad = _materia_y_unidad_o_404(usuario_id, datos.materia_id, datos.unidad_id)
    if datos.hasta < ahora_local().date():
        raise HTTPException(status_code=400, detail="El rango ya pasó")
    return generar_planes(usuario_id, materia, unidad, datos.horas, datos.desde, datos.hasta,
                          datos.hora_inicio, datos.hora_fin)

@router.post("/estudio", response_model=list[EventoResponse], status_code=201)
def agendar_estudio(usuario_id: int, datos: EstudioCreate):
    materia, unidad = _materia_y_unidad_o_404(usuario_id, datos.materia_id, datos.unidad_id)
    ahora = ahora_local()
    if any(a_local(b.inicio) < ahora for b in datos.bloques):
        raise HTTPException(status_code=400, detail="Hay bloques que ya pasaron")
    try:
        return confirmar_estudio(usuario_id, materia, unidad, [b.model_dump() for b in datos.bloques])
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
