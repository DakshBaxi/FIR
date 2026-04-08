"""
3-call LangChain pipeline using Ollama (Llama 3.1 8B).

Call 1: Entity Extraction  — raw story → structured entities JSON
Call 2: Section Identification — entities + RAG sections → applicable BNS/IPC sections
Call 3: FIR Draft Generation — all context → formal FIR draft JSON
"""
import json
import re
from datetime import datetime

from langchain_ollama import OllamaLLM
from langchain.schema import HumanMessage, SystemMessage

from config import settings
from models.request_models import AnalyzeIncidentRequest
from models.response_models import (
    AnalyzeIncidentResponse,
    ExtractedEntities,
    SectionAnalysis,
    FirDraft,
)
from services.prompts import (
    ENTITY_EXTRACTION_SYSTEM,
    ENTITY_EXTRACTION_USER,
    SECTION_IDENTIFICATION_SYSTEM,
    SECTION_IDENTIFICATION_USER,
    FIR_DRAFT_SYSTEM,
    FIR_DRAFT_USER,
)
from services.embeddings import get_embedding
from services.retrieval import retrieve_relevant_sections


def get_llm() -> OllamaLLM:
    return OllamaLLM(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.1,  # low temperature for factual/structured output
        format="json",    # Ollama JSON mode forces valid JSON output
    )


def extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Remove markdown code blocks if present
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


