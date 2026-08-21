"""Ergänzt die Übersetzungen der dokumentierten aufgabenbezogenen Variableneingaben."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

TEXTS = {
    "de": {
        "title": "Variablen eingeben", "description": "Dokumentieren Sie den für diese Aufgabe ermittelten Wert. Einträge erscheinen im Verlauf der Aufgabe.",
        "saved": "Variableneingabe dokumentiert", "saveError": "Variableneingabe konnte nicht gespeichert werden", "open": "Variablen eingeben",
        "assignmentTitle": "Für diese Aufgabe zu dokumentierende Variablen", "assignmentHint": "Diese Werte können auf der Aufgabenkarte oder beim Abschluss mit Notiz, Foto und PDF festgehalten werden.",
        "noProjectVariables": "Für das ausgewählte Projekt sind keine Variablen vorhanden.", "variable": "Variable", "value": "Wert", "valuePlaceholder": "z. B. 120", "unit": "Einheit",
        "note": "Erläuterung", "notePlaceholder": "Messung, Berechnung oder Besonderheiten festhalten", "photos": "Foto oder Zeichnung", "pdfs": "PDF-Anhänge",
        "save": "Eingabe speichern", "completionRequired": "Vor dem Abschluss fehlen noch dokumentierte Variablen.", "documentMissing": "Fehlende Eingaben dokumentieren",
    },
    "en": {
        "title": "Enter variables", "description": "Document the value determined for this task. Entries are shown in the task history.",
        "saved": "Variable input documented", "saveError": "Variable input could not be saved", "open": "Enter variables",
        "assignmentTitle": "Variables to document for this task", "assignmentHint": "These values can be recorded on the task card or when completing the task with a note, photo and PDF.",
        "noProjectVariables": "There are no variables for the selected project.", "variable": "Variable", "value": "Value", "valuePlaceholder": "e.g. 120", "unit": "Unit",
        "note": "Explanation", "notePlaceholder": "Record measurement, calculation or special circumstances", "photos": "Photo or drawing", "pdfs": "PDF attachments",
        "save": "Save input", "completionRequired": "Documented variables are still required before completion.", "documentMissing": "Document missing inputs",
    },
    "es": {
        "title": "Introducir variables", "description": "Documente el valor determinado para esta tarea. Las entradas aparecen en el historial de la tarea.",
        "saved": "Entrada de variable documentada", "saveError": "No se pudo guardar la entrada de variable", "open": "Introducir variables",
        "assignmentTitle": "Variables que deben documentarse para esta tarea", "assignmentHint": "Estos valores se pueden registrar en la tarjeta de la tarea o al completarla con una nota, foto y PDF.",
        "noProjectVariables": "No hay variables para el proyecto seleccionado.", "variable": "Variable", "value": "Valor", "valuePlaceholder": "p. ej. 120", "unit": "Unidad",
        "note": "Explicación", "notePlaceholder": "Anote la medición, el cálculo o las particularidades", "photos": "Foto o dibujo", "pdfs": "Archivos PDF",
        "save": "Guardar entrada", "completionRequired": "Aún faltan variables documentadas antes de completar la tarea.", "documentMissing": "Documentar entradas faltantes",
    },
    "fr": {
        "title": "Saisir des variables", "description": "Documentez la valeur déterminée pour cette tâche. Les entrées apparaissent dans l'historique de la tâche.",
        "saved": "Saisie de variable documentée", "saveError": "La saisie de variable n'a pas pu être enregistrée", "open": "Saisir des variables",
        "assignmentTitle": "Variables à documenter pour cette tâche", "assignmentHint": "Ces valeurs peuvent être consignées sur la carte de la tâche ou lors de sa finalisation avec une note, une photo et un PDF.",
        "noProjectVariables": "Aucune variable n'est disponible pour le projet sélectionné.", "variable": "Variable", "value": "Valeur", "valuePlaceholder": "p. ex. 120", "unit": "Unité",
        "note": "Explication", "notePlaceholder": "Indiquez la mesure, le calcul ou les particularités", "photos": "Photo ou dessin", "pdfs": "Pièces jointes PDF",
        "save": "Enregistrer la saisie", "completionRequired": "Des variables documentées sont encore requises avant la finalisation.", "documentMissing": "Documenter les saisies manquantes",
    },
    "tr": {
        "title": "Değişken gir", "description": "Bu görev için belirlenen değeri belgelendirin. Kayıtlar görev geçmişinde görünür.",
        "saved": "Değişken girişi belgelendi", "saveError": "Değişken girişi kaydedilemedi", "open": "Değişken gir",
        "assignmentTitle": "Bu görev için belgelenecek değişkenler", "assignmentHint": "Bu değerler görev kartında veya görev tamamlanırken not, fotoğraf ve PDF ile kaydedilebilir.",
        "noProjectVariables": "Seçilen proje için değişken yok.", "variable": "Değişken", "value": "Değer", "valuePlaceholder": "örn. 120", "unit": "Birim",
        "note": "Açıklama", "notePlaceholder": "Ölçümü, hesabı veya özellikleri kaydedin", "photos": "Fotoğraf veya çizim", "pdfs": "PDF ekleri",
        "save": "Girişi kaydet", "completionRequired": "Tamamlamadan önce belgelenmesi gereken değişkenler var.", "documentMissing": "Eksik girişleri belgele",
    },
    "zh": {
        "title": "录入变量", "description": "记录为此任务确定的数值。条目会显示在任务历史中。",
        "saved": "变量输入已记录", "saveError": "无法保存变量输入", "open": "录入变量",
        "assignmentTitle": "需要为此任务记录的变量", "assignmentHint": "这些数值可以在任务卡片上或完成任务时通过备注、照片和 PDF 记录。",
        "noProjectVariables": "所选项目没有变量。", "variable": "变量", "value": "数值", "valuePlaceholder": "例如 120", "unit": "单位",
        "note": "说明", "notePlaceholder": "记录测量、计算或特殊情况", "photos": "照片或图纸", "pdfs": "PDF 附件",
        "save": "保存输入", "completionRequired": "完成任务前仍有变量需要记录。", "documentMissing": "记录缺失输入",
    },
    "ar": {
        "title": "إدخال المتغيرات", "description": "وثّق القيمة التي تم تحديدها لهذه المهمة. ستظهر الإدخالات في سجل المهمة.",
        "saved": "تم توثيق إدخال المتغير", "saveError": "تعذر حفظ إدخال المتغير", "open": "إدخال المتغيرات",
        "assignmentTitle": "المتغيرات المطلوب توثيقها لهذه المهمة", "assignmentHint": "يمكن تسجيل هذه القيم في بطاقة المهمة أو عند إكمالها مع ملاحظة وصورة وملف PDF.",
        "noProjectVariables": "لا توجد متغيرات للمشروع المحدد.", "variable": "المتغير", "value": "القيمة", "valuePlaceholder": "مثال: 120", "unit": "الوحدة",
        "note": "توضيح", "notePlaceholder": "سجّل القياس أو الحساب أو الملاحظات الخاصة", "photos": "صورة أو رسم", "pdfs": "مرفقات PDF",
        "save": "حفظ الإدخال", "completionRequired": "لا تزال هناك متغيرات يجب توثيقها قبل الإكمال.", "documentMissing": "توثيق الإدخالات الناقصة",
    },
}

HISTORY_ACTIONS = {
    "de": "Variableneingabe", "en": "Variable input", "es": "Entrada de variable", "fr": "Saisie de variable",
    "tr": "Değişken girişi", "zh": "变量输入", "ar": "إدخال متغير",
}

for language, texts in TEXTS.items():
    task_path = ROOT / language / "tasks.json"
    history_path = ROOT / language / "history.json"
    task_data = json.loads(task_path.read_text(encoding="utf-8"))
    task_data["variableInput"] = texts
    task_path.write_text(json.dumps(task_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    history_data = json.loads(history_path.read_text(encoding="utf-8"))
    history_data.setdefault("actions", {})["variable_input"] = HISTORY_ACTIONS[language]
    history_path.write_text(json.dumps(history_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Übersetzungen für Variableneingaben wurden in 7 Sprachen ergänzt.")
