from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.db.mongodb import db_manager
from app.api import sessions, scenarios, tools, metrics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB connection
    await db_manager.connect()
    yield
    

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Agent Negotiation Simulator API powered by Generative AI",
    version="1.0.0",
    lifespan=lifespan
)

# Enabled CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registered API Routers under /api
app.include_router(sessions.router, prefix=settings.API_V1_STR, tags=["Sessions"])
app.include_router(scenarios.router, prefix=settings.API_V1_STR, tags=["Scenarios"])
app.include_router(tools.router, prefix=settings.API_V1_STR, tags=["Tools"])
app.include_router(metrics.router, prefix=settings.API_V1_STR, tags=["Metrics"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to AI Multi-Agent Negotiation Simulator API",
        "docs": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
