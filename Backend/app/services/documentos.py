import os
import tempfile
import uuid

from app.core.supabase_client import supabase
from app.ia.pdf_parser import cargar_pdf
from app.ia.pdf_index import indexar_documento
from app.ia.Resuming_Agent import resumir_documento
from app.ia.vectorstore import vectorstore

BUCKET = "Documents"  # bucket privado de Supabase Storage

COLUMNAS_LISTA = "id, materia_id, unidad_id, nombre_original, estado, paginas, created_at"
COLUMNAS_DETALLE = (
    "id, materia_id, unidad_id, nombre_original, tamano_bytes, estado, paginas, resumen, error, created_at"
)

def crear_documento(usuario_id: int, materia_id: int, unidad_id: int | None, nombre_original: str, contenido: bytes):
    # el id se genera acá para poder armar la ruta del archivo en el bucket
    documento_id = str(uuid.uuid4())
    ruta = f"{usuario_id}/{documento_id}.pdf"

    # paso 1: subir el archivo al bucket
    supabase.storage.from_(BUCKET).upload(ruta, contenido, {"content-type": "application/pdf"})

    # paso 2: guardar la fila; si falla, borrar el archivo para no dejarlo huérfano
    try:
        supabase.table("documentos").insert({
            "id": documento_id,
            "usuario_id": usuario_id,
            "materia_id": materia_id,
            "unidad_id": unidad_id,
            "nombre_original": nombre_original,
            "storage_path": ruta,
            "tamano_bytes": len(contenido),
            "estado": "pending",
        }).execute()
    except Exception:
        supabase.storage.from_(BUCKET).remove([ruta])
        raise

    return {"id": documento_id, "estado": "pending"}

def listar_documentos(usuario_id: int, materia_id: int | None = None):
    consulta = (
        supabase.table("documentos")
        .select(COLUMNAS_LISTA)
        .eq("usuario_id", usuario_id)
    )
    if materia_id is not None:
        consulta = consulta.eq("materia_id", materia_id)
    return consulta.order("created_at", desc=True).execute().data

def buscar_documento(usuario_id: int, documento_id: str):
    response = (
        supabase.table("documentos")
        .select(COLUMNAS_DETALLE)
        .eq("id", documento_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data[0] if response.data else None

def eliminar_documento(usuario_id: int, documento_id: str):
    response = (
        supabase.table("documentos")
        .select("storage_path")
        .eq("id", documento_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not response.data:
        return False  # no existe, o no pertenece a este usuario

    # la base no borra archivos ni vectores solos: hay que sacarlos a mano
    supabase.storage.from_(BUCKET).remove([response.data[0]["storage_path"]])
    vectorstore.delete(where={"documento_id": documento_id})
    supabase.table("documentos").delete().eq("id", documento_id).execute()
    return True

def procesar_documento(documento_id: str):
    # corre en segundo plano después de subir el PDF: deja el resultado en la tabla
    tabla = supabase.table("documentos")
    try:
        tabla.update({"estado": "processing"}).eq("id", documento_id).execute()
        fila = tabla.select("storage_path").eq("id", documento_id).execute().data[0]
        contenido = supabase.storage.from_(BUCKET).download(fila["storage_path"])

        # PyPDFLoader necesita una ruta en disco: se usa una carpeta temporal
        with tempfile.TemporaryDirectory() as carpeta:
            ruta = os.path.join(carpeta, "documento.pdf")
            with open(ruta, "wb") as f:
                f.write(contenido)
            docs = cargar_pdf(ruta)

        if not any(doc.page_content.strip() for doc in docs):
            raise ValueError("El PDF no tiene texto que se pueda leer (¿es un escaneo?)")

        indexar_documento(docs, documento_id)
        resumen = resumir_documento(docs)
        tabla.update(
            {"estado": "ready", "paginas": len(docs), "resumen": resumen, "error": None}
        ).eq("id", documento_id).execute()
    except Exception as e:
        tabla.update({"estado": "error", "error": str(e)[:500]}).eq("id", documento_id).execute()
