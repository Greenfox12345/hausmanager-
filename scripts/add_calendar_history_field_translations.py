import json
from pathlib import Path

translations = {
    "de": {"date": "Datum", "endDate": "Ende"},
    "en": {"date": "Date", "endDate": "End"},
    "es": {"date": "Fecha", "endDate": "Fin"},
    "fr": {"date": "Date", "endDate": "Fin"},
    "tr": {"date": "Tarih", "endDate": "Bitiş"},
    "zh": {"date": "日期", "endDate": "结束"},
    "ar": {"date": "التاريخ", "endDate": "النهاية"},
}

for language, values in translations.items():
    target = Path(f"client/public/locales/{language}/calendar.json")
    payload = json.loads(target.read_text(encoding="utf-8"))
    payload.update(values)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
