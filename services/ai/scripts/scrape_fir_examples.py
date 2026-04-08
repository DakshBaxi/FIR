"""
Curated anonymized FIR example patterns for language style.
These help the LLM understand the formal language used in Indian FIRs.
"""
import json
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent.parent / "data" / "raw" / "fir_examples.json"
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

FIR_EXAMPLES = [
    {
        "type": "theft",
        "gist": "On the date and time mentioned above, the complainant was proceeding on foot near the said locality when the accused persons came from behind on a motorcycle and snatched the gold chain weighing approximately 10 grams from the neck of the complainant and fled away on the motorcycle in the northward direction. The complainant raised an alarm but the accused persons managed to escape. The estimated value of the stolen property is approximately Rs. 45,000/-.",
        "action": "On receipt of this information, the matter has been registered as FIR and investigation has been taken up. The area has been cordoned off and teams have been deployed for nabbing the accused. CCTV footage of the area is being examined.",
    },
    {
        "type": "assault",
        "gist": "On the aforesaid date and time, the complainant was present at his residence when the accused person(s) arrived and without any provocation or reason, started abusing and assaulting the complainant with fists and kicks. The accused also threatened to cause further harm if any legal action was taken. As a result of the assault, the complainant sustained injuries on various parts of the body. The complainant was taken to the Government Hospital for medical examination.",
        "action": "On receipt of this complaint, the matter has been registered. The complainant has been sent for medical examination. Investigation is in progress.",
    },
    {
        "type": "fraud",
        "gist": "The complainant states that an unknown person contacted him/her on the phone and falsely represented himself as an official of a reputed bank/government organization and fraudulently induced the complainant to share sensitive banking/personal information including OTP (One Time Password), resulting in unauthorized withdrawal of Rs. [amount] from the complainant's bank account bearing Account No. [redacted]. The complainant did not authorize any such transaction.",
        "action": "On receipt of the complaint, the matter has been registered. Cyber Cell has been informed and investigation is underway. The bank has been informed to freeze any suspicious transactions.",
    },
    {
        "type": "domestic violence",
        "gist": "The complainant states that the accused, who is related to the complainant, has been subjecting the complainant to physical, mental and verbal abuse on a regular basis. On the date and time aforesaid, the accused assaulted the complainant by beating with hands and inflicted injuries on the face and body of the complainant. The accused also threatened to cause grievous harm and driven the complainant out of the matrimonial home.",
        "action": "On receipt of this information, the matter has been duly registered. The complainant has been sent for medical examination. The Protection Officer under the Protection of Women from Domestic Violence Act has been informed. Investigation is in progress.",
    },
]


def main():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(FIR_EXAMPLES, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(FIR_EXAMPLES)} FIR examples to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
