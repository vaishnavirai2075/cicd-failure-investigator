# backend/main.py
import logging
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import builds, webhooks
from routers.investigations import router as investigations_router
from routers.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CI/CD Failure Investigator",
    description="AI-powered CI/CD failure analysis using LangGraph + Groq",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    logger.info("Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)
    logger.info("Startup complete.")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


app.include_router(webhooks.router, tags=["Webhooks"])
app.include_router(builds.router, tags=["Builds"])
app.include_router(investigations_router, tags=["Investigations"])
app.include_router(chat_router, tags=["Chat"])