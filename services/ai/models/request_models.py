from pydantic import BaseModel, Field


class AnalyzeIncidentRequest(BaseModel):
    incident_story: str = Field(..., min_length=50, max_length=10000)
    station_name: str
    station_code: str
    district: str
    state: str
    officer_name: str
    officer_rank: str
    officer_badge: str
