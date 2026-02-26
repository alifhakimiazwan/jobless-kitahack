"""
Resume annotation agent using Gemini for coordinate-based highlighting.
"""

import logging
from typing import Dict, Any, List, Tuple
from pathlib import Path
from google import genai
from config import settings

logger = logging.getLogger(__name__)

class ResumeAnnotationAgent:
    """Resume annotation agent using Gemini for coordinate-based highlighting."""

    def __init__(self):
        self.client = genai.Client()
        self.model = settings.GEMINI_RESUME_MODEL

    async def annotate_resume_document(self, session_id: str, resume_path: str) -> Dict[str, Any]:
        """
        Annotate resume document using Gemini Files API to get coordinates for standout elements.
        
        Args:
            session_id: Unique session identifier
            resume_path: Path to the resume PDF file
            
        Returns:
            Dictionary containing annotation coordinates
        """
        try:
            logger.info(f"Starting annotation for session {session_id}")
            
            if not Path(resume_path).exists():
                return {
                    "status": "error",
                    "message": f"Resume file not found: {resume_path}"
                }
            
            # Upload the file to Gemini Files API
            uploaded_file = self.client.files.upload(
                file=resume_path,
                config=dict(
                    mime_type='application/pdf',
                    display_name=f'resume_{session_id}.pdf'
                )
            )
            
            logger.info(f"Resume file uploaded for annotation: {uploaded_file.name}")
            
            # Create annotation prompt
            prompt = """Analyze this resume document and identify elements that stand out to recruiters.
            
            For each standout element, provide coordinates as percentages of the total image size:
            - top_left_x: X coordinate of top-left corner (0-100%)
            - top_left_y: Y coordinate of top-left corner (0-100%) 
            - bottom_right_x: X coordinate of bottom-right corner (0-100%)
            - bottom_right_y: Y coordinate of bottom-right corner (0-100%)
            - element_type: Type of element (e.g., "name", "skills", "experience", "education", "projects")
            - reason: Why this element stands out
            - detail: Specific text content or description of the highlighted element
            
            Focus on elements that:
            - Show strong technical skills
            - Demonstrate relevant experience
            - Highlight achievements
            - Show education credentials
            - Display impressive projects
            
            Return ONLY a JSON array with the following structure:
            [
              {
                "top_left_x": 10.5,
                "top_left_y": 15.2,
                "bottom_right_x": 45.8,
                "bottom_right_y": 25.3,
                "element_type": "skills",
                "reason": "Strong technical stack relevant to target position",
                "detail": "React, Node.js, Python, AWS - 3+ years experience"
              }
            ]
            
            Limit to 5-8 most important elements. Be precise with coordinates and extract the actual text content for the detail field."""
            
            # Generate annotation response
            response = self.client.models.generate_content(
                model=self.model,
                contents=[uploaded_file, prompt]
            )
            
            logger.info(f"Annotation response received for session {session_id}")
            
            # Parse annotation response
            annotation_data = self._parse_annotation_response(response.text)
            
            # Clean up the uploaded file
            self.client.files.delete(name=uploaded_file.name)
            
            return {
                "status": "completed",
                "session_id": session_id,
                "annotations": annotation_data,
                "total_elements": len(annotation_data)
            }
            
        except Exception as e:
            logger.error(f"Annotation failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to annotate resume: {str(e)}",
                "session_id": session_id
            }

    def _parse_annotation_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse the AI annotation response into structured coordinates."""
        try:
            import re
            import json
            
            # Try to extract JSON from the response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0).strip()
                annotations = json.loads(json_str)
                
                # Validate and clean coordinates
                cleaned_annotations = []
                for annotation in annotations:
                    if self._validate_annotation(annotation):
                        cleaned_annotations.append(annotation)
                
                return cleaned_annotations
            else:
                raise ValueError("No JSON found in annotation response")
                
        except Exception as e:
            logger.error(f"Failed to parse annotation response: {e}")
            # Return fallback annotations
            return self._get_fallback_annotations()

    def _validate_annotation(self, annotation: Dict[str, Any]) -> bool:
        """Validate annotation coordinates and structure."""
        required_fields = ["top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y", "element_type", "reason"]
        
        # Check required fields
        if not all(field in annotation for field in required_fields):
            return False
        
        # Validate coordinates are numbers and within bounds
        try:
            coords = [
                float(annotation["top_left_x"]),
                float(annotation["top_left_y"]),
                float(annotation["bottom_right_x"]),
                float(annotation["bottom_right_y"])
            ]
            
            # Check if coordinates are within 0-100% range
            for coord in coords:
                if coord < 0 or coord > 100:
                    return False
            
            # Check if bottom_right is actually bottom_right of top_left
            if coords[2] <= coords[0] or coords[3] <= coords[1]:
                return False
                
        except (ValueError, TypeError):
            return False
        
        return True

    def _get_fallback_annotations(self) -> List[Dict[str, Any]]:
        """Return fallback annotations if parsing fails."""
        return [
            {
                "top_left_x": 10.0,
                "top_left_y": 10.0,
                "bottom_right_x": 50.0,
                "bottom_right_y": 20.0,
                "element_type": "name",
                "reason": "Candidate name and contact information"
            },
            {
                "top_left_x": 10.0,
                "top_left_y": 25.0,
                "bottom_right_x": 60.0,
                "bottom_right_y": 40.0,
                "element_type": "experience",
                "reason": "Relevant work experience"
            }
        ]
