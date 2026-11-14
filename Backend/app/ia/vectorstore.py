import os

import dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

dotenv.load_dotenv()

# los vectores se calculan con la API de OpenAI (usa la variable OPENAI_API_KEY)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small", max_retries=8)
vectorstore = Chroma(
    collection_name="Resumenes_openai",  # nombre nuevo: los vectores viejos (bge-m3) no sirven con este modelo
    embedding_function=embeddings,
    # en Railway apuntar al Volume, ej: CHROMA_DIR=/data/chroma_db
    persist_directory=os.getenv("CHROMA_DIR", "./chroma_db"),
)