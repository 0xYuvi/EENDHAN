from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api import endpoints, x402, execute, mandates
from middleware.rate_limit import RateLimitMiddleware

app = FastAPI(title="AlgoGate AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.include_router(endpoints.router)
app.include_router(x402.router)
app.include_router(execute.router)
app.include_router(mandates.router)


@app.get("/")
async def root():
    return {"message": "AlgoGate AI Backend API is running. See /docs for endpoints."}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
