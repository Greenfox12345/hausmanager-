import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

PLANKISTE = {
    "de": {
        "projectStructure": "Projektstruktur",
        "projectStructureDesc": "Projektvariablen werden aus den zugeordneten Aufgaben erkannt und können hier gepflegt werden.",
        "variablesEnabledHint": "VAR-Namen in Aufgaben und Beschreibungen werden erkannt und aufgelöst.",
        "variablesDisabledHint": "Aufgaben werden ohne Variablenerkennung angezeigt.",
        "noRecognizedVariables": "Noch keine Variablen erkannt. Verwenden Sie zum Beispiel VARBreite in einer Projektaufgabe oder deren Beschreibung.",
    },
    "en": {
        "projectStructure": "Project structure",
        "projectStructureDesc": "Project variables are recognized from assigned tasks and can be managed here.",
        "variablesEnabledHint": "VAR names in tasks and descriptions are recognized and resolved.",
        "variablesDisabledHint": "Tasks are shown without variable recognition.",
        "noRecognizedVariables": "No variables recognized yet. For example, use VARWidth in a project task or its description.",
    },
    "es": {
        "projectStructure": "Estructura del proyecto",
        "projectStructureDesc": "Las variables del proyecto se reconocen a partir de las tareas asignadas y se pueden gestionar aquí.",
        "variablesEnabledHint": "Se reconocen y resuelven los nombres VAR en tareas y descripciones.",
        "variablesDisabledHint": "Las tareas se muestran sin reconocimiento de variables.",
        "noRecognizedVariables": "Aún no se han reconocido variables. Por ejemplo, use VARAncho en una tarea del proyecto o en su descripción.",
    },
    "fr": {
        "projectStructure": "Structure du projet",
        "projectStructureDesc": "Les variables du projet sont reconnues à partir des tâches associées et peuvent être gérées ici.",
        "variablesEnabledHint": "Les noms VAR dans les tâches et descriptions sont reconnus et résolus.",
        "variablesDisabledHint": "Les tâches sont affichées sans reconnaissance des variables.",
        "noRecognizedVariables": "Aucune variable reconnue pour le moment. Utilisez par exemple VARLargeur dans une tâche du projet ou sa description.",
    },
    "tr": {
        "projectStructure": "Proje yapısı",
        "projectStructureDesc": "Proje değişkenleri atanan görevlerden algılanır ve burada yönetilebilir.",
        "variablesEnabledHint": "Görevlerdeki ve açıklamalardaki VAR adları algılanır ve çözülür.",
        "variablesDisabledHint": "Görevler değişken algılama olmadan gösterilir.",
        "noRecognizedVariables": "Henüz değişken algılanmadı. Örneğin bir proje görevinde veya açıklamasında VARGenişlik kullanın.",
    },
    "zh": {
        "projectStructure": "项目结构",
        "projectStructureDesc": "项目变量会从已关联的任务中识别，并可在此处维护。",
        "variablesEnabledHint": "任务和描述中的 VAR 名称会被识别并解析。",
        "variablesDisabledHint": "任务将不会进行变量识别。",
        "noRecognizedVariables": "尚未识别到变量。请在项目任务或其描述中使用例如 VAR宽度。",
    },
    "ar": {
        "projectStructure": "بنية المشروع",
        "projectStructureDesc": "يتم التعرّف على متغيرات المشروع من المهام المرتبطة ويمكن إدارتها هنا.",
        "variablesEnabledHint": "يتم التعرّف على أسماء VAR في المهام والأوصاف وحلّها.",
        "variablesDisabledHint": "تُعرض المهام دون التعرّف على المتغيرات.",
        "noRecognizedVariables": "لم يتم التعرّف على متغيرات بعد. استخدم مثلاً VARالعرض في مهمة المشروع أو وصفها.",
    },
}

TASKS = {
    "de": {"groupBy": "Projekte & Phasen", "grouped": "Nach Projekten", "unknownProject": "Unbekanntes Projekt", "withoutPhase": "Ohne Phase", "standalone": "Weitere Haushaltsaufgaben"},
    "en": {"groupBy": "Projects & phases", "grouped": "By projects", "unknownProject": "Unknown project", "withoutPhase": "Without phase", "standalone": "Other household tasks"},
    "es": {"groupBy": "Proyectos y fases", "grouped": "Por proyectos", "unknownProject": "Proyecto desconocido", "withoutPhase": "Sin fase", "standalone": "Otras tareas del hogar"},
    "fr": {"groupBy": "Projets et phases", "grouped": "Par projets", "unknownProject": "Projet inconnu", "withoutPhase": "Sans phase", "standalone": "Autres tâches du foyer"},
    "tr": {"groupBy": "Projeler ve aşamalar", "grouped": "Projelere göre", "unknownProject": "Bilinmeyen proje", "withoutPhase": "Aşamasız", "standalone": "Diğer ev görevleri"},
    "zh": {"groupBy": "项目与阶段", "grouped": "按项目", "unknownProject": "未知项目", "withoutPhase": "无阶段", "standalone": "其他家庭任务"},
    "ar": {"groupBy": "المشاريع والمراحل", "grouped": "حسب المشاريع", "unknownProject": "مشروع غير معروف", "withoutPhase": "دون مرحلة", "standalone": "مهام منزلية أخرى"},
}

for language in PLANKISTE:
    plankiste_path = ROOT / language / "plankiste.json"
    plankiste = json.loads(plankiste_path.read_text())
    plankiste.setdefault("project", {}).update(PLANKISTE[language])
    plankiste_path.write_text(json.dumps(plankiste, ensure_ascii=False, indent=2) + "\n")

    tasks_path = ROOT / language / "tasks.json"
    tasks = json.loads(tasks_path.read_text())
    tasks.setdefault("projectGroups", {}).update(TASKS[language])
    tasks_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + "\n")
