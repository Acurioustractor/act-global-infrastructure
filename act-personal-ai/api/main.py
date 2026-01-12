"""ACT Farmhand API - FastAPI wrapper for multi-agent system.

Exposes Farmhand agents as REST endpoints for Empathy Ledger integration.

Endpoints:
- POST /impact/calculate-sroi - SROI calculation
- POST /alma/track-signals - ALMA signal tracking
- POST /grants/find-opportunities - Grant matching
- POST /story/analyze-narrative - Narrative arc analysis
- POST /story/analyze-evolution - Thematic evolution
- POST /story/extract-evidence - Impact evidence extraction
- POST /story/check-protocols - Cultural protocol check
- POST /story/refine-draft - Editorial suggestions
- POST /story/suggest-titles - Title suggestions
- POST /story/check-tone - Tone alignment check
- POST /story/discussion-questions - Generate questions
- POST /story/generate-summary - Create summary
- GET /health - Health check

Authentication: Bearer token (API key)
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import asyncio

# Import agents
from agents.impact_agent import ImpactAgent
from agents.alma_agent import ALMAAgent
from agents.grant_agent import GrantAgent
from agents.story_analysis_agent import StoryAnalysisAgent
from agents.story_writing_agent import StoryWritingAgent
from tools.ghl_tool import GHLTool

# Create FastAPI app
app = FastAPI(
    title="ACT Farmhand API",
    description="Multi-agent AI system for Indigenous storytelling and social impact",
    version="1.0.0"
)

# CORS configuration for Empathy Ledger
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://empathy-ledger.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents (lazy loading)
_ghl_tool = None
_impact_agent = None
_alma_agent = None
_grant_agent = None
_story_analysis_agent = None
_story_writing_agent = None


def get_ghl_tool():
    global _ghl_tool
    if _ghl_tool is None:
        _ghl_tool = GHLTool()
    return _ghl_tool


def get_impact_agent():
    global _impact_agent
    if _impact_agent is None:
        _impact_agent = ImpactAgent(get_ghl_tool())
    return _impact_agent


def get_alma_agent():
    global _alma_agent
    if _alma_agent is None:
        _alma_agent = ALMAAgent(get_ghl_tool())
    return _alma_agent


def get_grant_agent():
    global _grant_agent
    if _grant_agent is None:
        _grant_agent = GrantAgent(get_ghl_tool())
    return _grant_agent


def get_story_analysis_agent():
    global _story_analysis_agent
    if _story_analysis_agent is None:
        _story_analysis_agent = StoryAnalysisAgent()
    return _story_analysis_agent


def get_story_writing_agent():
    global _story_writing_agent
    if _story_writing_agent is None:
        _story_writing_agent = StoryWritingAgent()
    return _story_writing_agent


# Authentication
def verify_api_key(authorization: str = Header(None)):
    """Verify API key from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    api_key = authorization.replace("Bearer ", "")
    expected_key = os.environ.get("FARMHAND_API_KEY")

    if not expected_key:
        raise HTTPException(status_code=500, detail="Server configuration error")

    if api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return True


# ============================================================================
# IMPACT AGENT ENDPOINTS
# ============================================================================

class SROIRequest(BaseModel):
    project: str = Field(..., description="Project name (e.g., 'empathy-ledger')")
    investment: float = Field(..., description="Investment amount in dollars")
    outcomes: Dict = Field(..., description="Outcomes achieved (e.g., {'stories_preserved': 50})")


class SROIResponse(BaseModel):
    total_value: float
    sroi_ratio: float
    breakdown: List[Dict]
    interpretation: str


