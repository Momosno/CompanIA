import re
from langchain_community.document_loaders import PyPDFLoader

def cargar_pdf(ruta_pdf):
    loader = PyPDFLoader(ruta_pdf, extraction_mode="layout")
    docs = loader.load()

    for doc in docs:
        doc.page_content = re.sub(r"[ \t]+\n", "\n", doc.page_content)
        doc.page_content = re.sub(r"\n{3,}", "\n\n", doc.page_content)
        doc.page_content = re.sub(r"\s+\d+\s*$", "", doc.page_content)

    return docs

if __name__ == "__main__":
    ruta_pdf = "02-Funciones.pdf"
    docs = cargar_pdf(ruta_pdf)
    for doc in docs:
        print(f"[Página {doc.metadata['page_label']}]\n{doc.page_content[:300]}...\n")