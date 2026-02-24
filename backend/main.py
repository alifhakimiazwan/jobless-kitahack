"""
JobLess - AI-Powered Interview Practice Platform
Main FastAPI application entry point.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv

load_dotenv()

if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

from config import settings
from services.question_bank import question_bank

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting JobLess backend...")

    # Load question bank
    question_bank.load()
    logger.info(f"Loaded {len(question_bank.questions)} interview questions")

    logger.info(f"{settings.APP_NAME} backend started")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    yield

    logger.info("Shutting down JobLess backend...")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered voice interview practice platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "An error occurred",
        },
    )


# Include routers
from api.routes.interviews import router as interviews_router
from api.routes.questions import router as questions_router
from api.routes.resume import router as resume_router
from api.websocket.interview_ws import router as ws_router

app.include_router(interviews_router, prefix="/api/v1/interviews", tags=["interviews"])
app.include_router(questions_router, prefix="/api/v1/questions", tags=["questions"])
app.include_router(resume_router, prefix="/api/v1/resume", tags=["resume"])
app.include_router(ws_router, tags=["websocket"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
