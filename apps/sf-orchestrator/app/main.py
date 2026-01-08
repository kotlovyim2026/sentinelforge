from fastapi import FastAPI
import os

app = FastAPI(title="sf-orchestrator")

@app.get("/health")
async def health():
    return {"ok": True, "service": "sf-orchestrator"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
