"""Ergänzt die Hinweise zur Verfügbarkeit von Projektvariablen in allen App-Sprachen."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

TEXTS = {
    "de": {
        "inputTask": "Erfasst zu Beginn: {{variables}}",
        "startBlocked": "Der Start ist noch nicht möglich.",
        "unresolvedTask": "Die Aufgabe „{{task}}“ enthält nicht auflösbare Variablen: {{variables}}.",
        "noInputTask": "Für „{{variable}}“ gibt es keine Aufgabe, in der der Wert erfasst werden kann.",
        "previousPhaseRequired": "„{{variable}}“ muss zuerst in Phase „{{phase}}“ dokumentiert werden.",
        "shoppingNeedsValue": "„{{variable}}“ wird für einen Einkaufsartikel benötigt, kann aber keiner Eingabeaufgabe zugeordnet werden.",
    },
    "en": {
        "inputTask": "Record at the start: {{variables}}",
        "startBlocked": "The start is not possible yet.",
        "unresolvedTask": "The task “{{task}}” contains variables that cannot be resolved: {{variables}}.",
        "noInputTask": "There is no task where a value can be recorded for “{{variable}}”.",
        "previousPhaseRequired": "“{{variable}}” must first be documented in phase “{{phase}}”.",
        "shoppingNeedsValue": "“{{variable}}” is required for a shopping item but cannot be assigned to an input task.",
    },
    "es": {
        "inputTask": "Registrar al inicio: {{variables}}",
        "startBlocked": "Aún no es posible iniciar.",
        "unresolvedTask": "La tarea «{{task}}» contiene variables que no se pueden resolver: {{variables}}.",
        "noInputTask": "No hay ninguna tarea en la que se pueda registrar un valor para «{{variable}}».",
        "previousPhaseRequired": "Primero se debe documentar «{{variable}}» en la fase «{{phase}}».",
        "shoppingNeedsValue": "«{{variable}}» se necesita para un artículo de compra, pero no puede asignarse a una tarea de entrada.",
    },
    "fr": {
        "inputTask": "À enregistrer au début : {{variables}}",
        "startBlocked": "Le démarrage n'est pas encore possible.",
        "unresolvedTask": "La tâche « {{task}} » contient des variables non résolues : {{variables}}.",
        "noInputTask": "Aucune tâche ne permet d'enregistrer une valeur pour « {{variable}} ».",
        "previousPhaseRequired": "« {{variable}} » doit d'abord être documentée dans la phase « {{phase}} ».",
        "shoppingNeedsValue": "« {{variable}} » est nécessaire pour un article d'achat, mais ne peut être attribuée à aucune tâche de saisie.",
    },
    "tr": {
        "inputTask": "Başlangıçta kaydedilecek: {{variables}}",
        "startBlocked": "Başlatmak henüz mümkün değil.",
        "unresolvedTask": "“{{task}}” görevi çözülemeyen değişkenler içeriyor: {{variables}}.",
        "noInputTask": "“{{variable}}” için değer kaydedilebilecek bir görev yok.",
        "previousPhaseRequired": "“{{variable}}” önce “{{phase}}” aşamasında belgelenmelidir.",
        "shoppingNeedsValue": "“{{variable}}” bir alışveriş ürünü için gerekli, ancak giriş görevine atanamıyor.",
    },
    "zh": {
        "inputTask": "开始时记录：{{variables}}",
        "startBlocked": "暂时无法开始。",
        "unresolvedTask": "任务“{{task}}”包含无法解析的变量：{{variables}}。",
        "noInputTask": "没有可记录“{{variable}}”数值的任务。",
        "previousPhaseRequired": "必须先在阶段“{{phase}}”中记录“{{variable}}”。",
        "shoppingNeedsValue": "购物项目需要“{{variable}}”，但无法将其分配给输入任务。",
    },
    "ar": {
        "inputTask": "يُسجَّل في البداية: {{variables}}",
        "startBlocked": "لا يمكن البدء بعد.",
        "unresolvedTask": "تحتوي المهمة «{{task}}» على متغيرات لا يمكن حلها: {{variables}}.",
        "noInputTask": "لا توجد مهمة يمكن تسجيل قيمة «{{variable}}» فيها.",
        "previousPhaseRequired": "يجب توثيق «{{variable}}» أولاً في المرحلة «{{phase}}».",
        "shoppingNeedsValue": "يلزم «{{variable}}» لعنصر تسوق، ولكن لا يمكن إسناده إلى مهمة إدخال.",
    },
}

for language, texts in TEXTS.items():
    path = ROOT / language / "plankiste.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data.setdefault("project", {})["variableAvailability"] = texts
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Übersetzungen für die Projektvariablen-Verfügbarkeit wurden ergänzt.")
