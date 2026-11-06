from datetime import date, datetime, time, timedelta, timezone

from app.core.supabase_client import supabase
from app.planificador.huecos import calcular_huecos
from app.planificador.planes import armar_planes
from app.services.materias import buscar_materia, buscar_unidad

# Argentina es UTC-3 todo el año (no hay horario de verano)
TZ = timezone(timedelta(hours=-3))

COLUMNAS = "id, titulo, inicio, fin, tipo, materia_id, unidad_id"

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

# ---------- planes de estudio ----------

def generar_planes(usuario_id: int, materia: dict, unidad: dict | None, horas: float,
                   desde: date, hasta: date, hora_inicio: int, hora_fin: int):
    # 1) todo lo que ya ocupa tiempo (eventos "ocupado" y estudio ya agendado)
    ventana_ini = datetime.combine(desde, time.min)
    ventana_fin = datetime.combine(hasta, time.min) + timedelta(days=1)
    filas = _eventos_entre(usuario_id, ventana_ini, ventana_fin, "inicio, fin")
    ocupados = [(a_local(de_base(f["inicio"])), a_local(de_base(f["fin"]))) for f in filas]

    # 2) huecos libres y 3) reparto en 3 planes
    huecos = calcular_huecos(ocupados, desde, hasta, hora_inicio, hora_fin, ahora=ahora_local())
    planes = armar_planes(huecos, horas)

    # las horas vuelven con zona (-03:00) para que el front no tenga que adivinar
    for plan in planes:
        plan["bloques"] = [
            {"inicio": i.replace(tzinfo=TZ), "fin": f.replace(tzinfo=TZ)} for i, f in plan["bloques"]
        ]
    return {
        "materia_id": materia["id"],
        "materia": materia["nombre"],
        "unidad": unidad["nombre_tema"] if unidad else None,
        "horas_solicitadas": horas,
        "desde": desde,
        "hasta": hasta,
        "opciones": planes,
    }

def confirmar_estudio(usuario_id: int, materia: dict, unidad: dict | None, bloques: list[dict]):
    bloques_locales = [(a_local(b["inicio"]), a_local(b["fin"])) for b in bloques]

    # nada puede pisarse con lo que ya hay en la agenda (por si cambió desde que se generó el plan)
    primero = min(i for i, _ in bloques_locales)
    ultimo = max(f for _, f in bloques_locales)
    for fila in _eventos_entre(usuario_id, primero, ultimo, "titulo, inicio, fin"):
        e_ini, e_fin = a_local(de_base(fila["inicio"])), a_local(de_base(fila["fin"]))
        for b_ini, b_fin in bloques_locales:
            if b_ini < e_fin and b_fin > e_ini:
                raise ValueError(
                    f"El bloque del {b_ini:%d/%m %H:%M} se pisa con «{fila['titulo']}». Generá los planes de nuevo."
                )

    titulo = f"Estudiar {materia['nombre']}"
    if unidad:
        titulo += f" – {unidad['nombre_tema']}"
    response = supabase.table("eventos").insert([
        {
            "usuario_id": usuario_id,
            "titulo": titulo,
            "inicio": a_texto_utc(i),
            "fin": a_texto_utc(f),
            "tipo": "estudio",
            "materia_id": materia["id"],
            "unidad_id": unidad["id"] if unidad else None,
        }
        for i, f in sorted(bloques_locales)
    ]).execute()
    return [a_evento(f) for f in response.data]
