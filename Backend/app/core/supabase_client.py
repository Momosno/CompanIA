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
        import httpx
        from supabase import create_client, Client
        from supabase.lib.client_options import SyncClientOptions

        class _TransporteConReintento(httpx.HTTPTransport):
            # Si una conexión reusada se cortó (ReadError), las lecturas se reintentan una vez.
            # Solo GET: reintentar un insert/update/delete podría duplicar el cambio.
            def handle_request(self, request):
                try:
                    return super().handle_request(request)
                except (httpx.ReadError, httpx.RemoteProtocolError):
                    if request.method != "GET":
                        raise
                    return super().handle_request(request)

        # Un solo cliente HTTP/1.1 compartido por todos los pedidos (FastAPI los atiende en hilos).
        # Con HTTP/2 todos los hilos comparten una misma conexión, y en Windows dio errores
        # intermitentes (WinError 10035) cuando el front pedía varias cosas a la vez.
        _http = httpx.Client(http2=False, timeout=120, follow_redirects=True,
                             transport=_TransporteConReintento())
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY,
                                         options=SyncClientOptions(httpx_client=_http))
    except Exception as e:
        print(f"[SUPABASE] Error al conectar a Supabase: {e}. Usando mock.")
        supabase = FakeSupabaseClient()
