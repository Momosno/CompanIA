import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()  # lee el archivo .env y carga sus variables al entorno

SUPABASE_URL = os.getenv("SUPABASE_URL")  # URL del proyecto en Supabase
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # clave de API

# cliente único de supabase, se importa desde acá en el resto del proyecto
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
