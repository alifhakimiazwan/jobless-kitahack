"""
Pydantic models for JobLess.
Used for API validation, agent structured output, and session state.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


# ============================================
# Enums
# ============================================

class InterviewPhase(str, Enum):
    GREETING = "greeting"
    QUESTIONS = "questions"
    CLOSING = "closing"
    COMPLETE = "complete"


class InterviewStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    EVALUATING = "evaluating"
    EVALUATED = "evaluated"
    FAILED = "failed"


class QuestionType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    SITUATIONAL = "situational"
    SYSTEM_DESIGN = "system_design"
    PRODUCT = "product"


# ============================================
# Question Models
# ============================================

class Question(BaseModel):
    """A single interview question from the question bank."""
    id: str
    company: str
    position: str
    type: QuestionType
    difficulty: str = "medium"
    question: str
    follow_ups: List[str] = Field(default_factory=list)
    evaluation_criteria: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


# ============================================
# Session Models
# ============================================

class InterviewConfig(BaseModel):
    """Configuration for starting an interview session."""
    candidate_name: str = Field(min_length=1, max_length=100)
    company: str
    position: str
    question_types: List[QuestionType] = Field(default_factory=lambda: [QuestionType.BEHAVIORAL])
    question_count: int = Field(default=5, ge=3, le=10)
    job_description: Optional[str] = Field(default=None, max_length=5000)
    resume_session_id: Optional[str] = None


class TranscriptEntry(BaseModel):
    """A single transcript entry (question or answer)."""
    role: str  # "interviewer" or "candidate"
    text: str
    question_id: Optional[str] = None
    timestamp: Optional[float] = None


class InterviewSession(BaseModel):
    """Full interview session state."""
    session_id: str
    config: InterviewConfig
    status: InterviewStatus = InterviewStatus.CREATED
    phase: InterviewPhase = InterviewPhase.GREETING
    current_question_index: int = 0
    questions: List[Question] = Field(default_factory=list)
    transcript: List[TranscriptEntry] = Field(default_factory=list)
    jd_summary: Optional[str] = None
    created_at: Optional[float] = None
    completed_at: Optional[float] = None


# ============================================
# Agent Output: Evaluator
# ============================================

class AnswerScore(BaseModel):
    """Score for a single answer dimension."""
    score: int = Field(ge=1, le=10, description="Score from 1-10")
    justification: str = Field(description="Brief justification for the score")


class QuestionEvaluation(BaseModel):
    """Evaluation of a single question-answer pair."""
    question_id: str
    question_text: str
    answer_summary: str = Field(description="Brief summary of what the candidate said")
    relevance: AnswerScore = Field(description="How relevant the answer was to the question")
    depth: AnswerScore = Field(description="Depth and thoroughness of the answer")
    structure: AnswerScore = Field(description="How well-structured the answer was (e.g., STAR method)")
    communication: AnswerScore = Field(description="Clarity and professionalism of communication")
    overall_score: float = Field(description="Weighted average score for this question")
    strengths: List[str] = Field(description="What the candidate did well")
    improvements: List[str] = Field(description="Areas for improvement")


class EvaluationResult(BaseModel):
    """Output schema for the Evaluator Agent."""
    session_id: str
    evaluations: List[QuestionEvaluation] = Field(description="Per-question evaluations")
    overall_score: float = Field(description="Overall interview score (1-10)")


# ============================================
# Agent Output: Feedback Generator
# ============================================

class ActionItem(BaseModel):
    """A specific actionable improvement suggestion."""
    area: str = Field(description="Area of improvement (e.g., 'STAR Method', 'Technical Depth')")
    suggestion: str = Field(description="Specific actionable suggestion")
    example: Optional[str] = Field(default=None, description="Example of how to implement the suggestion")


class FeedbackReport(BaseModel):
    """Output schema for the Feedback Generator Agent."""
    session_id: str
    candidate_name: str
    company: str
    position: str
    overall_score: float = Field(description="Overall score (1-10)")
    overall_grade: str = Field(description="Letter grade: A+, A, B+, B, C+, C, D, F")
    summary: str = Field(description="2-3 sentence overall assessment")
    top_strengths: List[str] = Field(description="Top 3 strengths demonstrated")
    key_improvements: List[str] = Field(description="Top 3 areas for improvement")
    per_question_feedback: List[QuestionEvaluation] = Field(description="Detailed per-question feedback")
    action_items: List[ActionItem] = Field(description="3-5 specific action items")
    encouragement: str = Field(description="Encouraging closing message")


# ============================================
# API Request/Response Models
# ============================================

class StartInterviewRequest(BaseModel):
    """Request to start a new interview."""
    candidate_name: str = Field(min_length=1, max_length=100)
    company: str
    position: str
    question_types: List[QuestionType] = Field(default_factory=lambda: [QuestionType.BEHAVIORAL])
    question_count: int = Field(default=5, ge=3, le=10)
    job_description: Optional[str] = Field(default=None, max_length=5000)
    resume_session_id: Optional[str] = None


class StartInterviewResponse(BaseModel):
    """Response after starting an interview."""
    session_id: str
    questions_count: int
    status: str = "created"
    message: str = "Interview session created"


class InterviewStatusResponse(BaseModel):
    """Response for interview status check."""
    session_id: str
    status: InterviewStatus
    phase: InterviewPhase
    current_question: int
    total_questions: int
    progress_percent: int


class EvaluateRequest(BaseModel):
    """Request to trigger evaluation pipeline."""
    pass


class EvaluateResponse(BaseModel):
    """Response after triggering evaluation."""
    session_id: str
    status: str
    message: str


# ============================================
# WebSocket Message Models
# ============================================

class WSTranscriptMessage(BaseModel):
    type: str = "transcript"
    role: str  # "user" or "agent"
    text: str
    is_final: bool = False


class WSPhaseMessage(BaseModel):
    type: str = "phase"
    phase: InterviewPhase


class WSMetadataMessage(BaseModel):
    type: str = "metadata"
    question_number: int
    total_questions: int


class WSCompleteMessage(BaseModel):
    type: str = "interview_complete"
    session_id: str
