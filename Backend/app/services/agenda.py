from datetime import date, datetime, time, timedelta, timezone

from app.core.supabase_client import supabase
from app.planificador.disponibilidad import expandir_disponibilidad
from app.planificador.huecos import calcular_huecos
from app.planificador.metas import contar_bloques, titulo_estudio
from app.planificador.planes import armar_planes

# Argentina es UTC-3 todo el año (no hay horario de verano)
TZ = timezone(timedelta(hours=-3))

COLUMNAS = "id, titulo, inicio, fin, tipo, materia_id, unidad_id, meta_id, completado"

# ---------- manejo de horas ----------
# Adentro del planificador todo es hora local sin zona; en la base se guarda en UTC.

def ahora_local() -> datetime:
    return datetime.now(TZ).replace(tzinfo=None)

def a_local(dt: datetime) -> datetime:
    # si llega sin zona se asume hora argentina; si llega con zona se convierte
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(TZ).replace(tzinfo=None)

def a_texto_utc(dt_local: datetime) -> str:
    return dt_local.replace(tzinfo=TZ).astimezone(timezone.utc).isoformat()

def de_base(texto: str) -> datetime:
    # lo que devuelve la base (UTC) -> hora argentina con zona, para mostrarlo
    return datetime.fromisoformat(texto).astimezone(TZ)

def a_evento(fila: dict) -> dict:
    return {**fila, "inicio": de_base(fila["inicio"]), "fin": de_base(fila["fin"])}

# ---------- eventos ----------

def crear_evento(usuario_id: int, titulo: str, inicio: datetime, fin: datetime,
                 materia_id: int | None = None, unidad_id: int | None = None):
    response = supabase.table("eventos").insert({
        "usuario_id": usuario_id,
        "titulo": titulo,
        "inicio": a_texto_utc(a_local(inicio)),
        "fin": a_texto_utc(a_local(fin)),
        "tipo": "ocupado",
        "materia_id": materia_id,
        "unidad_id": unidad_id,
    }).execute()
    return a_evento(response.data[0])

def _eventos_entre(usuario_id: int, desde: datetime, hasta: datetime, columnas: str = COLUMNAS):
    # eventos que se pisan con [desde, hasta) (horas locales sin zona)
    response = (
        supabase.table("eventos")
        .select(columnas)
        .eq("usuario_id", usuario_id)
        .lt("inicio", a_texto_utc(hasta))
        .gt("fin", a_texto_utc(desde))
        .order("inicio")
        .execute()
    )
    return response.data

def listar_eventos(usuario_id: int, desde: date | None = None, hasta: date | None = None):
    desde_dt = datetime.combine(desde, time.min) if desde else datetime(2000, 1, 1)
    hasta_dt = datetime.combine(hasta, time.min) + timedelta(days=1) if hasta else datetime(2100, 1, 1)
    return [a_evento(f) for f in _eventos_entre(usuario_id, desde_dt, hasta_dt)]

