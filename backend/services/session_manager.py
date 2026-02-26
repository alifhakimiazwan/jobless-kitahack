"""
Session Manager - Manages interview session lifecycle.
In-memory store with optional Firestore persistence.
"""

import time
import uuid
import logging
from typing import Dict, Optional, List

from models.schemas import (
    InterviewSession,
    InterviewConfig,
    InterviewStatus,
    InterviewPhase,
    TranscriptEntry,
    Question,
)
from services.question_bank import question_bank
from services.jd_question_generator import generate_questions_from_jd
from services.resume_cache import questions_cache
from services import firestore_service

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages interview sessions in memory with Firestore backup."""

    def __init__(self):
        self._sessions: Dict[str, InterviewSession] = {}

    async def create_session(self, config: InterviewConfig) -> InterviewSession:
        """Create a new interview session with selected questions."""
        session_id = str(uuid.uuid4())

        questions = []
        jd_summary = None

        # First priority: resume-tailored questions from the resume cache
        if config.resume_session_id:
            cached = questions_cache.get_questions(config.resume_session_id)
            if cached:
                raw_questions = cached.get("questions", [])
                for i, q in enumerate(raw_questions):
                    try:
                        questions.append(Question(
                            id=q.get("id", f"resume-{i}"),
                            company=config.company,
                            position=config.position,
                            type=q.get("type", "behavioral"),
                            difficulty=q.get("difficulty", "medium"),
                            question=q.get("question", ""),
                            follow_ups=[],
                            evaluation_criteria=[],
                            tags=["resume-based"],
                        ))
                    except Exception as e:
                        logger.warning(f"Skipping malformed resume question {i}: {e}")
                logger.info(
                    f"Loaded {len(questions)} resume questions for session {session_id} "
                    f"from resume cache {config.resume_session_id}"
                )

        if not questions and config.job_description:
            try:
                questions, jd_summary = await generate_questions_from_jd(
                    job_description=config.job_description,
                    company=config.company,
                    position=config.position,
                    question_types=config.question_types,
                    count=config.question_count,
                )
                logger.info(f"Generated {len(questions)} JD-tailored questions for session {session_id}")
            except Exception as e:
                logger.warning(f"JD question generation failed, falling back to static bank: {e}")
                questions = []

        if not questions:
            questions = question_bank.select(
                company=config.company,
                position=config.position,
                question_types=config.question_types,
                count=config.question_count,
            )

        session = InterviewSession(
            session_id=session_id,
            config=config,
            status=InterviewStatus.CREATED,
            phase=InterviewPhase.GREETING,
            current_question_index=0,
            questions=questions,
            transcript=[],
            jd_summary=jd_summary,
            created_at=time.time(),
        )

        self._sessions[session_id] = session
        await firestore_service.save_session(session_id, {
            "session_id": session_id,
            "candidate_name": config.candidate_name,
            "company": config.company,
            "position": config.position,
            "status": InterviewStatus.CREATED.value,
            "question_count": len(questions),
            "created_at": session.created_at,
        })
        logger.info(f"Created session {session_id} with {len(questions)} questions")
        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    def update_phase(self, session_id: str, phase: InterviewPhase) -> bool:
        """Update the interview phase."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.phase = phase
        if phase == InterviewPhase.COMPLETE:
            session.status = InterviewStatus.COMPLETED
            session.completed_at = time.time()
        elif phase == InterviewPhase.QUESTIONS:
            session.status = InterviewStatus.IN_PROGRESS
        return True

    def update_status(self, session_id: str, status: InterviewStatus) -> bool:
        """Update the interview status."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.status = status
        return True

    def add_transcript_entry(
        self, session_id: str, role: str, text: str, question_id: Optional[str] = None
    ) -> bool:
        """Add a transcript entry."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        session.transcript.append(TranscriptEntry(
            role=role,
            text=text,
            question_id=question_id,
            timestamp=time.time(),
        ))
        return True

    def get_next_question(self, session_id: str) -> Optional[Question]:
        """Get the next question for a session, advancing the index."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        if session.current_question_index >= len(session.questions):
            return None
        question = session.questions[session.current_question_index]
        session.current_question_index += 1
        return question

    def get_transcript_for_evaluation(self, session_id: str) -> Optional[List[dict]]:
        """Get transcript data formatted for the evaluator agent."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        # Group transcript entries by question
        result = []
        current_question = None
        current_answer_parts = []

        for entry in session.transcript:
            if entry.role == "interviewer" and entry.question_id:
                # Save previous Q&A pair
                if current_question:
                    q_obj = next(
                        (q for q in session.questions if q.id == current_question["question_id"]),
                        None,
                    )
                    result.append({
                        "question": current_question["text"],
                        "question_id": current_question["question_id"],
                        "answer": " ".join(current_answer_parts),
                        "evaluation_criteria": q_obj.evaluation_criteria if q_obj else [],
                    })
                current_question = {"text": entry.text, "question_id": entry.question_id}
                current_answer_parts = []
            elif entry.role == "candidate":
                current_answer_parts.append(entry.text)

        # Don't forget the last Q&A pair
        if current_question:
            q_obj = next(
                (q for q in session.questions if q.id == current_question["question_id"]),
                None,
            )
            result.append({
                "question": current_question["text"],
                "question_id": current_question["question_id"],
                "answer": " ".join(current_answer_parts),
                "evaluation_criteria": q_obj.evaluation_criteria if q_obj else [],
            })

        return result

    def store_feedback(self, session_id: str, feedback: dict) -> bool:
        """Store feedback report for a session."""
        session = self._sessions.get(session_id)
        if not session:
            return False
        # Store as extra attribute via direct dict access
        self._feedback_store = getattr(self, "_feedback_store", {})
        self._feedback_store[session_id] = feedback
        session.status = InterviewStatus.EVALUATED
        return True

    def get_feedback(self, session_id: str) -> Optional[dict]:
        """Get stored feedback for a session."""
        store = getattr(self, "_feedback_store", {})
        return store.get(session_id)

    def list_sessions(self) -> List[dict]:
        """List all sessions with basic info."""
        return [
            {
                "session_id": s.session_id,
                "candidate_name": s.config.candidate_name,
                "company": s.config.company,
                "position": s.config.position,
                "status": s.status.value,
                "created_at": s.created_at,
            }
            for s in self._sessions.values()
        ]


# Singleton
session_manager = SessionManager()
