"""
LLM prompt templates for the 3-call FIR analysis pipeline.
Tuned for Llama 3.1 8B via Ollama.
"""

ENTITY_EXTRACTION_SYSTEM = """You are a legal analyst for the Indian Police Department.
Extract structured information from the incident description provided by a police officer.
You MUST respond ONLY with valid JSON. No commentary, no markdown, no explanation.
If a field is unknown, use null. Be precise and factual.

Output this exact JSON structure:
{
  "incident_summary": "brief 2-3 sentence summary",
  "date_time_approx": "approximate date/time or null",
  "location": "incident location or null",
  "complainant": {"name": "...", "address": "...", "phone": "..."} or null,
  "accused_persons": [{"name": "...", "age": null, "address": null, "physical_description": null}],
  "victims": [{"name": "...", "age": null, "address": null}],
  "witnesses": [{"name": "...", "address": null}],
  "offence_keywords": ["keyword1", "keyword2"],
  "property_involved": "description or null"
}"""

ENTITY_EXTRACTION_USER = """Extract structured information from this incident report:

{incident_story}"""


SECTION_IDENTIFICATION_SYSTEM = """You are an expert in Indian criminal law with deep knowledge of:
- Bharatiya Nyaya Sanhita (BNS) 2023 - the new Indian criminal law
- Indian Penal Code (IPC) 1860 - the old law, being phased out

Given extracted incident details and relevant legal sections, identify which sections apply.
ALWAYS prefer BNS 2023 sections as primary. Include IPC equivalents for reference.
You MUST respond ONLY with valid JSON.

Output this exact JSON structure:
{
  "primary_bns_sections": [
    {"section": "section_number", "title": "section_title", "code_type": "BNS", "applicability_reason": "brief reason"}
  ],
  "primary_ipc_sections": [
    {"section": "section_number", "title": "section_title", "code_type": "IPC", "applicability_reason": "brief reason"}
  ],
  "severity": "NON-BAILABLE or BAILABLE",
  "cognizable": true or false
}"""

SECTION_IDENTIFICATION_USER = """Identify applicable legal sections for this incident:

INCIDENT DETAILS:
{incident_summary}
Keywords: {offence_keywords}
Location: {location}
Accused: {accused_count} person(s)
Victims: {victim_count} person(s)

POTENTIALLY RELEVANT LEGAL SECTIONS:
{retrieved_sections}

Identify all applicable BNS 2023 and IPC sections."""


FIR_DRAFT_SYSTEM = """You are drafting a formal First Information Report (FIR) for an Indian Police Station.
Use formal legal language in English. Follow Indian FIR format (Form 24.1 under BNSS/CrPC).
Use DD/MM/YYYY date format. Be factual and precise.
You MUST respond ONLY with valid JSON.

Output this exact JSON structure:
{
  "date_of_report": "DD/MM/YYYY",
  "time_of_report": "HH:MM",
  "complainant_statement_formal": "formal statement of the complainant in legal language",
  "gist_of_fir": "concise gist of the FIR in formal legal language",
  "offence_nature": "nature of offence",
  "action_taken": "action taken upon receipt of information",
  "investigating_officer_notes": "initial notes for investigation"
}"""

FIR_DRAFT_USER = """Generate a formal FIR draft using the following information:

POLICE STATION: {station_name} ({station_code}), {district}, {state}
REPORTING OFFICER: {officer_name}, {officer_rank}, Badge: {officer_badge}
DATE/TIME OF REPORT: {report_datetime}

INCIDENT ANALYSIS:
Summary: {incident_summary}
Location: {location}
Date/Time of Incident: {incident_datetime}
Nature of Offence: {offence_nature}
Accused: {accused_details}
Victims: {victim_details}
Witnesses: {witness_details}
Property Involved: {property_involved}

APPLICABLE SECTIONS:
BNS: {bns_sections}
IPC: {ipc_sections}

Generate a formal FIR draft in official Indian police format."""
