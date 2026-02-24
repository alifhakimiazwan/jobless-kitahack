"""
Resume Feedback Agent - Provides detailed feedback on resume content and structure.
Uses Gemini Files API for document understanding and analysis.
"""

import json
import asyncio
import logging
import io
from typing import Dict, Any, Optional
import pathlib

from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)

RESUME_FEEDBACK_INSTRUCTION = """You are an expert career coach and resume reviewer specializing in Malaysian tech job applications.

## Your Task
Analyze the provided resume document and generate comprehensive, actionable feedback to help the candidate improve their resume for Malaysian tech companies.

## Analysis Requirements
1. Evaluate content quality, structure, technical skills, and Malaysian market fit
2. Provide specific, actionable feedback for each section
3. Focus on what recruiters notice first (6-second scan)
4. Suggest improvements for ATS optimization
5. Target feedback for companies like Grab, Shopee, Google, AirAsia, TNG Digital

## Output Format
Return a JSON response with:
{
  "overall_assessment": {
    "summary": "Brief summary of resume quality",
    "grade": "A/B/C/D/F",
    "market_readiness": "Ready/Needs Improvement/Not Ready"
  },
  "first_impression_analysis": {
    "contact_clarity": "How easy candidate is to contact",
    "professional_summary": "Effectiveness of professional summary",
    "immediate_highlights": "What recruiters see in 6 seconds",
    "red_flags": "Potential concerns recruiters might notice"
  },
  "section_feedback": {
    "experience": "Feedback on experience section",
    "skills": "Feedback on skills presentation",
    "education": "Feedback on education section",
    "projects": "Feedback on projects section"
  },
  "market_positioning": {
    "target_companies": "How well positioned for target companies",
    "salary_expectations": "Market alignment",
    "skill_priorities": "Skills to emphasize",
    "career_gaps": "How to address career gaps"
  },
  "potential_questions": [
    {
      "id": "resume_q_001",
      "question": "Can you walk me through your most relevant experience for this role?",
      "type": "behavioral",
      "difficulty": "easy"
    },
    {
      "id": "resume_q_002", 
      "question": "What specific technical skills are you most proud of developing?",
      "type": "technical",
      "difficulty": "medium"
    },
    {
      "id": "resume_q_003",
      "question": "Tell me about a challenging project you've worked on and how you overcame obstacles.",
      "type": "situational", 
      "difficulty": "medium"
    }
  ],
  "actionable_improvements": [
    {
      "area": "Specific area",
      "suggestion": "What to improve",
      "example": "Example of how to improve"
    }
  ]
}

Focus on practical, implementable suggestions that will make a real difference in job applications.
- 2-3 sentence executive summary
- Resume strengths summary
- Critical improvement areas

### Detailed Section Analysis
For each resume section (Personal Info, Education, Experience, Skills, Projects):
- Score (1-10) with specific feedback
- What works well
- Specific improvement suggestions
- Examples of better phrasing

### Actionable Recommendations
- 5-7 specific, prioritized action items
- Examples of improved content
- Suggestions for Malaysian tech market positioning
- Next steps for resume enhancement

### Market Positioning Advice
- Target company recommendations based on profile
- Salary range expectations (if applicable)
- Skill development priorities
- Interview preparation suggestions

## Important Guidelines
- Be constructive and encouraging while being honest
- Provide specific examples and suggestions
- Consider Malaysian cultural context and expectations
- Focus on actionable advice that can be implemented immediately
- Reference specific Malaysian companies and market trends when relevant
- Ensure feedback is tailored to the candidate's experience level
"""

