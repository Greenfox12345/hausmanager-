import json
from pathlib import Path

translations = {
    "de": {"formula": "Rechenweg", "overrideValue": "Ergebnis überschreiben (optional)", "variableOverride": "Manuell überschrieben", "enterVariables": "Variablen eingeben", "locked": "Diese Variable ist gesperrt."},
    "en": {"formula": "Formula", "overrideValue": "Override result (optional)", "variableOverride": "Manually overridden", "enterVariables": "Enter variables", "locked": "This variable is locked."},
    "es": {"formula": "Cálculo", "overrideValue": "Sobrescribir resultado (opcional)", "variableOverride": "Sobrescrito manualmente", "enterVariables": "Introducir variables", "locked": "Esta variable está bloqueada."},
    "fr": {"formula": "Formule", "overrideValue": "Remplacer le résultat (facultatif)", "variableOverride": "Remplacé manuellement", "enterVariables": "Saisir les variables", "locked": "Cette variable est verrouillée."},
    "tr": {"formula": "Hesaplama", "overrideValue": "Sonucu geçersiz kıl (isteğe bağlı)", "variableOverride": "Elle geçersiz kılındı", "enterVariables": "Değişkenleri gir", "locked": "Bu değişken kilitli."},
    "zh": {"formula": "计算公式", "overrideValue": "覆盖结果（可选）", "variableOverride": "已手动覆盖", "enterVariables": "输入变量", "locked": "此变量已锁定。"},
    "ar": {"formula": "المعادلة", "overrideValue": "تجاوز النتيجة (اختياري)", "variableOverride": "تم التجاوز يدويًا", "enterVariables": "إدخال المتغيرات", "locked": "هذا المتغير مقفل."},
}

root = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"
for locale, values in translations.items():
    path = root / locale / "plankiste.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("project", {}).update(values)
    data.setdefault("variables", {})["locked"] = values["locked"]
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
