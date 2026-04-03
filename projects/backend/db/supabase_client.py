import os
import sys
from unittest.mock import MagicMock
# Mock pyiceberg to avoid ModuleNotFoundError in Supabase dependencies (analytics feature)
sys.modules["pyiceberg"] = MagicMock()
sys.modules["pyiceberg.catalog"] = MagicMock()
sys.modules["pyiceberg.catalog.rest"] = MagicMock()

from dotenv import load_dotenv
from supabase import create_client, Client

# Load variables from the .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
# Check for multiple possible key names (SERVICE_ROLE_KEY is preferred for backends, followed by ANON_KEY/KEY)
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE_URL and a valid SUPABASE_KEY/SUPABASE_ANON_KEY inside the .env file")

# Establish and export the Supabase Client
supabase: Client = create_client(url, key)
