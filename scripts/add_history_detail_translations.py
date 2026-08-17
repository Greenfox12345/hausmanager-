import json
from pathlib import Path

translations = {
    "de": {"itemsTransferred": "{{count}} Artikel übernommen", "changes": "Änderungen"},
    "en": {"itemsTransferred": "{{count}} items transferred", "changes": "Changes"},
    "es": {"itemsTransferred": "{{count}} artículos transferidos", "changes": "Cambios"},
    "fr": {"itemsTransferred": "{{count}} articles transférés", "changes": "Modifications"},
    "tr": {"itemsTransferred": "{{count}} ürün aktarıldı", "changes": "Değişiklikler"},
    "zh": {"itemsTransferred": "已转入 {{count}} 件物品", "changes": "更改"},
    "ar": {"itemsTransferred": "تم نقل {{count}} عنصرًا", "changes": "التغييرات"},
}

for language, values in translations.items():
    target = Path(f"client/public/locales/{language}/history.json")
    payload = json.loads(target.read_text(encoding="utf-8"))
    payload.update(values)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

