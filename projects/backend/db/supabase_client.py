import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from the .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY inside the .env file")

# Establish and export the Supabase Client
supabase: Client = create_client(url, key)
