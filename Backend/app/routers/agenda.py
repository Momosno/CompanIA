from datetime import date, timedelta

from fastapi import APIRouter, HTTPException
from app.schemas.agenda import (
    EventoCreate, EventoResponse, PlanCreate, PlanesResponse, EstudioCreate,
    DisponibilidadCreate, DisponibilidadResponse,
    MetaCreate, MetaUpdate, MetaResponse,
    EventoUpdate, ReprogramarCreate, Preferencias,
)
from app.planificador.metas import rango_para_meta
from app.services.usuarios import buscar_usuario
from app.services.materias import buscar_materia, buscar_unidad
from app.services.agenda import (
    crear_evento, listar_eventos, eliminar_evento, generar_planes, confirmar_estudio,
    ahora_local, a_local,
    listar_disponibilidad, crear_disponibilidad, eliminar_disponibilidad,
    listar_metas, buscar_meta, crear_meta, editar_meta, eliminar_meta,
    buscar_evento, marcar_completado, reprogramar_evento,
    obtener_preferencias, guardar_preferencias,
)

router = APIRouter(prefix="/usuarios/{usuario_id}/agenda", tags=["agenda"])

def _usuario_o_404(usuario_id: int):
    if buscar_usuario(usuario_id) is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

def _materia_o_404(usuario_id: int, materia_id: int):
    materia = buscar_materia(usuario_id, materia_id)
    if materia is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return materia

def _materia_y_unidad_o_404(usuario_id: int, materia_id: int, unidad_id: int | None):
    materia = _materia_o_404(usuario_id, materia_id)
    unidad = None
    if unidad_id is not None:
        unidad = buscar_unidad(usuario_id, materia_id, unidad_id)
        if unidad is None:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")
    return materia, unidad