def eliminar_evento(usuario_id: int, evento_id: int):
    response = (
        supabase.table("eventos")
        .delete()
        .eq("id", evento_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return len(response.data) > 0

# ---------- disponibilidad semanal ----------

COLUMNAS_DISPONIBILIDAD = "id, titulo, dia_semana, hora_inicio, hora_fin"

def _a_disponibilidad(fila: dict) -> dict:
    # la base devuelve las horas como texto ("09:00:00")
    return {**fila,
            "hora_inicio": time.fromisoformat(fila["hora_inicio"]),
            "hora_fin": time.fromisoformat(fila["hora_fin"])}

def listar_disponibilidad(usuario_id: int):
    response = (
        supabase.table("disponibilidad")
        .select(COLUMNAS_DISPONIBILIDAD)
        .eq("usuario_id", usuario_id)
        .order("dia_semana")
        .order("hora_inicio")
        .execute()
    )
    return [_a_disponibilidad(f) for f in response.data]

def crear_disponibilidad(usuario_id: int, titulo: str, dias: list[int], hora_inicio: time, hora_fin: time):
    response = supabase.table("disponibilidad").insert([
        {
            "usuario_id": usuario_id,
            "titulo": titulo,
            "dia_semana": dia,
            "hora_inicio": hora_inicio.isoformat(),
            "hora_fin": hora_fin.isoformat(),
        }
        for dia in sorted(dias)
    ]).execute()
    return [_a_disponibilidad(f) for f in response.data]

def eliminar_disponibilidad(usuario_id: int, disponibilidad_id: int):
    response = (
        supabase.table("disponibilidad")
        .delete()
        .eq("id", disponibilidad_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return len(response.data) > 0

def _ocupados(usuario_id: int, desde: datetime, hasta: datetime):
    """
    Todo lo que ocupa tiempo en [desde, hasta) (horas locales sin zona): eventos de la
    agenda (ocupado y estudio ya agendado) + disponibilidad semanal. -> [(inicio, fin, titulo)]
    """
    ocupados = [
        (a_local(de_base(f["inicio"])), a_local(de_base(f["fin"])), f["titulo"])
        for f in _eventos_entre(usuario_id, desde, hasta, "titulo, inicio, fin")
    ]
    semanal = expandir_disponibilidad(listar_disponibilidad(usuario_id), desde.date(), hasta.date())
    ocupados += [o for o in semanal if o[0] < hasta and o[1] > desde]
    return ocupados

# ---------- planes de estudio ----------

def generar_planes(usuario_id: int, materia: dict, unidades: list[dict], horas: float,
                   desde: date, hasta: date, hora_inicio: int, hora_fin: int,
                   meta_id: int | None = None):
    # 1) todo lo que ya ocupa tiempo (eventos, estudio ya agendado y disponibilidad semanal)
    ventana_ini = datetime.combine(desde, time.min)
    ventana_fin = datetime.combine(hasta, time.min) + timedelta(days=1)
    ocupados = [(i, f) for i, f, _ in _ocupados(usuario_id, ventana_ini, ventana_fin)]

    # 2) huecos libres y 3) reparto en 3 planes
    huecos = calcular_huecos(ocupados, desde, hasta, hora_inicio, hora_fin, ahora=ahora_local())
    planes = armar_planes(huecos, horas)

    # las horas vuelven con zona (-03:00) para que el front no tenga que adivinar
    for plan in planes:
        plan["bloques"] = [
            {"inicio": i.replace(tzinfo=TZ), "fin": f.replace(tzinfo=TZ)} for i, f in plan["bloques"]
        ]
    return {
        "meta_id": meta_id,
        "materia_id": materia["id"],
        "materia": materia["nombre"],
        "unidad": unidades[0]["nombre_tema"] if len(unidades) == 1 else None,
        "unidades": unidades,
        "horas_solicitadas": horas,
        "desde": desde,
        "hasta": hasta,
        "opciones": planes,
    }

def confirmar_estudio(usuario_id: int, materia: dict, unidades: list[dict], bloques: list[dict],
                      meta_id: int | None = None):
    bloques_locales = [(a_local(b["inicio"]), a_local(b["fin"])) for b in bloques]

    # nada puede pisarse con lo que ya hay en la agenda (por si cambió desde que se generó el plan)
    primero = min(i for i, _ in bloques_locales)
    ultimo = max(f for _, f in bloques_locales)
    for e_ini, e_fin, e_titulo in _ocupados(usuario_id, primero, ultimo):
        for b_ini, b_fin in bloques_locales:
            if b_ini < e_fin and b_fin > e_ini:
                raise ValueError(
                    f"El bloque del {b_ini:%d/%m %H:%M} se pisa con «{e_titulo}». Generá los planes de nuevo."
                )

    titulo = titulo_estudio(materia["nombre"], unidades)
    response = supabase.table("eventos").insert([
        {
            "usuario_id": usuario_id,
            "titulo": titulo,
            "inicio": a_texto_utc(i),
            "fin": a_texto_utc(f),
            "tipo": "estudio",
            "materia_id": materia["id"],
            "unidad_id": unidades[0]["id"] if len(unidades) == 1 else None,
            "meta_id": meta_id,
        }
        for i, f in sorted(bloques_locales)
    ]).execute()
    return [a_evento(f) for f in response.data]

# ---------- metas de examen ----------

COLUMNAS_META = ("id, materia_id, fecha, hora, unidad_ids, "
                 "materias(nombre, unidades(id, numero_unidad, nombre_tema))")

def _conteo_bloques(usuario_id: int, meta_ids: list[int]):
    if not meta_ids:
        return {}
    response = (
        supabase.table("eventos")
        .select("meta_id, completado")
        .eq("usuario_id", usuario_id)
        .eq("tipo", "estudio")
        .in_("meta_id", meta_ids)
        .execute()
    )
    return contar_bloques(response.data)

def _a_meta(fila: dict, conteo: dict) -> dict:
    materia = fila.get("materias") or {}
    por_id = {u["id"]: u for u in materia.get("unidades") or []}
    # si se borró alguna unidad de la materia, simplemente deja de aparecer
    unidades = sorted((por_id[i] for i in fila["unidad_ids"] if i in por_id),
                      key=lambda u: u["numero_unidad"])
    total, hechos = conteo.get(fila["id"], (0, 0))
    return {
        "id": fila["id"],
        "materia_id": fila["materia_id"],
        "materia": materia.get("nombre", ""),
        "fecha": date.fromisoformat(fila["fecha"]),
        "hora": time.fromisoformat(fila["hora"]) if fila["hora"] else None,
        "unidades": unidades,
        "bloques_total": total,
        "bloques_completados": hechos,
    }

def listar_metas(usuario_id: int):
    response = (
        supabase.table("metas_examen")
        .select(COLUMNAS_META)
        .eq("usuario_id", usuario_id)
        .order("fecha")
        .order("hora")
        .execute()
    )
    conteo = _conteo_bloques(usuario_id, [f["id"] for f in response.data])
    return [_a_meta(f, conteo) for f in response.data]

def buscar_meta(usuario_id: int, meta_id: int):
    response = (
        supabase.table("metas_examen")
        .select(COLUMNAS_META)
        .eq("id", meta_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not response.data:
        return None
    return _a_meta(response.data[0], _conteo_bloques(usuario_id, [meta_id]))

def _a_fila_meta(datos: dict) -> dict:
    fila = dict(datos)
    if "fecha" in fila:
        fila["fecha"] = fila["fecha"].isoformat()
    if "hora" in fila:
        fila["hora"] = fila["hora"].isoformat() if fila["hora"] else None
    return fila

def crear_meta(usuario_id: int, materia_id: int, fecha: date, hora: time | None, unidad_ids: list[int]):
    response = supabase.table("metas_examen").insert(_a_fila_meta({
        "usuario_id": usuario_id,
        "materia_id": materia_id,
        "fecha": fecha,
        "hora": hora,
        "unidad_ids": unidad_ids,
    })).execute()
    return buscar_meta(usuario_id, response.data[0]["id"])

def editar_meta(usuario_id: int, meta_id: int, cambios: dict):
    (
        supabase.table("metas_examen")
        .update(_a_fila_meta(cambios))
        .eq("id", meta_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return buscar_meta(usuario_id, meta_id)

def eliminar_meta(usuario_id: int, meta_id: int):
    # sus bloques de estudio se borran solos (FK eventos.meta_id con on delete cascade)
    response = (
        supabase.table("metas_examen")
        .delete()
        .eq("id", meta_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return len(response.data) > 0
