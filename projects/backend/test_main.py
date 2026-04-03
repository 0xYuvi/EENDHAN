from fastapi.testclient import TestClient
from unittest.mock import patch

# Mock supabase BEFORE importing main
with patch('db.supabase_client.supabase') as mock_supabase:
    # Setup mock chain
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{'id': 'mocked-session-id'}]

    from main import app
    import sys

    client = TestClient(app)

    print("--- Testing Premium Endpoint without payment header ---")
    response = client.post("/api/ai/premium-endpoint", json={"resume_text": "I am a very good software engineer with 10 years of experience."})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
