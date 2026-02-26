"""
Resume API routes - handles resume upload, annotation, and feedback.
"""

import os
import uuid
import logging
import json
from typing import Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pathlib

from agents.resume.feedback_agent import ResumeFeedbackAgent
from config import settings
from google import genai
from services.resume_cache import questions_cache

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.on_event("startup")
async def startup_event():
    """Initialize cache on application startup"""
    logger.info("Resume questions cache initialized")

# Initialize agents
feedback_agent = ResumeFeedbackAgent()

# Create upload directory
UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    target_position: Optional[str] = Form("Software Engineer"),
    target_companies: Optional[str] = Form("Grab,Shopee,Google,AirAsia,TNG Digital")
):
    """
    Upload and process a resume file.
    
    Args:
        file: PDF resume file
        target_position: Target job position
        target_companies: Comma-separated list of target companies
    
    Returns:
        Session info and initial processing status
    """
    try:
        # Debug logging
        logger.info(f"Upload request received - file object: {file}")
        logger.info(f"File type: {type(file)}")
        
        # Check if file exists and has filename
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Get filename safely
        filename = getattr(file, 'filename', None)
        logger.info(f"Filename extracted: {filename}")
        
        if not filename:
            raise HTTPException(status_code=400, detail="File has no filename")
        
        # Validate file type
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique session ID and filename
        session_id = str(uuid.uuid4())
        file_extension = Path(filename).suffix
        safe_filename = f"{session_id}{file_extension}"
        file_path = UPLOAD_DIR / safe_filename
        
        # Save file
        logger.info(f"Saving file to: {file_path}")
        with open(file_path, "wb") as buffer:
            content = await file.read()
            logger.info(f"File content size: {len(content)} bytes")
            buffer.write(content)
        
        logger.info(f"File saved successfully: {file_path.exists()}")
        
        # Parse target companies
        companies_list = [c.strip() for c in target_companies.split(",") if c.strip()]
        
        # Perform document analysis using Gemini Files API directly
        analysis_result = await feedback_agent.analyze_resume_document(
            session_id,
            str(file_path),
            target_position,
            companies_list
        )
        
        # Save potential questions to centralized cache
        potential_questions = analysis_result.get("feedback", {}).get("potential_questions", [])
        if potential_questions:
            questions_cache.set_questions(session_id, potential_questions)
            questions_cache.cleanup_old_sessions()  # Clean up old sessions
            logger.info(f"Saved {len(potential_questions)} potential questions for session {session_id}")
        
        return {
            "session_id": session_id,
            "filename": filename,
            "target_position": target_position,
            "target_companies": companies_list,
            "analysis_result": analysis_result.get("feedback", {}),
            "status": "uploaded"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/analyze/{session_id}")
async def analyze_resume(
    session_id: str,
    target_position: Optional[str] = Form("Software Engineer"),
    target_companies: Optional[str] = Form("Grab,Shopee,Google,AirAsia,TNG Digital")
):
    """
    Perform detailed resume analysis and feedback generation.
    
    Args:
        session_id: Resume session ID from upload
        target_position: Target job position
        target_companies: Comma-separated list of target companies
    
    Returns:
        Comprehensive feedback analysis
    """
    try:
        # Parse target companies
        companies_list = [c.strip() for c in target_companies.split(",") if c.strip()]
        
        # First, get the annotated data (we'd need to store/retrieve this)
        # For now, we'll assume the annotation was done and we can retrieve it
        # In production, you'd store this in a database or session store
        
        # This is a simplified approach - in production you'd retrieve the
        # actual annotated data from storage
        annotation_result = {
            "status": "success",
            "session_id": session_id,
            "data": {
                "personal_info": {
                    "name": "Candidate Name",
                    "email": "email@example.com",
                    "phone": "+60-12-345-6789",
                    "location": "Kuala Lumpur, Malaysia"
                },
                "education": [
                    {
                        "institution": "University Name",
                        "degree": "Bachelor of Computer Science",
                        "year": "2020-2024",
                        "gpa": "3.8"
                    }
                ],
                "experience": [
                    {
                        "company": "Company Name",
                        "position": "Software Engineer Intern",
                        "duration": "Jun 2023 - Aug 2023",
                        "description": "Developed web applications using React and Node.js"
                    }
                ],
                "skills": {
                    "technical": ["Python", "JavaScript", "React", "Node.js"],
                    "soft": ["Communication", "Teamwork", "Problem Solving"]
                },
                "projects": [
                    {
                        "name": "Project Name",
                        "description": "Brief project description",
                        "technologies": ["React", "Node.js", "MongoDB"]
                    }
                ],
                "certifications": []
            }
        }
        
        # Perform detailed analysis
        feedback_result = await feedback_agent.analyze_resume(
            session_id,
            annotation_result,
            target_position,
            companies_list
        )
        
        if feedback_result.get("status") != "success":
            raise HTTPException(
                status_code=500,
                detail=f"Resume analysis failed: {feedback_result.get('message', 'Unknown error')}"
            )
        
        return {
            "session_id": session_id,
            "analysis_result": feedback_result,
            "target_position": target_position,
            "target_companies": companies_list,
            "status": "analyzed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/status/{session_id}")
async def get_resume_status(session_id: str):
    """
    Get the status of a resume processing session.
    
    Args:
        session_id: Resume session ID
    
    Returns:
        Current processing status and available results
    """
    try:
        # In production, you'd check a database or session store
        # For now, return a basic status
        return {
            "session_id": session_id,
            "status": "processed",
            "has_annotation": True,
            "has_analysis": True,
            "created_at": "2024-01-01T00:00:00Z"  # Placeholder
        }
        
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")


@router.delete("/session/{session_id}")
async def cleanup_session(session_id: str):
    """
    Clean up a resume session and associated files.
    
    Args:
        session_id: Resume session ID to clean up
    
    Returns:
        Cleanup confirmation
    """
    try:
        # Find and remove uploaded file
        for file_path in UPLOAD_DIR.glob(f"{session_id}*.pdf"):
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Cleaned up file: {file_path}")
        
        return {
            "session_id": session_id,
            "status": "cleaned",
            "message": "Session cleaned up successfully"
        }
        
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.get("/questions/{session_id}")
async def get_resume_questions(session_id: str):
    """Get cached potential questions for a resume session."""
    
    try:
        questions_data = questions_cache.get_questions(session_id)
        
        if not questions_data:
            raise HTTPException(status_code=404, detail="Questions not found for this session")
        
        return {
            "session_id": session_id,
            "questions": questions_data.get("questions", []),
            "status": "found"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get questions: {str(e)}")


@router.post("/chat/{session_id}")
async def chat_with_resume(session_id: str, request: ChatRequest):
    """Chat with a resume using Gemini Files API."""
    
    try:
        # Find the uploaded resume file
        resume_path = pathlib.Path(f"uploads/resumes/{session_id}.pdf")
        
        if not resume_path.exists():
            raise HTTPException(status_code=404, detail="Resume file not found")
        
        # Initialize Gemini client
        client = genai.Client()
        
        # Upload the file to Gemini Files API
        uploaded_file = client.files.upload(
            file=resume_path,
            config=dict(
                mime_type='application/pdf',
                display_name=f'resume_{session_id}.pdf'
            )
        )
        
        logger.info(f"Resume file uploaded for chat: {uploaded_file.name}")
        
        # Create chat prompt
        prompt = f"""You are a helpful AI assistant that can answer questions about this resume document. 
        The user is asking: "{request.message}"
        
        Please provide a helpful, accurate response based on the resume content. 
        Be specific and reference actual details from the resume when possible.
        If the question is about improvements, provide constructive suggestions.
        Keep your response conversational and helpful."""
        
        # Generate response
        response = client.models.generate_content(
            model=settings.GEMINI_RESUME_MODEL,
            contents=[uploaded_file, prompt]
        )
        
        # Clean up the uploaded file
        client.files.delete(name=uploaded_file.name)
        
        return {
            "response": response.text,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint for resume service."""
    return {
        "status": "healthy",
        "agents": {
            "annotation_agent": annotation_agent.processor is not None,
            "feedback_agent": True
        },
        "upload_dir": str(UPLOAD_DIR),
        "google_api_key_configured": bool(settings.GOOGLE_API_KEY)
    }
