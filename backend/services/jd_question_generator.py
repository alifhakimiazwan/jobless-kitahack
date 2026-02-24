"""
JD Question Generator - Generates tailored interview questions from a job description.
Uses google.genai.Client directly (not ADK) for a single fast call.
"""

import json
import logging
import uuid
from typing import List, Tuple

from google import genai
from google.genai import types

from models.schemas import Question, QuestionType

logger = logging.getLogger(__name__)

GENERATION_PROMPT = """You are an expert interview question designer. Given a job description, generate {count} interview questions tailored to the specific role, responsibilities, and requirements mentioned.

## Job Description:
{job_description}

## Company: {company}
## Position: {position}

## Requirements:
1. Generate exactly {count} questions
2. Mix question types from: {question_types}
3. Each question should target specific skills, experiences, or competencies mentioned in the JD
4. Include 1-2 follow-up questions per main question
5. Include evaluation criteria relevant to the JD requirements
6. Vary difficulty across the set

## Output Format:
Return a JSON object with exactly this structure:
{{
  "jd_summary": "A 2-3 sentence summary of the key role requirements and what makes this position unique.",
  "questions": [
    {{
      "company": "{company}",
      "position": "{position}",
      "type": "behavioral|technical|situational|system_design|product",
      "difficulty": "easy|medium|hard",
      "question": "The interview question text",
      "follow_ups": ["Follow-up question 1", "Follow-up question 2"],
      "evaluation_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
      "tags": ["relevant", "skill", "tags"]
    }}
  ]
}}

Return ONLY the JSON object, no markdown fences or extra text."""


async def generate_questions_from_jd(
    job_description: str,
    company: str,
    position: str,
    question_types: List[QuestionType],
    count: int,
) -> Tuple[List[Question], str]:
    """
    Generate interview questions tailored to a job description.

    Args:
        job_description: The job description text (max 5000 chars)
        company: Company name
        position: Position title
        question_types: Desired question type mix
        count: Number of questions to generate

    Returns:
        Tuple of (list of Question objects, jd_summary string)

    Raises:
        Exception on generation failure (caller should fall back to static bank)
    """
    type_names = ", ".join(qt.value for qt in question_types)

    prompt = GENERATION_PROMPT.format(
        count=count,
        job_description=job_description[:5000],
        company=company,
        position=position,
        question_types=type_names,
    )

    client = genai.Client()
    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2000,
        ),
    )

    raw_text = response.text.strip()
    # Strip markdown fences if present
    if raw_text.startswith("```"):
        raw_text = raw_text[raw_text.index("\n") + 1 :]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3].strip()

    parsed = json.loads(raw_text)

    jd_summary = parsed.get("jd_summary", "")
    raw_questions = parsed.get("questions", [])

    questions: List[Question] = []
    for i, q in enumerate(raw_questions[:count]):
        # Validate question type
        try:
            q_type = QuestionType(q.get("type", "behavioral"))
        except ValueError:
            q_type = QuestionType.BEHAVIORAL

        questions.append(
            Question(
                id=f"jd-{uuid.uuid4().hex[:8]}",
                company=q.get("company", company),
                position=q.get("position", position),
                type=q_type,
                difficulty=q.get("difficulty", "medium"),
                question=q["question"],
                follow_ups=q.get("follow_ups", []),
                evaluation_criteria=q.get("evaluation_criteria", []),
                tags=q.get("tags", []),
            )
        )

    logger.info(f"Generated {len(questions)} JD-tailored questions for {company}/{position}")
    return questions, jd_summary
