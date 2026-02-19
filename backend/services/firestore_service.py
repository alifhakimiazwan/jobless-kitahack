"""
Firestore Service - Persists interview sessions and feedback.
Optional: falls back gracefully if Firebase is not configured.
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Firebase is optional - will be None if not configured
_db = None


def init_firestore(credentials_path: str = ""):
    """Initialize Firestore client. Safe to call even without credentials."""
    global _db
    if not credentials_path:
        logger.info("Firestore credentials not configured, using in-memory only")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)

        _db = firestore.client()
        logger.info("Firestore initialized successfully")
    except Exception as e:
        logger.warning(f"Firestore initialization failed: {e}. Using in-memory only.")
        _db = None


async def save_session(session_id: str, data: dict) -> bool:
    """Save session data to Firestore."""
    if not _db:
        return False
    try:
        _db.collection("sessions").document(session_id).set(data)
        return True
    except Exception as e:
        logger.error(f"Failed to save session {session_id}: {e}")
        return False


async def get_session(session_id: str) -> Optional[dict]:
    """Get session data from Firestore."""
    if not _db:
        return None
    try:
        doc = _db.collection("sessions").document(session_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        logger.error(f"Failed to get session {session_id}: {e}")
        return None


async def save_feedback(session_id: str, feedback: dict) -> bool:
    """Save feedback report to Firestore."""
    if not _db:
        return False
    try:
        _db.collection("feedback").document(session_id).set(feedback)
        return True
    except Exception as e:
        logger.error(f"Failed to save feedback {session_id}: {e}")
        return False


async def get_feedback(session_id: str) -> Optional[dict]:
    """Get feedback report from Firestore."""
    if not _db:
        return None
    try:
        doc = _db.collection("feedback").document(session_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        logger.error(f"Failed to get feedback {session_id}: {e}")
        return None


async def update_session_field(session_id: str, field: str, value: Any) -> bool:
    """Update a single field on a session document."""
    if not _db:
        return False
    try:
        _db.collection("sessions").document(session_id).update({field: value})
        return True
    except Exception as e:
        logger.error(f"Failed to update session {session_id}.{field}: {e}")
        return False
