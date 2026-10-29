from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
vectorstore = Chroma(
    collection_name="Resumenes",
    embedding_function=embeddings,
    persist_directory="./chroma_db",
)