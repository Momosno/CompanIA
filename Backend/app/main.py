from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documentos, materias, usuarios

app = FastAPI(title="CompañÍA API")

# Habilitar CORS para permitir peticiones desde el frontend (Next.js en localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(materias.router)
app.include_router(documentos.router)


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "message": "Backend de CompañIA funcionando correctamente",
        "cors": "enabled",
    }
