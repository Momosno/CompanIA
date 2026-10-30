from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from app.schemas.documento import (
    DocumentoSubidoResponse, DocumentoListaResponse, DocumentoResponse,
    PreguntaCreate, PreguntaResponse,
)
from app.services.materias import buscar_materia, buscar_unidad
from app.services.documentos import (
    crear_documento, listar_documentos, buscar_documento, eliminar_documento, procesar_documento, _is_mock,
)

router = APIRouter(prefix="/usuarios/{usuario_id}/documentos", tags=["documentos"])

MAX_BYTES = 20 * 1024 * 1024  # 20 MB

@router.post("/", response_model=DocumentoSubidoResponse, status_code=202)
def subir(
    usuario_id: int,
    background_tasks: BackgroundTasks,
    materia_id: int = Form(),
    unidad_id: int | None = Form(None),
    archivo: UploadFile = File(),
):
    contenido = archivo.file.read(MAX_BYTES + 1)
    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 20 MB")
    if not contenido.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="El archivo no es un PDF")

    if buscar_materia(usuario_id, materia_id) is None:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if unidad_id is not None and buscar_unidad(usuario_id, materia_id, unidad_id) is None:
        raise HTTPException(status_code=404, detail="Unidad no encontrada")

    nombre = (archivo.filename or "documento.pdf").replace("\\", "/").split("/")[-1][:200]
    resultado = crear_documento(usuario_id, materia_id, unidad_id, nombre, contenido)
    background_tasks.add_task(procesar_documento, resultado["id"])
    return resultado

@router.get("/", response_model=list[DocumentoListaResponse])
def listar(usuario_id: int, materia_id: int | None = None):
    return listar_documentos(usuario_id, materia_id)

@router.get("/{documento_id}", response_model=DocumentoResponse)
def obtener(usuario_id: int, documento_id: UUID):
    resultado = buscar_documento(usuario_id, str(documento_id))
    if resultado is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return resultado

@router.post("/{documento_id}/preguntas", response_model=PreguntaResponse)
def preguntar(usuario_id: int, documento_id: UUID, pregunta: PreguntaCreate):
    documento = buscar_documento(usuario_id, str(documento_id))
    if documento is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if documento["estado"] != "ready":
        raise HTTPException(status_code=409, detail="El documento todavía no está listo")
    if _is_mock():
        # Mock respuesta local
        return {
            "respuesta": f"Respuesta generada para: '{pregunta.pregunta}' sobre el documento '{documento.get('nombre_original', 'PDF')}'.",
            "paginas": [],
        }
    from app.ia.pdf_questions import responder
    return responder(pregunta.pregunta, str(documento_id))

@router.delete("/{documento_id}", status_code=204)
def eliminar(usuario_id: int, documento_id: UUID):
    if not eliminar_documento(usuario_id, str(documento_id)):
        raise HTTPException(status_code=404, detail="Documento no encontrado")
