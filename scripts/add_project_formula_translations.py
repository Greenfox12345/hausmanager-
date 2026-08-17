import json
from pathlib import Path

translations = {
    "de": {"formula": "Rechenweg", "overrideValue": "Ergebnis überschreiben (optional)", "variableOverride": "Manuell überschrieben"},
    "en": {"formula": "Formula", "overrideValue": "Override result (optional)", "variableOverride": "Manually overridden"},
    "es": {"formula": "Cálculo", "overrideValue": "Sobrescribir resultado (opcional)", "variableOverride": "Sobrescrito manualmente"},
    "fr": {"formula": "Formule", "overrideValue": "Remplacer le résultat (facultatif)", "variableOverride": "Remplacé manuellement"},
    "tr": {"formula": "Hesaplama", "overrideValue": "Sonucu geçersiz kıl (isteğe bağlı)", "variableOverride": "Elle geçersiz kılındı"},
    "zh": {"formula": "计算公式", "overrideValue": "覆盖结果（可选）", "variableOverride": "已手动覆盖"},
    "ar": {"formula": "المعادلة", "overrideValue": "تجاوز النتيجة (اختياري)", "variableOverride": "تم التجاوز يدويًا"},
}

root = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"
for locale, values in translations.items():
    path = root / locale / "plankiste.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("project", {}).update(values)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
