"""
Firebase Storage Service - Persists resume PDFs to Firebase Storage.
Optional: falls back gracefully if Firebase Storage is not configured.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


async def upload_resume(session_id: str, file_path: str) -> bool:
    """Upload a resume PDF to Firebase Storage at resumes/{session_id}.pdf."""
    try:
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(f"resumes/{session_id}.pdf")
        blob.upload_from_filename(file_path, content_type="application/pdf")
        logger.info(f"Uploaded resume {session_id} to Firebase Storage")
        return True
    except Exception as e:
        logger.warning(f"Failed to upload resume {session_id} to Storage: {e}")
        return False


async def download_resume(session_id: str, dest_path: str) -> bool:
    """Download a resume PDF from Firebase Storage to dest_path."""
    try:
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(f"resumes/{session_id}.pdf")
        if not blob.exists():
            logger.info(f"Resume {session_id} not found in Firebase Storage")
            return False
        Path(dest_path).parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(dest_path)
        logger.info(f"Downloaded resume {session_id} from Firebase Storage to {dest_path}")
        return True
    except Exception as e:
        logger.warning(f"Failed to download resume {session_id} from Storage: {e}")
        return False
