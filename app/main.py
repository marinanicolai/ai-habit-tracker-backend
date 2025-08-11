from fastapi import FastAPI

app = FastAPI(title="AI Habit Tracker Backend")

@app.get("/")
def root():
    return {"status": "ok", "service": "AI Habit Tracker API", "docs": "/docs"}