@app.post("/impact/calculate-sroi", response_model=SROIResponse, tags=["Impact"])
async def calculate_sroi(
    request: SROIRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Calculate Social Return on Investment (SROI) for a project.

    Returns:
        total_value: Total social value generated
        sroi_ratio: Value generated per dollar invested
        breakdown: Detailed outcome breakdown
        interpretation: Human-readable assessment
    """
    try:
        agent = get_impact_agent()
        result = await agent.calculate_sroi(
            request.project,
            investment=request.investment,
            outcomes=request.outcomes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ALMA AGENT ENDPOINTS
# ============================================================================

class ALMASignalRequest(BaseModel):
    project: str = Field(..., description="Project name (e.g., 'empathy-ledger')")
    signal_family: Optional[str] = Field(None, description="Specific signal family to track")


@app.post("/alma/track-signals", tags=["ALMA"])
async def track_alma_signals(
    request: ALMASignalRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Track ALMA signals for ethical intelligence and pattern recognition.

    Signal families for Empathy Ledger:
    - cultural_authority: Elder leadership, OCAP compliance, cultural protocols
    - story_health: Storyteller agency, consent patterns, cultural safety
    - knowledge_flow: Story collection, policy influence, community learning
    """
    try:
        agent = get_alma_agent()
        result = await agent.track_signals(request.project)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EthicsCheckRequest(BaseModel):
    action: str = Field(..., description="Action being proposed")
    context: Dict = Field(..., description="Context for ethics check")


@app.post("/alma/check-ethics", tags=["ALMA"])
async def check_ethics(
    request: EthicsCheckRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Check if an action violates ALMA's sacred boundaries.

    Returns:
        allowed: true/false
        violations: List of boundary violations
        recommendation: What to do instead
    """
    try:
        agent = get_alma_agent()
        result = await agent.check_ethics(request.action, request.context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# GRANT AGENT ENDPOINTS
# ============================================================================

class GrantRequest(BaseModel):
    project: str = Field(..., description="Project name")
    keywords: List[str] = Field(..., description="Keywords for grant matching")


@app.post("/grants/find-opportunities", tags=["Grants"])
async def find_grants(
    request: GrantRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Find relevant grant opportunities for a project.

    Returns:
        grants: List of matching grants with relevance scores
    """
    try:
        agent = get_grant_agent()
        result = await agent.find_grants(request.project, keywords=request.keywords)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STORY ANALYSIS AGENT ENDPOINTS
# ============================================================================

class NarrativeArcRequest(BaseModel):
    transcript_text: str = Field(..., description="Full transcript text")
    metadata: Optional[Dict] = Field(None, description="Storyteller context")


@app.post("/story/analyze-narrative", tags=["Story Analysis"])
async def analyze_narrative_arc(
    request: NarrativeArcRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Analyze narrative arc and story structure.

    Returns:
        arc_pattern: Detected pattern (linear_journey, circular_return, etc.)
        key_moments: Critical turning points
        emotional_trajectory: Tone evolution
        cultural_markers: Indigenous storytelling elements
        strengths: What makes the story powerful
    """
    try:
        agent = get_story_analysis_agent()
        result = await agent.analyze_narrative_arc(
            request.transcript_text,
            request.metadata
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ThematicEvolutionRequest(BaseModel):
    transcripts: List[Dict] = Field(..., description="List of transcripts from same storyteller")


@app.post("/story/analyze-evolution", tags=["Story Analysis"])
async def analyze_thematic_evolution(
    request: ThematicEvolutionRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Analyze how storyteller's themes evolve over time.

    Returns:
        theme_trajectory: How themes change
        emerging_themes: New themes appearing
        persistent_themes: Consistent themes
        narrative_growth: Evolution of voice
    """
    try:
        agent = get_story_analysis_agent()
        result = await agent.analyze_thematic_evolution(request.transcripts)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ImpactEvidenceRequest(BaseModel):
    transcript_text: str = Field(..., description="Full transcript")
    themes: List[str] = Field(..., description="Identified themes")


@app.post("/story/extract-evidence", tags=["Story Analysis"])
async def extract_impact_evidence(
    request: ImpactEvidenceRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Extract powerful quotes for impact reporting.

    Returns:
        transformation_quotes: Personal change evidence
        systems_impact_quotes: Policy/systemic change
        cultural_preservation_quotes: Knowledge transmission
        community_connection_quotes: Social capital
        resilience_quotes: Strength evidence
    """
    try:
        agent = get_story_analysis_agent()
        result = await agent.extract_impact_evidence(
            request.transcript_text,
            request.themes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CulturalProtocolRequest(BaseModel):
    transcript_text: str = Field(..., description="Transcript to check")


@app.post("/story/check-protocols", tags=["Story Analysis"])
async def check_cultural_protocols(
    request: CulturalProtocolRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Check for cultural protocol concerns.

    Returns:
        flags: List of protocol concerns
        overall_severity: critical/high/medium/low
        requires_elder_review: true/false
        recommended_action: What to do
    """
    try:
        agent = get_story_analysis_agent()
        result = await agent.check_cultural_protocols(request.transcript_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STORY WRITING AGENT ENDPOINTS
# ============================================================================

class StoryDraftRequest(BaseModel):
    draft_text: str = Field(..., description="Story draft")
    context: Optional[Dict] = Field(None, description="Storyteller context")


@app.post("/story/refine-draft", tags=["Story Writing"])
async def refine_story_draft(
    request: StoryDraftRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Get editorial suggestions for story draft (never full rewrites).

    Returns:
        strengths: What's already working well
        suggestions: Specific improvements
        tone_alignment: Empathy Ledger values check
        cultural_sensitivity: Protocol concerns
    """
    try:
        agent = get_story_writing_agent()
        result = await agent.refine_story_draft(
            request.draft_text,
            request.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TitleSuggestionRequest(BaseModel):
    story_text: str = Field(..., description="Story text")
    count: int = Field(5, description="Number of title options", ge=1, le=10)


@app.post("/story/suggest-titles", tags=["Story Writing"])
async def suggest_titles(
    request: TitleSuggestionRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Generate culturally appropriate title suggestions.

    Returns:
        titles: List of options with rationales
    """
    try:
        agent = get_story_writing_agent()
        result = await agent.suggest_titles(request.story_text, request.count)
        return {"titles": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ToneCheckRequest(BaseModel):
    text: str = Field(..., description="Text to check")


@app.post("/story/check-tone", tags=["Story Writing"])
async def check_tone_alignment(
    request: ToneCheckRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Check tone alignment with Empathy Ledger values.

    Returns:
        alignment_score: excellent/good/fair/needs_work
        flags: List of problematic language patterns
        passed: true/false
    """
    try:
        agent = get_story_writing_agent()
        result = await agent.check_tone_alignment(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DiscussionQuestionsRequest(BaseModel):
    story_text: str = Field(..., description="Story text")
    audience: str = Field("community", description="Target audience: community/funder/research/education")


@app.post("/story/discussion-questions", tags=["Story Writing"])
async def generate_discussion_questions(
    request: DiscussionQuestionsRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Generate discussion questions for storytelling circles.

    Returns:
        questions: List of open-ended reflection prompts
    """
    try:
        agent = get_story_writing_agent()
        result = await agent.generate_discussion_questions(
            request.story_text,
            request.audience
        )
        return {"questions": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SummaryRequest(BaseModel):
    story_text: str = Field(..., description="Story text")
    length: str = Field("medium", description="Summary length: short/medium/long")


@app.post("/story/generate-summary", tags=["Story Writing"])
async def generate_summary(
    request: SummaryRequest,
    authenticated: bool = Depends(verify_api_key)
):
    """
    Generate compelling story summary.

    Returns:
        summary: Summary text (50/150/300 words)
    """
    try:
        agent = get_story_writing_agent()
        result = await agent.generate_summary(request.story_text, request.length)
        return {"summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ACT Farmhand API",
        "version": "1.0.0",
        "agents": {
            "impact": "ready",
            "alma": "ready",
            "grant": "ready",
            "story_analysis": "ready",
            "story_writing": "ready"
        }
    }


@app.get("/", tags=["System"])
async def root():
    """API root - redirect to docs."""
    return {
        "message": "ACT Farmhand API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
