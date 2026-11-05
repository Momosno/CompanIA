import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Si no hay credenciales de Supabase configuradas, proveer un mock en memoria para pruebas locales
class FakeQueryBuilder:
    def __init__(self, table_name: str):
        self.table_name = table_name

    def insert(self, data):
        self.data_to_insert = data
        return self

    def select(self, columns="*"):
        return self

    def update(self, data):
        return self

    def delete(self):
        return self

    def eq(self, column, value):
        return self

    def execute(self):
        class Response:
            data = []
        res = Response()
        res.data = []
        return res

class FakeSupabaseClient:
    def table(self, table_name: str):
        return FakeQueryBuilder(table_name)

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[SUPABASE] Variables SUPABASE_URL / SUPABASE_KEY no configuradas. Iniciando en modo local mock.")
    supabase = FakeSupabaseClient()
else:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[SUPABASE] Error al conectar a Supabase: {e}. Usando mock.")
        supabase = FakeSupabaseClient()
