"""
Questions REST API routes - browse available companies and positions.
"""

from fastapi import APIRouter

from services.question_bank import question_bank

router = APIRouter()


@router.get("/companies")
async def list_companies():
    """List all available companies."""
    return {"companies": question_bank.companies}


@router.get("/positions")
async def list_positions(company: str = ""):
    """List available positions, optionally filtered by company."""
    if company:
        positions = question_bank.get_positions_for_company(company)
    else:
        positions = question_bank.positions
    return {"positions": positions}


@router.get("/stats")
async def question_stats():
    """Get question bank statistics."""
    stats = {}
    for q in question_bank.questions:
        key = q.company
        if key not in stats:
            stats[key] = {"total": 0, "types": {}}
        stats[key]["total"] += 1
        t = q.type.value
        stats[key]["types"][t] = stats[key]["types"].get(t, 0) + 1

    return {"total_questions": len(question_bank.questions), "by_company": stats}
