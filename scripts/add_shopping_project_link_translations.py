import json
from pathlib import Path

translations = {
    "de": {"project": "Projekt", "noProject": "Kein Projekt", "task": "Aufgabe", "noTask": "Keine Aufgabe"},
    "en": {"project": "Project", "noProject": "No project", "task": "Task", "noTask": "No task"},
    "es": {"project": "Proyecto", "noProject": "Sin proyecto", "task": "Tarea", "noTask": "Sin tarea"},
    "fr": {"project": "Projet", "noProject": "Aucun projet", "task": "Tâche", "noTask": "Aucune tâche"},
    "tr": {"project": "Proje", "noProject": "Proje yok", "task": "Görev", "noTask": "Görev yok"},
    "zh": {"project": "项目", "noProject": "无项目", "task": "任务", "noTask": "无任务"},
    "ar": {"project": "المشروع", "noProject": "لا يوجد مشروع", "task": "المهمة", "noTask": "لا توجد مهمة"},
}

base = Path("client/public/locales")
for language, values in translations.items():
    path = base / language / "shopping.json"
    data = json.loads(path.read_text())
    data.setdefault("fields", {}).update(values)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
