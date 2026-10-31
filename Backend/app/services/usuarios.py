from app.core.supabase_client import supabase, FakeSupabaseClient
from app.services.materias import _mock_db, _is_mock
from datetime import datetime

def crear_usuario(nombre: str):
    if _is_mock():
        new_id = len(_mock_db["usuarios"]) + 1
        user = {"id": new_id, "nombre": nombre, "created_at": datetime.now().isoformat()}
        _mock_db["usuarios"].append(user)
        return user

    response = supabase.table("usuarios").insert({"nombre": nombre}).execute()
    return response.data[0]

def listar_usuarios():
    if _is_mock():
        return _mock_db["usuarios"]

    response = supabase.table("usuarios").select("*").execute()
    return response.data

def buscar_usuario(usuario_id: int):
    if _is_mock():
        for u in _mock_db["usuarios"]:
            if u["id"] == usuario_id:
                return u
        return None

    response = supabase.table("usuarios").select("*").eq("id", usuario_id).execute()
    return response.data[0] if response.data else None

def editar_usuario(usuario_id: int, nombre: str):
    if _is_mock():
        u = buscar_usuario(usuario_id)
        if u:
            u["nombre"] = nombre
            return u
        return None

    response = (
        supabase.table("usuarios")
        .update({"nombre": nombre})
        .eq("id", usuario_id)
        .execute()
    )
    return response.data[0] if response.data else None

def eliminar_usuario(usuario_id: int):
    if _is_mock():
        prev = len(_mock_db["usuarios"])
        _mock_db["usuarios"] = [u for u in _mock_db["usuarios"] if u["id"] != usuario_id]
        return len(_mock_db["usuarios"]) < prev

    # sus materias y unidades se borran en cascada (ON DELETE CASCADE en la DB)
    response = supabase.table("usuarios").delete().eq("id", usuario_id).execute()
    return len(response.data) > 0
