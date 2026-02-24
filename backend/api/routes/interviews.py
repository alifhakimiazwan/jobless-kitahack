"""
Interview REST API routes.
"""

import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException

from models.schemas import (
    StartInterviewRequest,
    StartInterviewResponse,
    InterviewStatusResponse,
    InterviewConfig,
    InterviewStatus,
    EvaluateResponse,
)
from services.session_manager import session_manager
from services.evaluation_pipeline import run_evaluation

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest):
    """Start a new interview session. Returns session_id to use with WebSocket."""
    config = InterviewConfig(
        candidate_name=request.candidate_name,
        company=request.company,
        position=request.position,
        question_types=request.question_types,
        question_count=request.question_count,
        job_description=request.job_description,
    )

    session = await session_manager.create_session(config)

    return StartInterviewResponse(
        session_id=session.session_id,
        questions_count=len(session.questions),
        status="created",
        message=f"Interview session created with {len(session.questions)} questions",
    )


@router.get("/{session_id}/status", response_model=InterviewStatusResponse)
async def get_interview_status(session_id: str):
    """Get current interview status and progress."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    total = len(session.questions)
    current = session.current_question_index
    progress = int((current / total) * 100) if total > 0 else 0

    if session.status == InterviewStatus.EVALUATED:
        progress = 100

    return InterviewStatusResponse(
        session_id=session.session_id,
        status=session.status,
        phase=session.phase,
        current_question=current,
        total_questions=total,
        progress_percent=progress,
    )


@router.post("/{session_id}/evaluate", response_model=EvaluateResponse)
async def evaluate_interview(session_id: str, background_tasks: BackgroundTasks):
    """Trigger evaluation pipeline for a completed interview."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status not in (InterviewStatus.COMPLETED,):
        raise HTTPException(
            status_code=400,
            detail=f"Interview is {session.status.value}, must be completed to evaluate",
        )

    # Run evaluation in background
    background_tasks.add_task(run_evaluation, session_id)

    return EvaluateResponse(
        session_id=session_id,
        status="evaluating",
        message="Evaluation started. Poll status endpoint for progress.",
    )


@router.get("/{session_id}/feedback")
async def get_feedback(session_id: str):
    """Get the feedback report for an evaluated interview."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == InterviewStatus.EVALUATING:
        return {"status": "evaluating", "message": "Evaluation is still in progress"}

    if session.status != InterviewStatus.EVALUATED:
        raise HTTPException(
            status_code=400,
            detail=f"Interview is {session.status.value}, feedback not available yet",
        )

    feedback = session_manager.get_feedback(session_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return feedback
