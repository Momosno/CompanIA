import os
from datetime import datetime, timedelta, timezone

from app.core.supabase_client import supabase, FakeSupabaseClient

# el cupo se renueva a la medianoche de Argentina, aunque el servidor esté en otra zona
ARGENTINA = timezone(timedelta(hours=-3))

# Mock en memoria para cuando no se conecta a Supabase: {(usuario_id, fecha): cantidad}
_mock_uso = {}

def _is_mock():
    return isinstance(supabase, FakeSupabaseClient)

def _limite():
    return int(os.getenv("DAILY_QUESTION_LIMIT") or 25)

def _hoy():
    return datetime.now(ARGENTINA).date().isoformat()

def _cantidad_usada(usuario_id: int, fecha: str):
    if _is_mock():
        return _mock_uso.get((usuario_id, fecha), 0)

    response = (
        supabase.table("uso_diario")
        .select("cantidad")
        .eq("usuario_id", usuario_id)
        .eq("fecha", fecha)
        .execute()
    )
    return response.data[0]["cantidad"] if response.data else 0

def preguntas_restantes(usuario_id: int):
    return max(0, _limite() - _cantidad_usada(usuario_id, _hoy()))

def registrar_pregunta(usuario_id: int):
    fecha = _hoy()
    cantidad = _cantidad_usada(usuario_id, fecha) + 1

    if _is_mock():
        _mock_uso[(usuario_id, fecha)] = cantidad
    else:
        supabase.table("uso_diario").upsert(
            {"usuario_id": usuario_id, "fecha": fecha, "cantidad": cantidad}
        ).execute()

    return max(0, _limite() - cantidad)
