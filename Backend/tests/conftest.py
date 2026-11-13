import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import agenda, cuestionarios, documentos, materias, uso, usuarios


class SupabaseProhibido:
    """Reemplaza al cliente real: si algún test llega a la base sin querer, falla en vez de tocar datos."""

    def table(self, nombre):
        raise AssertionError(f"Un test intentó usar Supabase (tabla '{nombre}'): falta un monkeypatch")

    def __getattr__(self, nombre):
        raise AssertionError(f"Un test intentó usar Supabase ({nombre}): falta un monkeypatch")


@pytest.fixture(autouse=True)
def sin_supabase(monkeypatch):
    for modulo in (agenda, cuestionarios, documentos, materias, uso, usuarios):
        monkeypatch.setattr(modulo, "supabase", SupabaseProhibido(), raising=False)


@pytest.fixture
def client():
    return TestClient(app)
