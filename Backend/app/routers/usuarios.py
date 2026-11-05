from fastapi import APIRouter, HTTPException
from app.schemas.usuario import UsoResponse, UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.services.usuarios import (
    crear_usuario, listar_usuarios, buscar_usuario, editar_usuario, eliminar_usuario,
)
from app.services.uso import preguntas_restantes

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.post("/", response_model=UsuarioResponse)
def crear(usuario: UsuarioCreate):
    return crear_usuario(usuario.nombre)

@router.get("/", response_model=list[UsuarioResponse])
def listar():
    return listar_usuarios()

@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obtener(usuario_id: int):
    usuario = buscar_usuario(usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.get("/{usuario_id}/uso", response_model=UsoResponse)
def obtener_uso(usuario_id: int):
    if buscar_usuario(usuario_id) is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"restantes": preguntas_restantes(usuario_id)}

@router.put("/{usuario_id}", response_model=UsuarioResponse)
def editar(usuario_id: int, usuario: UsuarioUpdate):
    resultado = editar_usuario(usuario_id, usuario.nombre)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return resultado

@router.delete("/{usuario_id}", status_code=204)
def eliminar(usuario_id: int):
    if not eliminar_usuario(usuario_id):
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
