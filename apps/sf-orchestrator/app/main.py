from fastapi import FastAPI

app = FastAPI(title="sf-orchestrator")

@app.get("/health")
async def health():
    return {"ok": True, "service": "sf-orchestrator"}
