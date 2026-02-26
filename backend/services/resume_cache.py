"""
Centralized cache for resume-generated interview questions.
Extracted here to avoid circular imports between api/routes and services.
"""

import uuid
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ResumeQuestionsCache:
    def __init__(self):
        self.cache_file = Path("data/resume_questions_cache.json")
        self.cache: Dict[str, Any] = {}
        self._load_cache()

    def _load_cache(self):
        if self.cache_file.exists():
            try:
                with open(self.cache_file, "r") as f:
                    self.cache = json.load(f)
                    logger.info(
                        f"Loaded resume questions cache with {len(self.cache)} sessions"
                    )
            except Exception as e:
                logger.error(f"Failed to load cache: {e}")
                self.cache = {}

    def _save_cache(self):
        try:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "w") as f:
                json.dump(self.cache, f, indent=2)
                logger.info(
                    f"Saved resume questions cache with {len(self.cache)} sessions"
                )
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def set_questions(self, session_id: str, questions: List[Any]):
        self.cache[session_id] = {
            "questions": questions,
            "timestamp": str(uuid.uuid4()),
        }
        self._save_cache()

    def get_questions(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.cache.get(session_id)

    def cleanup_old_sessions(self, max_sessions: int = 100):
        if len(self.cache) > max_sessions:
            sorted_sessions = sorted(
                self.cache.items(),
                key=lambda x: x[1].get("timestamp", ""),
            )
            self.cache = dict(sorted_sessions[-max_sessions:])
            self._save_cache()


# Singleton
questions_cache = ResumeQuestionsCache()
