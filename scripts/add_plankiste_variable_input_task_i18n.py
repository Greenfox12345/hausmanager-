"""Ergänzt die Plankisten-Texte für durchlaufbezogene Variablen und Eingabeaufgaben."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

TEXTS = {
    "de": {
        "inputTaskLabel": "In dieser Aufgabe eingeben",
        "inputTaskNone": "Noch keiner Aufgabe zugeordnet",
        "inputScopeLabel": "Gültigkeit",
        "inputScopeFixed": "Feste Projektvorgabe",
        "inputScopeRuntime": "Je Projektdurchlauf eingeben",
    },
    "en": {
        "inputTaskLabel": "Enter in this task",
        "inputTaskNone": "Not assigned to a task yet",
        "inputScopeLabel": "Scope",
        "inputScopeFixed": "Fixed project setting",
        "inputScopeRuntime": "Enter for each project run",
    },
    "es": {
        "inputTaskLabel": "Introducir en esta tarea",
        "inputTaskNone": "Aún no asignada a una tarea",
        "inputScopeLabel": "Ámbito",
        "inputScopeFixed": "Valor fijo del proyecto",
        "inputScopeRuntime": "Introducir en cada ejecución del proyecto",
    },
    "fr": {
        "inputTaskLabel": "Saisir dans cette tâche",
        "inputTaskNone": "Pas encore attribuée à une tâche",
        "inputScopeLabel": "Portée",
        "inputScopeFixed": "Paramètre fixe du projet",
        "inputScopeRuntime": "Saisir pour chaque exécution du projet",
    },
    "tr": {
        "inputTaskLabel": "Bu görevde gir",
        "inputTaskNone": "Henüz bir göreve atanmadı",
        "inputScopeLabel": "Kapsam",
        "inputScopeFixed": "Sabit proje ayarı",
        "inputScopeRuntime": "Her proje çalışması için gir",
    },
    "zh": {
        "inputTaskLabel": "在此任务中输入",
        "inputTaskNone": "尚未分配给任务",
        "inputScopeLabel": "适用范围",
        "inputScopeFixed": "固定项目设定",
        "inputScopeRuntime": "每次项目执行时输入",
    },
    "ar": {
        "inputTaskLabel": "أدخل في هذه المهمة",
        "inputTaskNone": "لم تُسند إلى مهمة بعد",
        "inputScopeLabel": "النطاق",
        "inputScopeFixed": "إعداد ثابت للمشروع",
        "inputScopeRuntime": "أدخل لكل تنفيذ للمشروع",
    },
}

for language, texts in TEXTS.items():
    path = ROOT / language / "plankiste.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("variables", {}).update(texts)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Plankisten-Übersetzungen für Variablen-Eingabeaufgaben wurden in 7 Sprachen ergänzt.")
