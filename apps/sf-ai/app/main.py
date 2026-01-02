from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="sf-ai", version="0.1.0")

class ExplainRequest(BaseModel):
    incident_id: str
    evidence: List[str] = []

class ExplainResponse(BaseModel):
    summary: str
    citations: List[int]

@app.get("/health")
async def health():
    return {"ok": True, "service": "sf-ai"}

@app.post("/explain", response_model=ExplainResponse)
async def explain(req: ExplainRequest):
    # Mock LLM: deterministic
    summary = f"Incident {req.incident_id}: found {len(req.evidence)} evidence items."
    citations = list(range(min(3, len(req.evidence))))
    return ExplainResponse(summary=summary, citations=citations)