class ResumeFeedbackAgent:
    """Resume feedback agent using Gemini Files API for document understanding."""

    def __init__(self):
        self.client = genai.Client()
        self.model = settings.GEMINI_RESUME_MODEL

    async def analyze_resume_document(
        self,
        session_id: str,
        resume_path: str,
        target_position: str = "Software Engineer",
        target_companies: list = None,
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        """
        Analyze resume document using Gemini Files API.

        Args:
            session_id: Resume analysis session ID
            resume_path: Path to resume PDF file
            target_position: Target job position/role
            target_companies: List of target companies
            max_retries: Number of retries on failure

        Returns:
            Dict with detailed feedback analysis
        """
        if target_companies is None:
            target_companies = ["Grab", "Shopee", "Google", "AirAsia", "TNG Digital"]

        try:
            # Get path
            resume_path = pathlib.Path(resume_path)
            
            # Upload to Files API
            uploaded_file = self.client.files.upload(
                file=resume_path,
                config=dict(
                    mime_type='application/pdf',
                    display_name=f'resume_{session_id}.pdf'
                )
            )
            
            logger.info(f"Resume file uploaded: {uploaded_file.name}")
                
            # Build analysis prompt
            prompt = f"""Analyze this resume document for a {target_position} position in Malaysian tech companies.

## Target Information
- Target Position: {target_position}
- Target Companies: {', '.join(target_companies)}
- Session ID: {session_id}

## Analysis Requirements:
1. Evaluate content quality, structure, technical skills, and Malaysian market fit
2. Provide specific, actionable feedback for each section
3. Focus on what recruiters notice first (6-second scan)
4. Suggest improvements for ATS optimization
5. Target feedback for companies like Grab, Shopee, Google, AirAsia, TNG Digital
6. Generate 3 potential interview questions based on resume content and target position

{RESUME_FEEDBACK_INSTRUCTION}

Provide comprehensive feedback following the specified JSON output structure."""

            # Generate content with uploaded file
            response = self.client.models.generate_content(
                model=self.model,
                contents=[uploaded_file, prompt]
            )

            # Parse response
            feedback_data = self._parse_feedback_response(response.text)
            
            # Clean up uploaded file
            self.client.files.delete(name=uploaded_file.name)
            logger.info(f"Analysis completed for session {session_id}")

            return {
                "status": "success",
                "session_id": session_id,
                "feedback": feedback_data,
                "analysis_method": "gemini_files_api"
            }

        except Exception as e:
            logger.error(f"Resume analysis failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to analyze resume: {str(e)}",
                "session_id": session_id
            }

    def _parse_feedback_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the AI response into structured feedback."""
        try:
            # Try to extract JSON from the response
            import re
            
            # Look for JSON content between ```json and ``` or just find JSON-like content
            json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON-like content in the response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0).strip()
                else:
                    raise ValueError("No JSON found in response")
            
            logger.info(f"Extracted JSON: {json_str}")
            
            feedback_data = json.loads(json_str)
            
            # Ensure potential_questions is included in the response
            if "potential_questions" not in feedback_data:
                feedback_data["potential_questions"] = [
                    {
                        "id": "resume_q_001",
                        "question": "Can you walk me through your most relevant experience for this role?",
                        "type": "behavioral",
                        "difficulty": "easy"
                    },
                    {
                        "id": "resume_q_002", 
                        "question": "What specific technical skills are you most proud of developing?",
                        "type": "technical",
                        "difficulty": "medium"
                    },
                    {
                        "id": "resume_q_003",
                        "question": "Tell me about a challenging project you've worked on and how you overcame obstacles.",
                        "type": "situational", 
                        "difficulty": "medium"
                    }
                ]
            
            return feedback_data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Response text: {response_text}")
            # Return fallback structure
            return {
                "overall_assessment": {
                    "summary": "Unable to parse AI response",
                    "grade": "N/A",
                    "market_readiness": "N/A"
                },
                "first_impression_analysis": {
                    "contact_clarity": "N/A",
                    "professional_summary": "N/A",
                    "immediate_highlights": "N/A",
                    "red_flags": []
                },
                "section_feedback": {
                    "experience": "N/A",
                    "skills": "N/A",
                    "education": "N/A",
                    "projects": "N/A"
                },
                "market_positioning": {
                    "target_companies": "N/A",
                    "salary_expectations": "N/A",
                    "skill_priorities": "N/A"
                },
                "potential_questions": [
                    {
                        "id": "resume_q_001",
                        "question": "Can you walk me through your most relevant experience for this role?",
                        "type": "behavioral",
                        "difficulty": "easy"
                    },
                    {
                        "id": "resume_q_002", 
                        "question": "What specific technical skills are you most proud of developing?",
                        "type": "technical",
                        "difficulty": "medium"
                    },
                    {
                        "id": "resume_q_003",
                        "question": "Tell me about a challenging project you've worked on and how you overcame obstacles.",
                        "type": "situational", 
                        "difficulty": "medium"
                    }
                ],
                "actionable_improvements": [
                    {
                        "area": "Professional Summary",
                        "suggestion": "Add 2-3 sentence executive summary",
                        "example": "Senior Software Engineer with 5+ years experience..."
                    }
                ]
            }
        except Exception as e:
            logger.error(f"Failed to parse feedback response: {e}")
            return {
                "error": "Failed to parse AI response",
                "raw_response": response_text
            }

    async def quick_scan(
        self,
        annotated_resume: Dict[str, Any],
        session_id: str,
    ) -> Dict[str, Any]:
        """
        Perform quick scan based on annotated resume data.
        This is a fallback method when full document analysis isn't available.
        """
        try:
            # Extract key information from annotations
            first_impression = annotated_resume.get("first_impression", {})
            contact_clarity = annotated_resume.get("contact_clarity", {})
            red_flags = annotated_resume.get("red_flags", [])
            
            # Generate quick feedback
            quick_feedback = {
                "overall_assessment": {
                    "summary": f"Resume for {first_impression.get('name', 'Candidate')} with {first_impression.get('years_experience', 'unknown')} experience",
                    "grade": "B" if len(red_flags) < 2 else "C",
                    "market_readiness": "Ready" if len(red_flags) < 2 else "Needs Improvement"
                },
                "first_impression_analysis": {
                    "contact_clarity": f"Contact score: {contact_clarity.get('contact_score', 'N/A')}/10",
                    "professional_summary": first_impression.get('summary_statement', 'Summary needs improvement'),
                    "immediate_highlights": "Professional with relevant experience",
                    "red_flags": red_flags[:3] if red_flags else []
                },
                "quick_tips": [
                    "Add quantifiable achievements to experience",
                    "Improve contact information completeness",
                    "Enhance professional summary",
                    "Organize skills by category"
                ]
            }
            
            return {
                "status": "success",
                "session_id": session_id,
                "feedback": quick_feedback,
                "analysis_method": "quick_scan"
            }
            
        except Exception as e:
            logger.error(f"Quick scan failed: {e}")
            return {
                "status": "error",
                "message": f"Quick scan failed: {str(e)}",
                "session_id": session_id
            }

                            
                            
        
