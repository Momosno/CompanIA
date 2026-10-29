from fastapi import FastAPI
from app.routers import usuarios, materias, documentos

app = FastAPI(title="CompañÍA API")

app.include_router(usuarios.router)
app.include_router(materias.router)
app.include_router(documentos.router)

@app.get("/")
def health_check():
    return {"status": "ok"}