def clean_optional_string(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return str(value).strip() or None


def clean_required_string(value: object, fallback: str) -> str:
    cleaned = clean_optional_string(value)
    return cleaned or fallback


def clean_optional_int(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def sanitize_people(raw_people: object) -> list[dict]:
    if not isinstance(raw_people, list):
        return []

    people = []
    for index, person in enumerate(raw_people, start=1):
        if not isinstance(person, dict):
            continue

        name = clean_optional_string(person.get("name"))
        if not name:
            name = f"Unknown Person {index}"

        cleaned_person = {
            "name": name,
            "age": clean_optional_int(person.get("age")),
            "address": clean_optional_string(person.get("address")),
            "physical_description": clean_optional_string(person.get("physical_description")),
        }
        people.append(cleaned_person)

    return people


def sanitize_entities_raw(raw: dict) -> dict:
    complainant = raw.get("complainant")
    if isinstance(complainant, dict):
        complainant = {
            "name": clean_required_string(complainant.get("name"), "Unknown"),
            "address": clean_optional_string(complainant.get("address")),
            "phone": clean_optional_string(complainant.get("phone")),
        }
    else:
        complainant = None

    offence_keywords = raw.get("offence_keywords")
    if isinstance(offence_keywords, list):
        offence_keywords = [str(item).strip() for item in offence_keywords if str(item).strip()]
    else:
        offence_keywords = []

    return {
        "incident_summary": clean_required_string(raw.get("incident_summary"), "Incident summary unavailable."),
        "date_time_approx": clean_optional_string(raw.get("date_time_approx")),
        "location": clean_optional_string(raw.get("location")),
        "complainant": complainant,
        "accused_persons": sanitize_people(raw.get("accused_persons")),
        "victims": sanitize_people(raw.get("victims")),
        "witnesses": sanitize_people(raw.get("witnesses")),
        "offence_keywords": offence_keywords,
        "property_involved": clean_optional_string(raw.get("property_involved")),
    }


def sanitize_sections(raw_sections: object, code_type: str) -> list[dict]:
    if not isinstance(raw_sections, list):
        return []

    cleaned_sections = []
    for item in raw_sections:
        if not isinstance(item, dict):
            continue

        section = clean_optional_string(item.get("section"))
        title = clean_optional_string(item.get("title"))
        if not section or not title:
            continue

        cleaned_sections.append({
            "section": section,
            "title": title,
            "code_type": code_type,
            "applicability_reason": clean_required_string(
                item.get("applicability_reason"),
                "Suggested based on the incident narrative.",
            ),
        })

    return cleaned_sections


def sanitize_sections_raw(raw: dict) -> dict:
    severity = clean_optional_string(raw.get("severity")) or "BAILABLE"
    if severity not in {"BAILABLE", "NON-BAILABLE"}:
        severity = "BAILABLE"

    cognizable = raw.get("cognizable")
    if not isinstance(cognizable, bool):
        cognizable = True

    return {
        "primary_bns_sections": sanitize_sections(raw.get("primary_bns_sections"), "BNS"),
        "primary_ipc_sections": sanitize_sections(raw.get("primary_ipc_sections"), "IPC"),
        "severity": severity,
        "cognizable": cognizable,
    }


def sanitize_fir_draft_raw(raw: dict) -> dict:
    now = datetime.now()
    return {
        "date_of_report": clean_required_string(raw.get("date_of_report"), now.strftime("%d/%m/%Y")),
        "time_of_report": clean_required_string(raw.get("time_of_report"), now.strftime("%H:%M")),
        "complainant_statement_formal": clean_required_string(
            raw.get("complainant_statement_formal"),
            "Complainant statement could not be generated from the incident narrative.",
        ),
        "gist_of_fir": clean_required_string(
            raw.get("gist_of_fir"),
            "Incident gist could not be generated from the incident narrative.",
        ),
        "offence_nature": clean_required_string(raw.get("offence_nature"), "Under determination"),
        "action_taken": clean_required_string(
            raw.get("action_taken"),
            "Information recorded for legal examination and further investigation.",
        ),
        "investigating_officer_notes": clean_required_string(
            raw.get("investigating_officer_notes"),
            "Initial AI output required officer review.",
        ),
    }


def make_paragraph(text: str, attrs: dict | None = None) -> dict:
    paragraph: dict = {"type": "paragraph", "content": [{"type": "text", "text": text}]}
    if attrs:
        paragraph["attrs"] = attrs
    return paragraph


def make_empty_paragraph() -> dict:
    return make_paragraph("")


def format_people(people: list, empty_text: str) -> str:
    if not people:
        return empty_text

    lines = []
    for index, person in enumerate(people, start=1):
        details = [person.name]
        if person.age:
            details.append(f"Age: {person.age}")
        if person.address:
            details.append(f"Address: {person.address}")
        if getattr(person, "physical_description", None):
            details.append(f"Description: {person.physical_description}")
        lines.append(f"{index}. {' | '.join(details)}")
    return "\n".join(lines)


def build_fir_content_json(
    request: AnalyzeIncidentRequest,
    entities: ExtractedEntities,
    sections: SectionAnalysis,
    draft: FirDraft,
) -> dict:
    """
    Build TipTap-compatible JSON document structure for the FIR editor.
    """
    bns_str = ", ".join(
        f"Section {s.section} ({s.title})"
        for s in sections.primary_bns_sections
    ) or "Under determination"
    ipc_str = ", ".join(
        f"Section {s.section} ({s.title})"
        for s in sections.primary_ipc_sections
    ) or "N/A"
    accused_str = format_people(entities.accused_persons, "No accused persons identified at draft stage.")
    victims_str = format_people(entities.victims, "No separate victim details identified.")
    witnesses_str = format_people(entities.witnesses, "No witness details identified.")
    complainant_lines = [
        f"Name: {entities.complainant['name']}" if entities.complainant else f"Name: {request.officer_name}",
        f"Address: {entities.complainant.get('address')}" if entities.complainant and entities.complainant.get("address") else None,
        f"Phone: {entities.complainant.get('phone')}" if entities.complainant and entities.complainant.get("phone") else None,
    ]
    complainant_str = "\n".join(line for line in complainant_lines if line)
    occurrence_str = (
        f"Date and Time of Occurrence: {entities.date_time_approx or 'Not specified'}\n"
        f"Place of Occurrence: {entities.location or 'Not specified'}\n"
        f"Nature of Offence: {draft.offence_nature}\n"
        f"Property Involved: {entities.property_involved or 'No property details recorded'}"
    )
    officer_block = (
        f"Reporting Officer: {request.officer_name}\n"
        f"Rank: {request.officer_rank}\n"
        f"Badge Number: {request.officer_badge}\n"
        f"Police Station: {request.station_name} ({request.station_code}), {request.district}, {request.state}"
    )

    return {
        "type": "doc",
        "content": [
            make_paragraph("FIRST INFORMATION REPORT", {"class": "fir-header"}),
            make_paragraph("Form 24.1 - Draft generated for officer review"),
            make_paragraph("FIR No.: [Auto-assigned on finalization]"),
            make_paragraph(f"Date of Report: {draft.date_of_report} | Time of Report: {draft.time_of_report}"),
            make_empty_paragraph(),
            make_paragraph("1. POLICE STATION DETAILS", {"class": "fir-section-title"}),
            make_paragraph(officer_block),
            make_empty_paragraph(),
            make_paragraph("2. APPLICABLE ACT / SECTION", {"class": "fir-section-title"}),
            make_paragraph(f"BNS 2023: {bns_str}"),
            make_paragraph(f"IPC (Reference): {ipc_str}"),
            make_paragraph(f"Severity: {sections.severity} | Cognizable: {'Yes' if sections.cognizable else 'No'}"),
            make_empty_paragraph(),
            make_paragraph("3. COMPLAINANT DETAILS", {"class": "fir-section-title"}),
            make_paragraph(complainant_str),
            make_empty_paragraph(),
            make_paragraph("4. OCCURRENCE OF OFFENCE", {"class": "fir-section-title"}),
            make_paragraph(occurrence_str),
            make_empty_paragraph(),
            make_paragraph("5. COMPLAINANT STATEMENT", {"class": "fir-section-title"}),
            make_paragraph(draft.complainant_statement_formal),
            make_empty_paragraph(),
            make_paragraph("6. GIST OF FIR", {"class": "fir-section-title"}),
            make_paragraph(draft.gist_of_fir),
            make_paragraph(request.incident_story),
            make_empty_paragraph(),
            make_paragraph("7. ACCUSED DETAILS", {"class": "fir-section-title"}),
            make_paragraph(accused_str),
            make_empty_paragraph(),
            make_paragraph("8. VICTIM DETAILS", {"class": "fir-section-title"}),
            make_paragraph(victims_str),
            make_empty_paragraph(),
            make_paragraph("9. WITNESS DETAILS", {"class": "fir-section-title"}),
            make_paragraph(witnesses_str),
            make_empty_paragraph(),
            make_paragraph("10. ACTION TAKEN BY POLICE", {"class": "fir-section-title"}),
            make_paragraph(draft.action_taken),
            make_empty_paragraph(),
            make_paragraph("11. INVESTIGATING OFFICER NOTES", {"class": "fir-section-title"}),
            make_paragraph(draft.investigating_officer_notes),
            make_empty_paragraph(),
            make_paragraph("12. OFFICER CERTIFICATION", {"class": "fir-section-title"}),
            make_paragraph(
                f"This draft FIR has been prepared for official review by {request.officer_name}, {request.officer_rank} "
                f"(Badge: {request.officer_badge}) at {request.station_name}."
            ),
        ]
    }


async def analyze_incident(request: AnalyzeIncidentRequest) -> AnalyzeIncidentResponse:
    llm = get_llm()

    # ── Call 1: Entity Extraction ──────────────────────────────────────────────
    call1_prompt = f"{ENTITY_EXTRACTION_SYSTEM}\n\n{ENTITY_EXTRACTION_USER.format(incident_story=request.incident_story)}"
    call1_response = await llm.ainvoke(call1_prompt)
    entities_raw = extract_json(call1_response if isinstance(call1_response, str) else str(call1_response))
    entities_raw = sanitize_entities_raw(entities_raw)
    entities = ExtractedEntities(**entities_raw)

    # ── RAG: Retrieve relevant sections ───────────────────────────────────────
    query_text = f"{entities.incident_summary} {' '.join(entities.offence_keywords)}"
    query_embedding = await get_embedding(query_text)
    relevant_sections = retrieve_relevant_sections(query_embedding, entities.offence_keywords)

    sections_text = "\n\n".join(
        f"{s['code_type']} Section {s['section_number']} - {s['section_title']}:\n{s['text'][:500]}"
        for s in relevant_sections
    ) or "No pre-indexed sections available. Use general knowledge of BNS 2023 and IPC."

    # ── Call 2: Section Identification ────────────────────────────────────────
    call2_prompt = SECTION_IDENTIFICATION_SYSTEM + "\n\n" + SECTION_IDENTIFICATION_USER.format(
        incident_summary=entities.incident_summary,
        offence_keywords=", ".join(entities.offence_keywords),
        location=entities.location or "Unknown",
        accused_count=len(entities.accused_persons),
        victim_count=len(entities.victims),
        retrieved_sections=sections_text,
    )
    call2_response = await llm.ainvoke(call2_prompt)
    sections_raw = extract_json(call2_response if isinstance(call2_response, str) else str(call2_response))
    sections_raw = sanitize_sections_raw(sections_raw)
    sections = SectionAnalysis(**sections_raw)

    # ── Call 3: FIR Draft Generation ──────────────────────────────────────────
    now = datetime.now()
    accused_details = "; ".join(
        f"{p.name}" + (f" (age {p.age})" if p.age else "")
        for p in entities.accused_persons
    ) or "Unknown"
    victim_details = "; ".join(p.name for p in entities.victims) or "Not specified"
    witness_details = "; ".join(p.name for p in entities.witnesses) or "None"
    bns_str = ", ".join(f"Sec {s.section} ({s.title})" for s in sections.primary_bns_sections) or "Under determination"
    ipc_str = ", ".join(f"Sec {s.section}" for s in sections.primary_ipc_sections) or "N/A"

    call3_prompt = FIR_DRAFT_SYSTEM + "\n\n" + FIR_DRAFT_USER.format(
        station_name=request.station_name,
        station_code=request.station_code,
        district=request.district,
        state=request.state,
        officer_name=request.officer_name,
        officer_rank=request.officer_rank,
        officer_badge=request.officer_badge,
        report_datetime=now.strftime("%d/%m/%Y %H:%M"),
        incident_summary=entities.incident_summary,
        location=entities.location or "Not specified",
        incident_datetime=entities.date_time_approx or "Not specified",
        offence_nature=", ".join(entities.offence_keywords),
        accused_details=accused_details,
        victim_details=victim_details,
        witness_details=witness_details,
        property_involved=entities.property_involved or "None",
        bns_sections=bns_str,
        ipc_sections=ipc_str,
    )
    call3_response = await llm.ainvoke(call3_prompt)
    draft_raw = extract_json(call3_response if isinstance(call3_response, str) else str(call3_response))
    draft_raw = sanitize_fir_draft_raw(draft_raw)
    fir_draft = FirDraft(**draft_raw)

    # Build TipTap JSON
    fir_content_json = build_fir_content_json(request, entities, sections, fir_draft)

    return AnalyzeIncidentResponse(
        entities=entities,
        sections=sections,
        fir_draft=fir_draft,
        fir_content_json=fir_content_json,
    )
