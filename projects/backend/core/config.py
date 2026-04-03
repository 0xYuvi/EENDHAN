import os
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

# Algorand configuration
ALGOD_ADDRESS = os.environ.get("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.environ.get("ALGOD_TOKEN", "")

# Eendhan Smart Contract configuration
# App Address from TestNet deployment
EENDHAN_APP_ADDRESS = os.environ.get("EENDHAN_APP_ADDRESS", "TPXCOJSONCOKFZDP76S2XR5HU4SISWOXUXFWRSOT2HL3V7TYRCZD7BXWYY")

# Database constants
DEFAULT_ENDPOINT_ID = "00000000-0000-0000-0000-000000000001"
