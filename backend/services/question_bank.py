"""
QuestionBank - Loads and filters interview questions from JSON.
Pure Python utility class, not an LLM agent.
"""

import json
import random
import logging
from pathlib import Path
from typing import List, Optional

from models.schemas import Question, QuestionType

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).parent.parent / "data" / "questions.json"


class QuestionBank:
    """Loads questions.json and provides filtering/selection methods."""

    def __init__(self):
        self.questions: List[Question] = []
        self._companies: List[str] = []
        self._positions: List[str] = []

    def load(self, path: Path = DATA_PATH):
        """Load questions from JSON file."""
        try:
            with open(path, "r") as f:
                raw = json.load(f)
            self.questions = [Question(**q) for q in raw]
            self._companies = sorted(set(q.company for q in self.questions))
            self._positions = sorted(set(q.position for q in self.questions))
            logger.info(f"Loaded {len(self.questions)} questions from {path}")
        except FileNotFoundError:
            logger.warning(f"Questions file not found at {path}, using empty bank")
            self.questions = []
        except Exception as e:
            logger.error(f"Failed to load questions: {e}")
            self.questions = []

    @property
    def companies(self) -> List[str]:
        return self._companies

    @property
    def positions(self) -> List[str]:
        return self._positions

    def filter(
        self,
        company: Optional[str] = None,
        position: Optional[str] = None,
        question_types: Optional[List[QuestionType]] = None,
    ) -> List[Question]:
        """Filter questions by criteria."""
        result = self.questions

        if company:
            result = [q for q in result if q.company.lower() == company.lower()]

        if position:
            result = [q for q in result if q.position.lower() == position.lower()]

        if question_types:
            type_set = set(question_types)
            result = [q for q in result if q.type in type_set]

        return result

    def select(
        self,
        company: Optional[str] = None,
        position: Optional[str] = None,
        question_types: Optional[List[QuestionType]] = None,
        count: int = 5,
    ) -> List[Question]:
        """Select a random subset of questions matching criteria."""
        pool = self.filter(company, position, question_types)

        if not pool:
            # Fallback: try without position filter
            pool = self.filter(company, question_types=question_types)

        if not pool:
            # Fallback: try generic questions
            pool = self.filter(company="Generic Tech", question_types=question_types)
            pool += self.filter(company="Generic Non-Tech", question_types=question_types)

        if not pool:
            # Fallback: any company, just match the requested types
            pool = self.filter(question_types=question_types)

        if not pool:
            # Absolute last resort: any questions
            pool = self.questions

        count = min(count, len(pool))
        return random.sample(pool, count) if pool else []

    def get_positions_for_company(self, company: str) -> List[str]:
        """Get available positions for a company."""
        return sorted(set(
            q.position for q in self.questions
            if q.company.lower() == company.lower()
        ))


# Singleton instance
question_bank = QuestionBank()
