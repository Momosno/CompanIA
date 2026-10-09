from app.core.supabase_client import supabase

def crear_usuario(nombre: str):
    response = supabase.table("usuarios").insert({"nombre": nombre}).execute()
    return response.data[0]

def listar_usuarios():
    response = supabase.table("usuarios").select("*").execute()
    return response.data

def buscar_usuario(usuario_id: int):
    response = supabase.table("usuarios").select("*").eq("id", usuario_id).execute()
    return response.data[0] if response.data else None