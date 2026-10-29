import os
import tempfile
import uuid
from datetime import datetime

from app.core.supabase_client import supabase, FakeSupabaseClient

BUCKET = "Documents"

COLUMNAS_LISTA = "id, materia_id, unidad_id, nombre_original, estado, paginas, created_at"
COLUMNAS_DETALLE = (
    "id, materia_id, unidad_id, nombre_original, tamano_bytes, estado, paginas, resumen, error, created_at"
)

# Mock en memoria para cuando no se conecta a Supabase Storage
_mock_documentos = []

def _is_mock():
    return isinstance(supabase, FakeSupabaseClient)

def crear_documento(usuario_id: int, materia_id: int, unidad_id: int | None, nombre_original: str, contenido: bytes):
    documento_id = str(uuid.uuid4())
    ruta = f"{usuario_id}/{documento_id}.pdf"

    if _is_mock():
        doc = {
            "id": documento_id,
            "usuario_id": usuario_id,
            "materia_id": materia_id,
            "unidad_id": unidad_id,
            "nombre_original": nombre_original,
            "storage_path": ruta,
            "tamano_bytes": len(contenido),
            "estado": "pending",
            "paginas": 1,
            "resumen": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
            "_contenido": contenido
        }
        _mock_documentos.append(doc)
        return {"id": documento_id, "estado": "pending"}

    # Con Supabase
    supabase.storage.from_(BUCKET).upload(ruta, contenido, {"content-type": "application/pdf"})
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
    if _is_mock():
        res = [d for d in _mock_documentos if d["usuario_id"] == usuario_id]
        if materia_id is not None:
            res = [d for d in res if d["materia_id"] == materia_id]
        return res

    consulta = (
        supabase.table("documentos")
        .select(COLUMNAS_LISTA)
        .eq("usuario_id", usuario_id)
    )
    if materia_id is not None:
        consulta = consulta.eq("materia_id", materia_id)
    return consulta.order("created_at", desc=True).execute().data

def buscar_documento(usuario_id: int, documento_id: str):
    if _is_mock():
        for d in _mock_documentos:
            if d["id"] == documento_id and d["usuario_id"] == usuario_id:
                return d
        return None

    response = (
        supabase.table("documentos")
        .select(COLUMNAS_DETALLE)
        .eq("id", documento_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    return response.data[0] if response.data else None

def eliminar_documento(usuario_id: int, documento_id: str):
    if _is_mock():
        prev_len = len(_mock_documentos)
        _mock_documentos[:] = [d for d in _mock_documentos if not (d["id"] == documento_id and d["usuario_id"] == usuario_id)]
        return len(_mock_documentos) < prev_len

    response = (
        supabase.table("documentos")
        .select("storage_path")
        .eq("id", documento_id)
        .eq("usuario_id", usuario_id)
        .execute()
    )
    if not response.data:
        return False

    supabase.storage.from_(BUCKET).remove([response.data[0]["storage_path"]])
    try:
        from app.ia.vectorstore import vectorstore
        vectorstore.delete(where={"documento_id": documento_id})
    except Exception:
        pass
    supabase.table("documentos").delete().eq("id", documento_id).execute()
    return True

def procesar_documento(documento_id: str):
    if _is_mock():
        for d in _mock_documentos:
            if d["id"] == documento_id:
                d["estado"] = "ready"
                # Intentar leer paginas con pypdf
                try:
                    import io
                    from pypdf import PdfReader
                    reader = PdfReader(io.BytesIO(d["_contenido"]))
                    d["paginas"] = len(reader.pages)
                    d["resumen"] = f"Resumen generado para {d['nombre_original']} ({len(reader.pages)} páginas)."
                except Exception:
                    d["paginas"] = 1
                    d["resumen"] = f"Resumen generado para {d['nombre_original']}."
                return
        return

    tabla = supabase.table("documentos")
    try:
        tabla.update({"estado": "processing"}).eq("id", documento_id).execute()
        fila = tabla.select("storage_path").eq("id", documento_id).execute().data[0]
        contenido = supabase.storage.from_(BUCKET).download(fila["storage_path"])

        with tempfile.TemporaryDirectory() as carpeta:
            ruta = os.path.join(carpeta, "documento.pdf")
            with open(ruta, "wb") as f:
                f.write(contenido)
            from app.ia.pdf_parser import cargar_pdf
            docs = cargar_pdf(ruta)

        if not any(doc.page_content.strip() for doc in docs):
            raise ValueError("El PDF no tiene texto que se pueda leer (¿es un escaneo?)")

        from app.ia.pdf_index import indexar_documento
        from app.ia.Resuming_Agent import resumir_documento
        indexar_documento(docs, documento_id)
        resumen = resumir_documento(docs)
        tabla.update(
            {"estado": "ready", "paginas": len(docs), "resumen": resumen, "error": None}
        ).eq("id", documento_id).execute()
    except Exception as e:
        tabla.update({"estado": "error", "error": str(e)[:500]}).eq("id", documento_id).execute()
