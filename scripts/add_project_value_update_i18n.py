"""Ergänzt den Hinweis zur Übernahme dokumentierter Werte in Projektvariablen."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"
TEXTS = {
    "de": "Beim Speichern wird auch der aktuelle Wert der Projektvariable aktualisiert.",
    "en": "Saving also updates the current value of the project variable.",
    "es": "Al guardar, también se actualiza el valor actual de la variable del proyecto.",
    "fr": "L'enregistrement met également à jour la valeur actuelle de la variable du projet.",
    "tr": "Kaydetme işlemi proje değişkeninin güncel değerini de günceller.",
    "zh": "保存时也会更新项目变量的当前数值。",
    "ar": "يؤدي الحفظ أيضاً إلى تحديث القيمة الحالية لمتغير المشروع.",
}

for language, text in TEXTS.items():
    path = ROOT / language / "tasks.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("variableInput", {})["projectValueUpdate"] = text
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Hinweis zur Projektwertübernahme in 7 Sprachen ergänzt.")
