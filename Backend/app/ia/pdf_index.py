from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.ia.vectorstore import vectorstore


def indexar_documento(docs, documento_id, materia_id, unidad_id, nombre_documento):
    chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100).split_documents(docs)
    for chunk in chunks:
        chunk.metadata["documento_id"] = documento_id
        chunk.metadata["materia_id"] = int(materia_id)
        chunk.metadata["unidad_id"] = unidad_id
        chunk.metadata["nombre_documento"] = nombre_documento
    ids = [f"{documento_id}-{i}" for i in range(len(chunks))]
    vectorstore.add_documents(chunks, ids=ids)
    return len(chunks)


if __name__ == "__main__":
    # prueba local, desde Backend/:  python -m app.ia.pdf_index
    from app.ia.pdf_parser import cargar_pdf
    docs = cargar_pdf("02-Funciones.pdf")
    print(indexar_documento(docs, "prueba-1", 1, None, "02-Funciones.pdf"))