def _meta_o_404(usuario_id: int, meta_id: int):
    meta = buscar_meta(usuario_id, meta_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return meta

def _que_estudiar(usuario_id: int, meta_id: int | None, materia_id: int | None, unidad_id: int | None):
    # devuelve (meta, materia, unidades) según venga una meta o una materia suelta
    if meta_id is not None:
        meta = _meta_o_404(usuario_id, meta_id)
        return meta, _materia_o_404(usuario_id, meta["materia_id"]), meta["unidades"]
    materia, unidad = _materia_y_unidad_o_404(usuario_id, materia_id, unidad_id)
    return None, materia, [unidad] if unidad else []

# ---------- eventos ----------

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

def _bloque_de_estudio_o_error(usuario_id: int, evento_id: int):
    evento = buscar_evento(usuario_id, evento_id)
    if evento is None:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if evento["tipo"] != "estudio":
        raise HTTPException(status_code=400, detail="Solo los bloques de estudio se pueden completar o reprogramar")
    return evento

@router.patch("/eventos/{evento_id}", response_model=EventoResponse)
def completar(usuario_id: int, evento_id: int, datos: EventoUpdate):
    _bloque_de_estudio_o_error(usuario_id, evento_id)
    return marcar_completado(usuario_id, evento_id, datos.completado)

@router.post("/eventos/{evento_id}/reprogramar", response_model=EventoResponse)
def reprogramar(usuario_id: int, evento_id: int, datos: ReprogramarCreate | None = None):
    evento = _bloque_de_estudio_o_error(usuario_id, evento_id)
    if evento["completado"]:
        raise HTTPException(status_code=400, detail="El bloque ya está completado")
    hoy = ahora_local().date()
    desde = datos.desde if datos and datos.desde else hoy + timedelta(days=1)
    desde = max(desde, hoy)
    fecha_examen = None
    if evento["meta_id"] is not None:
        meta = buscar_meta(usuario_id, evento["meta_id"])
        fecha_examen = meta["fecha"] if meta else None
    franja = obtener_preferencias(usuario_id)
    try:
        return reprogramar_evento(usuario_id, evento, desde, fecha_examen,
                                  franja["hora_inicio"], franja["hora_fin"])
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

# ---------- disponibilidad semanal ----------

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

# ---------- preferencias ----------

@router.get("/preferencias", response_model=Preferencias)
def ver_preferencias(usuario_id: int):
    _usuario_o_404(usuario_id)
    return obtener_preferencias(usuario_id)

@router.put("/preferencias", response_model=Preferencias)
def cambiar_preferencias(usuario_id: int, datos: Preferencias):
    _usuario_o_404(usuario_id)
    return guardar_preferencias(usuario_id, datos.hora_inicio, datos.hora_fin)

# ---------- metas de examen ----------

def _validar_meta(usuario_id: int, materia_id: int, unidad_ids: list[int], fecha: date | None):
    materia = _materia_o_404(usuario_id, materia_id)
    validas = {u["id"] for u in materia.get("unidades") or []}
    if not set(unidad_ids) <= validas:
        raise HTTPException(status_code=422, detail="Hay unidades que no son de esta materia")
    if fecha is not None and fecha < ahora_local().date():
        raise HTTPException(status_code=400, detail="La fecha del examen ya pasó")

@router.get("/metas", response_model=list[MetaResponse])
def ver_metas(usuario_id: int):
    _usuario_o_404(usuario_id)
    return listar_metas(usuario_id)

@router.post("/metas", response_model=MetaResponse, status_code=201)
def agregar_meta(usuario_id: int, datos: MetaCreate):
    _usuario_o_404(usuario_id)
    _validar_meta(usuario_id, datos.materia_id, datos.unidad_ids, datos.fecha)
    return crear_meta(usuario_id, datos.materia_id, datos.fecha, datos.hora, datos.unidad_ids)

@router.patch("/metas/{meta_id}", response_model=MetaResponse)
def cambiar_meta(usuario_id: int, meta_id: int, datos: MetaUpdate):
    meta = _meta_o_404(usuario_id, meta_id)
    cambios = datos.model_dump(exclude_unset=True)
    # se valida cómo queda la meta completa (ej. si cambia la materia, las unidades tienen que ser de la nueva)
    _validar_meta(
        usuario_id,
        cambios.get("materia_id", meta["materia_id"]),
        cambios.get("unidad_ids", [u["id"] for u in meta["unidades"]]),
        cambios.get("fecha"),
    )
    return editar_meta(usuario_id, meta_id, cambios)

@router.delete("/metas/{meta_id}", status_code=204)
def borrar_meta(usuario_id: int, meta_id: int):
    if not eliminar_meta(usuario_id, meta_id):
        raise HTTPException(status_code=404, detail="Meta no encontrada")

# ---------- planes de estudio ----------

@router.post("/planes", response_model=PlanesResponse)
def planes(usuario_id: int, datos: PlanCreate):
    meta, materia, unidades = _que_estudiar(usuario_id, datos.meta_id, datos.materia_id, datos.unidad_id)
    hoy = ahora_local().date()
    if meta:
        try:
            desde, hasta = rango_para_meta(meta["fecha"], hoy, datos.desde, datos.hasta)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        desde, hasta = datos.desde, datos.hasta
        if hasta < hoy:
            raise HTTPException(status_code=400, detail="El rango ya pasó")
    franja = obtener_preferencias(usuario_id)
    hora_inicio = datos.hora_inicio if datos.hora_inicio is not None else franja["hora_inicio"]
    hora_fin = datos.hora_fin if datos.hora_fin is not None else franja["hora_fin"]
    if hora_fin <= hora_inicio:
        raise HTTPException(status_code=422, detail="hora_fin tiene que ser mayor que hora_inicio")
    return generar_planes(usuario_id, materia, unidades, datos.horas, desde, hasta,
                          hora_inicio, hora_fin, meta["id"] if meta else None)

@router.post("/estudio", response_model=list[EventoResponse], status_code=201)
def agendar_estudio(usuario_id: int, datos: EstudioCreate):
    meta, materia, unidades = _que_estudiar(usuario_id, datos.meta_id, datos.materia_id, datos.unidad_id)
    ahora = ahora_local()
    if any(a_local(b.inicio) < ahora for b in datos.bloques):
        raise HTTPException(status_code=400, detail="Hay bloques que ya pasaron")
    if meta and any(a_local(b.fin).date() >= meta["fecha"] for b in datos.bloques):
        raise HTTPException(status_code=400, detail="Los bloques tienen que ser antes del día del examen")
    try:
        return confirmar_estudio(usuario_id, materia, unidades, [b.model_dump() for b in datos.bloques],
                                 meta["id"] if meta else None)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
