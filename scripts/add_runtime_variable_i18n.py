import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

TEXTS = {
    "de": {
        "tasks": {
            "variableInput": {
                "completionConfirms": "Mit dem Abschluss bestätigen Sie die dokumentierten Werte verbindlich für diesen Projektdurchlauf.",
                "projectValueConfirmation": "Der Wert wird vorgemerkt und erst beim Abschluss dieser Aufgabe für den Projektdurchlauf bestätigt.",
            },
            "milestoneDialog": {
                "variableTitle": "Durchlaufwert festhalten (optional)",
                "variableHint": "Der Wert wird vorgemerkt und beim Abschluss der Aufgabe für diesen Projektdurchlauf bestätigt.",
            },
        },
        "plankiste": {"project": {"variableScope": "Art der Eingabevariable", "variableScopeFixed": "Feste Vorgabe", "variableScopeRuntime": "Je Projektdurchlauf"}},
        "projects": {"variables": {"use": "Projektvariablen verwenden", "useDescription": "VAR-Namen werden in Aufgaben erkannt. Feste Vorgaben und Werte je Projektdurchlauf können anschließend getrennt gepflegt werden."}},
    },
    "en": {
        "tasks": {"variableInput": {"completionConfirms": "Completing the task confirms the documented values for this project run.", "projectValueConfirmation": "The value is saved as a draft and confirmed for the project run only when this task is completed."}, "milestoneDialog": {"variableTitle": "Record run value (optional)", "variableHint": "The value is saved as a draft and confirmed for this project run when the task is completed."}},
        "plankiste": {"project": {"variableScope": "Input variable type", "variableScopeFixed": "Fixed project setting", "variableScopeRuntime": "Per project run"}},
        "projects": {"variables": {"use": "Use project variables", "useDescription": "VAR names are recognised in tasks. Fixed settings and values per project run can then be managed separately."}},
    },
    "es": {
        "tasks": {"variableInput": {"completionConfirms": "Al completar la tarea, confirma los valores documentados para esta ejecución del proyecto.", "projectValueConfirmation": "El valor queda guardado provisionalmente y se confirma para la ejecución del proyecto al completar esta tarea."}, "milestoneDialog": {"variableTitle": "Registrar valor de ejecución (opcional)", "variableHint": "El valor queda guardado provisionalmente y se confirma para esta ejecución al completar la tarea."}},
        "plankiste": {"project": {"variableScope": "Tipo de variable de entrada", "variableScopeFixed": "Valor fijo del proyecto", "variableScopeRuntime": "Por ejecución del proyecto"}},
        "projects": {"variables": {"use": "Usar variables de proyecto", "useDescription": "Los nombres VAR se reconocen en las tareas. Los valores fijos y los valores por ejecución se pueden gestionar por separado."}},
    },
    "fr": {
        "tasks": {"variableInput": {"completionConfirms": "La finalisation de la tâche confirme les valeurs documentées pour cette exécution du projet.", "projectValueConfirmation": "La valeur est enregistrée provisoirement et n'est confirmée pour l'exécution du projet qu'à la fin de cette tâche."}, "milestoneDialog": {"variableTitle": "Consigner une valeur d'exécution (facultatif)", "variableHint": "La valeur est enregistrée provisoirement et confirmée pour cette exécution à la fin de la tâche."}},
        "plankiste": {"project": {"variableScope": "Type de variable d'entrée", "variableScopeFixed": "Paramètre fixe du projet", "variableScopeRuntime": "Par exécution du projet"}},
        "projects": {"variables": {"use": "Utiliser les variables du projet", "useDescription": "Les noms VAR sont reconnus dans les tâches. Les paramètres fixes et les valeurs par exécution peuvent ensuite être gérés séparément."}},
    },
    "tr": {
        "tasks": {"variableInput": {"completionConfirms": "Görevi tamamlayarak bu proje yürütmesi için belgelenen değerleri onaylarsınız.", "projectValueConfirmation": "Değer taslak olarak kaydedilir ve bu görev tamamlandığında proje yürütmesi için onaylanır."}, "milestoneDialog": {"variableTitle": "Yürütme değerini kaydet (isteğe bağlı)", "variableHint": "Değer taslak olarak kaydedilir ve görev tamamlandığında bu proje yürütmesi için onaylanır."}},
        "plankiste": {"project": {"variableScope": "Girdi değişkeni türü", "variableScopeFixed": "Sabit proje değeri", "variableScopeRuntime": "Her proje yürütmesi için"}},
        "projects": {"variables": {"use": "Proje değişkenlerini kullan", "useDescription": "VAR adları görevlerde algılanır. Sabit değerler ve her proje yürütmesindeki değerler ayrı ayrı yönetilebilir."}},
    },
    "zh": {
        "tasks": {"variableInput": {"completionConfirms": "完成任务后，将确认本次项目执行中已记录的数值。", "projectValueConfirmation": "该数值会暂存，并在完成此任务时确认用于本次项目执行。"}, "milestoneDialog": {"variableTitle": "记录本次执行数值（可选）", "variableHint": "该数值会暂存，并在任务完成时确认用于本次项目执行。"}},
        "plankiste": {"project": {"variableScope": "输入变量类型", "variableScopeFixed": "固定项目设定", "variableScopeRuntime": "每次项目执行"}},
        "projects": {"variables": {"use": "使用项目变量", "useDescription": "任务中会识别 VAR 名称。固定设定和每次项目执行的数值可分别管理。"}},
    },
    "ar": {
        "tasks": {"variableInput": {"completionConfirms": "يؤكد إكمال المهمة القيم الموثقة لهذا التنفيذ من المشروع.", "projectValueConfirmation": "تُحفظ القيمة مؤقتًا وتُؤكَّد لهذا التنفيذ من المشروع عند إكمال هذه المهمة."}, "milestoneDialog": {"variableTitle": "تسجيل قيمة التنفيذ (اختياري)", "variableHint": "تُحفظ القيمة مؤقتًا وتُؤكَّد لهذا التنفيذ عند إكمال المهمة."}},
        "plankiste": {"project": {"variableScope": "نوع متغير الإدخال", "variableScopeFixed": "إعداد ثابت للمشروع", "variableScopeRuntime": "لكل تنفيذ للمشروع"}},
        "projects": {"variables": {"use": "استخدام متغيرات المشروع", "useDescription": "يتم التعرف على أسماء VAR في المهام. يمكن إدارة الإعدادات الثابتة وقيم كل تنفيذ للمشروع بشكل منفصل."}},
    },
}

def merge(target, values):
    for key, value in values.items():
        if isinstance(value, dict):
            target.setdefault(key, {})
            merge(target[key], value)
        else:
            target[key] = value

for language, namespaces in TEXTS.items():
    for namespace, values in namespaces.items():
        path = ROOT / language / f"{namespace}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        merge(data, values)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

