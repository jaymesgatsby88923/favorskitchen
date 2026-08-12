from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

admin_supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
user_supabase = create_client(SUPABASE_URL, SUPABASE_KEY)