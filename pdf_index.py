from langchain_text_splitters import RecursiveCharacterTextSplitter
from vectorstore import vectorstore


def indexar_documento(docs, documento_id):
    chunks = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100).split_documents(docs)
    for chunk in chunks:
        chunk.metadata["documento_id"] = documento_id
    ids = [f"{documento_id}-{i}" for i in range(len(chunks))]
    vectorstore.add_documents(chunks, ids=ids)
    return len(chunks)


if __name__ == "__main__":
    from pdf_parser import cargar_pdf  # poné acá el nombre real de tu archivo
    docs = cargar_pdf("02-Funciones.pdf")
    print(indexar_documento(docs, "prueba-1"))