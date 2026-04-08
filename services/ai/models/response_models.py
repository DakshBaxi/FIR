from typing import Optional
from pydantic import BaseModel


class PersonDetail(BaseModel):
    name: str
    age: Optional[int] = None
    address: Optional[str] = None
    physical_description: Optional[str] = None


class LegalSectionMatch(BaseModel):
    section: str
    title: str
    code_type: str  # 'IPC' or 'BNS'
    applicability_reason: str


class ExtractedEntities(BaseModel):
    incident_summary: str
    date_time_approx: Optional[str] = None
    location: Optional[str] = None
    complainant: Optional[dict] = None
    accused_persons: list[PersonDetail] = []
    victims: list[PersonDetail] = []
    witnesses: list[PersonDetail] = []
    offence_keywords: list[str] = []
    property_involved: Optional[str] = None


class SectionAnalysis(BaseModel):
    primary_bns_sections: list[LegalSectionMatch] = []
    primary_ipc_sections: list[LegalSectionMatch] = []
    severity: str = "BAILABLE"
    cognizable: bool = True


class FirDraft(BaseModel):
    date_of_report: str
    time_of_report: str
    complainant_statement_formal: str
    gist_of_fir: str
    offence_nature: str
    action_taken: str
    investigating_officer_notes: str


class AnalyzeIncidentResponse(BaseModel):
    entities: ExtractedEntities
    sections: SectionAnalysis
    fir_draft: FirDraft
    fir_content_json: dict  # TipTap-compatible JSON structure
