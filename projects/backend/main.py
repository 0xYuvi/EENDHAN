from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api import endpoints
from api import x402

app = FastAPI(title="AlgoGate AI Backend", version="1.0.0")

# Set up CORS middleware to allow the frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict to frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(endpoints.router)
app.include_router(x402.router)

@app.get("/")
async def root():
    return {"message": "AlgoGate AI Backend API is running. See /docs for endpoints."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
