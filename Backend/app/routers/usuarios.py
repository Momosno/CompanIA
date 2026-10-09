from fastapi import APIRouter, HTTPException
from app.schemas.usuario import UsuarioCreate, UsuarioResponse
from app.services.usuarios import crear_usuario, listar_usuarios, buscar_usuario

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