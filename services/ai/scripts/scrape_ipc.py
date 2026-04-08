"""
Curated IPC section seed data with BNS equivalents.
These are used as reference alongside BNS 2023 sections.
"""
import json
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent.parent / "data" / "raw" / "ipc_sections.json"
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

IPC_SEED_SECTIONS = [
    {"section": "302", "title": "Punishment for murder", "code_type": "IPC",
     "description": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.",
     "punishment": "Death or imprisonment for life, and fine", "keywords": ["murder", "death", "killing"], "bns_equivalent": "103"},
    {"section": "307", "title": "Attempt to murder", "code_type": "IPC",
     "description": "Whoever does any act with such intention or knowledge, and under such circumstances that, if he by that act caused death, he would be guilty of murder, shall be punished with imprisonment of either description for a term which may extend to ten years.",
     "punishment": "Imprisonment up to 10 years and fine", "keywords": ["attempt murder", "assault"], "bns_equivalent": "109"},
    {"section": "323", "title": "Punishment for voluntarily causing hurt", "code_type": "IPC",
     "description": "Whoever, except in the case provided for by section 334, voluntarily causes hurt, shall be punished with imprisonment of either description for a term which may extend to one year, or with fine which may extend to one thousand rupees, or with both.",
     "punishment": "Imprisonment up to 1 year or fine up to Rs 1000", "keywords": ["hurt", "injury", "assault"], "bns_equivalent": "115"},
    {"section": "325", "title": "Punishment for voluntarily causing grievous hurt", "code_type": "IPC",
     "description": "Whoever, except in the cases provided for by sections 335 and 338, voluntarily causes grievous hurt, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
     "punishment": "Imprisonment up to 7 years and fine", "keywords": ["grievous hurt", "serious injury"], "bns_equivalent": "117"},
    {"section": "376", "title": "Punishment for rape", "code_type": "IPC",
     "description": "Whoever commits rape shall be punished with rigorous imprisonment of either description for a term which shall not be less than ten years, but which may extend to imprisonment for life.",
     "punishment": "Rigorous imprisonment not less than 10 years", "keywords": ["rape", "sexual assault"], "bns_equivalent": "64"},
    {"section": "379", "title": "Punishment for theft", "code_type": "IPC",
     "description": "Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.",
     "punishment": "Imprisonment up to 3 years or fine or both", "keywords": ["theft", "steal"], "bns_equivalent": "304"},
    {"section": "392", "title": "Punishment for robbery", "code_type": "IPC",
     "description": "Whoever commits robbery shall be punished with rigorous imprisonment for a term which may extend to ten years, and shall also be liable to fine.",
     "punishment": "Rigorous imprisonment up to 10 years and fine", "keywords": ["robbery", "snatching"], "bns_equivalent": "310"},
    {"section": "420", "title": "Cheating and dishonestly inducing delivery of property", "code_type": "IPC",
     "description": "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
     "punishment": "Imprisonment up to 7 years and fine", "keywords": ["fraud", "cheating", "online fraud", "scam"], "bns_equivalent": "318"},
    {"section": "354", "title": "Assault or criminal force to woman with intent to outrage her modesty", "code_type": "IPC",
     "description": "Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished with imprisonment of either description for a term which shall not be less than one year but which may extend to five years, and shall also be liable to fine.",
     "punishment": "Imprisonment 1-5 years and fine", "keywords": ["molestation", "assault", "woman"], "bns_equivalent": "74"},
    {"section": "506", "title": "Punishment for criminal intimidation", "code_type": "IPC",
     "description": "Whoever commits, the offence of criminal intimidation shall be punished with imprisonment of either description for a term which may extend to two years, or with fine, or with both.",
     "punishment": "Imprisonment up to 2 years or fine or both", "keywords": ["threat", "intimidation"], "bns_equivalent": "351"},
]


def main():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(IPC_SEED_SECTIONS, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(IPC_SEED_SECTIONS)} IPC sections to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
