"""Ergänzt die beim i18n-Lint fehlenden Schlüssel in allen sieben Locale-Dateien.

Das Skript schreibt ausschließlich Übersetzungstexte und führt keine Datenbankoperationen aus.
"""

import json
from pathlib import Path


LOCALES = Path("client/public/locales")


def put(tree: dict, dotted_key: str, value: str) -> None:
    """Setzt einen verschachtelten Schlüssel, ohne bestehende Übersetzungen zu überschreiben."""
    parts = dotted_key.split(".")
    current = tree
    for part in parts[:-1]:
        current = current.setdefault(part, {})
    current.setdefault(parts[-1], value)


PLANKISTE = {
    "de": {
        "items.add": "Artikel hinzufügen", "items.title": "Einkaufsartikel", "items.name": "Name", "items.namePlaceholder": "Artikelname",
        "items.quantity": "Menge", "items.notes": "Notiz (optional)", "items.category": "Kategorie",
        "phases.phase": "Phase", "phases.noPhase": "Keine Phase", "phases.color": "Farbe", "phases.newPhaseName": "Name der neuen Phase",
        "taskForm.editTask": "Aufgabe bearbeiten", "taskForm.addTask": "Aufgabe hinzufügen", "taskForm.name": "Name",
        "taskForm.description": "Beschreibung", "taskForm.once": "Einmalig", "taskForm.daily": "Täglich",
        "taskForm.weekly": "Wöchentlich", "taskForm.monthly": "Monatlich", "taskForm.custom": "Benutzerdefiniert",
        "taskForm.interval": "Intervall", "templateForm.name": "Name", "templateForm.description": "Beschreibung",
        "variables.title": "Variablen", "variables.calculated": "Berechnet", "tasks.title": "Aufgaben",
        "taskItems.title": "Aufgaben", "taskItems.add": "Aufgabe hinzufügen",
        "variables.adoptTitle": "Variablen-Definitionen übernehmen?", "variables.adoptDescription": "In der Aufgaben-Beschreibung wurden folgende Definitionen gefunden. Du kannst die Formeln noch anpassen:",
        "variables.adoptIgnore": "Nein, ignorieren", "variables.adoptConfirm": "Ja, übernehmen",
        "taskItems.deleteTitle": "Aufgabe löschen?", "taskItems.deleteDescription": "„{{name}}“ wird unwiderruflich gelöscht.",
        "taskItems.deleteDependencies": "Wird auch aus {{count}} Aufgabe(n) als Vor-/Folgeaufgabe entfernt: {{tasks}}.",
    },
    "en": {
        "items.add": "Add item", "items.title": "Shopping items", "items.name": "Name", "items.namePlaceholder": "Item name",
        "items.quantity": "Quantity", "items.notes": "Note (optional)", "items.category": "Category",
        "phases.phase": "Phase", "phases.noPhase": "No phase", "phases.color": "Color", "phases.newPhaseName": "New phase name",
        "taskForm.editTask": "Edit task", "taskForm.addTask": "Add task", "taskForm.name": "Name",
        "taskForm.description": "Description", "taskForm.once": "Once", "taskForm.daily": "Daily",
        "taskForm.weekly": "Weekly", "taskForm.monthly": "Monthly", "taskForm.custom": "Custom",
        "taskForm.interval": "Interval", "templateForm.name": "Name", "templateForm.description": "Description",
        "variables.title": "Variables", "variables.calculated": "Calculated", "tasks.title": "Tasks",
        "taskItems.title": "Tasks", "taskItems.add": "Add task",
        "variables.adoptTitle": "Apply variable definitions?", "variables.adoptDescription": "The following definitions were found in the task description. You can still adjust the formulas:",
        "variables.adoptIgnore": "No, ignore", "variables.adoptConfirm": "Yes, apply",
        "taskItems.deleteTitle": "Delete task?", "taskItems.deleteDescription": "“{{name}}” will be permanently deleted.",
        "taskItems.deleteDependencies": "It will also be removed as a prerequisite/follow-up from {{count}} task(s): {{tasks}}.",
    },
    "es": {
        "items.add": "Añadir artículo", "items.title": "Artículos de compra", "items.name": "Nombre", "items.namePlaceholder": "Nombre del artículo",
        "items.quantity": "Cantidad", "items.notes": "Nota (opcional)", "items.category": "Categoría",
        "phases.phase": "Fase", "phases.noPhase": "Sin fase", "phases.color": "Color", "phases.newPhaseName": "Nombre de la nueva fase",
        "taskForm.editTask": "Editar tarea", "taskForm.addTask": "Añadir tarea", "taskForm.name": "Nombre",
        "taskForm.description": "Descripción", "taskForm.once": "Una vez", "taskForm.daily": "Diariamente",
        "taskForm.weekly": "Semanalmente", "taskForm.monthly": "Mensualmente", "taskForm.custom": "Personalizado",
        "taskForm.interval": "Intervalo", "templateForm.name": "Nombre", "templateForm.description": "Descripción",
        "variables.title": "Variables", "variables.calculated": "Calculada", "tasks.title": "Tareas",
        "taskItems.title": "Tareas", "taskItems.add": "Añadir tarea",
        "variables.adoptTitle": "¿Aplicar definiciones de variables?", "variables.adoptDescription": "Se encontraron las siguientes definiciones en la descripción de la tarea. Aún puedes ajustar las fórmulas:",
        "variables.adoptIgnore": "No, ignorar", "variables.adoptConfirm": "Sí, aplicar",
        "taskItems.deleteTitle": "¿Eliminar tarea?", "taskItems.deleteDescription": "“{{name}}” se eliminará permanentemente.",
        "taskItems.deleteDependencies": "También se eliminará como requisito/tarea posterior de {{count}} tarea(s): {{tasks}}.",
    },
    "fr": {
        "items.add": "Ajouter un article", "items.title": "Articles à acheter", "items.name": "Nom", "items.namePlaceholder": "Nom de l’article",
        "items.quantity": "Quantité", "items.notes": "Note (facultative)", "items.category": "Catégorie",
        "phases.phase": "Phase", "phases.noPhase": "Aucune phase", "phases.color": "Couleur", "phases.newPhaseName": "Nom de la nouvelle phase",
        "taskForm.editTask": "Modifier la tâche", "taskForm.addTask": "Ajouter une tâche", "taskForm.name": "Nom",
        "taskForm.description": "Description", "taskForm.once": "Une fois", "taskForm.daily": "Chaque jour",
        "taskForm.weekly": "Chaque semaine", "taskForm.monthly": "Chaque mois", "taskForm.custom": "Personnalisé",
        "taskForm.interval": "Intervalle", "templateForm.name": "Nom", "templateForm.description": "Description",
        "variables.title": "Variables", "variables.calculated": "Calculée", "tasks.title": "Tâches",
        "taskItems.title": "Tâches", "taskItems.add": "Ajouter une tâche",
        "variables.adoptTitle": "Reprendre les définitions de variables ?", "variables.adoptDescription": "Les définitions suivantes ont été trouvées dans la description de la tâche. Vous pouvez encore modifier les formules :",
        "variables.adoptIgnore": "Non, ignorer", "variables.adoptConfirm": "Oui, reprendre",
        "taskItems.deleteTitle": "Supprimer la tâche ?", "taskItems.deleteDescription": "« {{name}} » sera supprimée définitivement.",
        "taskItems.deleteDependencies": "Elle sera aussi retirée comme prérequis/tâche suivante de {{count}} tâche(s) : {{tasks}}.",
    },
    "tr": {
        "items.add": "Öğe ekle", "items.title": "Alışveriş öğeleri", "items.name": "Ad", "items.namePlaceholder": "Öğe adı",
        "items.quantity": "Miktar", "items.notes": "Not (isteğe bağlı)", "items.category": "Kategori",
        "phases.phase": "Aşama", "phases.noPhase": "Aşama yok", "phases.color": "Renk", "phases.newPhaseName": "Yeni aşama adı",
        "taskForm.editTask": "Görevi düzenle", "taskForm.addTask": "Görev ekle", "taskForm.name": "Ad",
        "taskForm.description": "Açıklama", "taskForm.once": "Bir kez", "taskForm.daily": "Günlük",
        "taskForm.weekly": "Haftalık", "taskForm.monthly": "Aylık", "taskForm.custom": "Özel",
        "taskForm.interval": "Aralık", "templateForm.name": "Ad", "templateForm.description": "Açıklama",
        "variables.title": "Değişkenler", "variables.calculated": "Hesaplandı", "tasks.title": "Görevler",
        "taskItems.title": "Görevler", "taskItems.add": "Görev ekle",
        "variables.adoptTitle": "Değişken tanımları alınsın mı?", "variables.adoptDescription": "Görev açıklamasında aşağıdaki tanımlar bulundu. Formülleri hâlâ değiştirebilirsiniz:",
        "variables.adoptIgnore": "Hayır, yoksay", "variables.adoptConfirm": "Evet, al",
        "taskItems.deleteTitle": "Görev silinsin mi?", "taskItems.deleteDescription": "“{{name}}” kalıcı olarak silinecek.",
        "taskItems.deleteDependencies": "Ayrıca {{count}} görevden önkoşul/takip görevi olarak kaldırılacak: {{tasks}}.",
    },
    "zh": {
        "items.add": "添加项目", "items.title": "购物项目", "items.name": "名称", "items.namePlaceholder": "项目名称",
        "items.quantity": "数量", "items.notes": "备注（可选）", "items.category": "类别",
        "phases.phase": "阶段", "phases.noPhase": "无阶段", "phases.color": "颜色", "phases.newPhaseName": "新阶段名称",
        "taskForm.editTask": "编辑任务", "taskForm.addTask": "添加任务", "taskForm.name": "名称",
        "taskForm.description": "描述", "taskForm.once": "一次", "taskForm.daily": "每天",
        "taskForm.weekly": "每周", "taskForm.monthly": "每月", "taskForm.custom": "自定义",
        "taskForm.interval": "间隔", "templateForm.name": "名称", "templateForm.description": "描述",
        "variables.title": "变量", "variables.calculated": "已计算", "tasks.title": "任务",
        "taskItems.title": "任务", "taskItems.add": "添加任务",
        "variables.adoptTitle": "采用变量定义？", "variables.adoptDescription": "在任务描述中发现了以下定义。您仍可以调整公式：",
        "variables.adoptIgnore": "否，忽略", "variables.adoptConfirm": "是，采用",
        "taskItems.deleteTitle": "删除任务？", "taskItems.deleteDescription": "“{{name}}”将被永久删除。",
        "taskItems.deleteDependencies": "它也会从 {{count}} 个任务中移除，取消作为前置/后续任务：{{tasks}}。",
    },
    "ar": {
        "items.add": "إضافة عنصر", "items.title": "عناصر التسوق", "items.name": "الاسم", "items.namePlaceholder": "اسم العنصر",
        "items.quantity": "الكمية", "items.notes": "ملاحظة (اختياري)", "items.category": "الفئة",
        "phases.phase": "مرحلة", "phases.noPhase": "لا توجد مرحلة", "phases.color": "اللون", "phases.newPhaseName": "اسم المرحلة الجديدة",
        "taskForm.editTask": "تعديل المهمة", "taskForm.addTask": "إضافة مهمة", "taskForm.name": "الاسم",
        "taskForm.description": "الوصف", "taskForm.once": "مرة واحدة", "taskForm.daily": "يوميًا",
        "taskForm.weekly": "أسبوعيًا", "taskForm.monthly": "شهريًا", "taskForm.custom": "مخصص",
        "taskForm.interval": "الفاصل", "templateForm.name": "الاسم", "templateForm.description": "الوصف",
        "variables.title": "المتغيرات", "variables.calculated": "محسوب", "tasks.title": "المهام",
        "taskItems.title": "المهام", "taskItems.add": "إضافة مهمة",
        "variables.adoptTitle": "اعتماد تعريفات المتغيرات؟", "variables.adoptDescription": "تم العثور على التعريفات التالية في وصف المهمة. لا يزال بإمكانك تعديل الصيغ:",
        "variables.adoptIgnore": "لا، تجاهل", "variables.adoptConfirm": "نعم، اعتماد",
        "taskItems.deleteTitle": "حذف المهمة؟", "taskItems.deleteDescription": "سيتم حذف «{{name}}» نهائيًا.",
        "taskItems.deleteDependencies": "ستتم إزالتها أيضًا كشرط مسبق/مهمة لاحقة من {{count}} مهمة: {{tasks}}.",
    },
}

COMMON = {
    "de": {"saved": "Gespeichert", "yes": "Ja", "no": "Nein", "deleted": "Gelöscht", "edit": "Bearbeiten", "close": "Schließen", "reset": "Zurücksetzen", "home": "Startseite", "login": "Anmelden"},
    "en": {"saved": "Saved", "yes": "Yes", "no": "No", "deleted": "Deleted", "edit": "Edit", "close": "Close", "reset": "Reset", "home": "Home", "login": "Sign in"},
    "es": {"saved": "Guardado", "yes": "Sí", "no": "No", "deleted": "Eliminado", "edit": "Editar", "close": "Cerrar", "reset": "Restablecer", "home": "Inicio", "login": "Iniciar sesión"},
    "fr": {"saved": "Enregistré", "yes": "Oui", "no": "Non", "deleted": "Supprimé", "edit": "Modifier", "close": "Fermer", "reset": "Réinitialiser", "home": "Accueil", "login": "Se connecter"},
    "tr": {"saved": "Kaydedildi", "yes": "Evet", "no": "Hayır", "deleted": "Silindi", "edit": "Düzenle", "close": "Kapat", "reset": "Sıfırla", "home": "Ana sayfa", "login": "Giriş yap"},
    "zh": {"saved": "已保存", "yes": "是", "no": "否", "deleted": "已删除", "edit": "编辑", "close": "关闭", "reset": "重置", "home": "首页", "login": "登录"},
    "ar": {"saved": "تم الحفظ", "yes": "نعم", "no": "لا", "deleted": "تم الحذف", "edit": "تعديل", "close": "إغلاق", "reset": "إعادة تعيين", "home": "الرئيسية", "login": "تسجيل الدخول"},
}

BORROWS = {"de": "Nachricht zur Genehmigung (optional)", "en": "Approval note (optional)", "es": "Nota de aprobación (opcional)", "fr": "Note d’approbation (facultative)", "tr": "Onay notu (isteğe bağlı)", "zh": "批准说明（可选）", "ar": "ملاحظة الموافقة (اختيارية)"}
NOTES_PLACEHOLDER = {"de": "Notiz hinzufügen (optional)", "en": "Add a note (optional)", "es": "Añadir una nota (opcional)", "fr": "Ajouter une note (facultative)", "tr": "Not ekleyin (isteğe bağlı)", "zh": "添加备注（可选）", "ar": "أضف ملاحظة (اختياري)"}

TASK_LABELS = {
    "de": {"name": "Name", "frequency": "Wiederholung", "repeatInterval": "Intervall", "repeatUnit": "Einheit", "rotation": "Rotation", "requiredPersons": "Benötigte Personen", "customFrequencyDays": "Eigene Wiederholungstage", "irregularRecurrence": "Unregelmäßige Wiederholung", "monthlyRecurrence": "Monatliche Wiederholung", "monthlyWeekday": "Wochentag", "monthlyOccurrence": "Auftreten im Monat", "durationDays": "Dauer (Tage)", "durationMinutes": "Dauer (Minuten)"},
    "en": {"name": "Name", "frequency": "Recurrence", "repeatInterval": "Interval", "repeatUnit": "Unit", "rotation": "Rotation", "requiredPersons": "Required people", "customFrequencyDays": "Custom recurrence days", "irregularRecurrence": "Irregular recurrence", "monthlyRecurrence": "Monthly recurrence", "monthlyWeekday": "Weekday", "monthlyOccurrence": "Occurrence in month", "durationDays": "Duration (days)", "durationMinutes": "Duration (minutes)"},
    "es": {"name": "Nombre", "frequency": "Repetición", "repeatInterval": "Intervalo", "repeatUnit": "Unidad", "rotation": "Rotación", "requiredPersons": "Personas necesarias", "customFrequencyDays": "Días de repetición personalizados", "irregularRecurrence": "Repetición irregular", "monthlyRecurrence": "Repetición mensual", "monthlyWeekday": "Día de la semana", "monthlyOccurrence": "Aparición en el mes", "durationDays": "Duración (días)", "durationMinutes": "Duración (minutos)"},
    "fr": {"name": "Nom", "frequency": "Répétition", "repeatInterval": "Intervalle", "repeatUnit": "Unité", "rotation": "Rotation", "requiredPersons": "Personnes nécessaires", "customFrequencyDays": "Jours de répétition personnalisés", "irregularRecurrence": "Répétition irrégulière", "monthlyRecurrence": "Répétition mensuelle", "monthlyWeekday": "Jour de la semaine", "monthlyOccurrence": "Occurrence dans le mois", "durationDays": "Durée (jours)", "durationMinutes": "Durée (minutes)"},
    "tr": {"name": "Ad", "frequency": "Tekrar", "repeatInterval": "Aralık", "repeatUnit": "Birim", "rotation": "Döngü", "requiredPersons": "Gerekli kişiler", "customFrequencyDays": "Özel tekrar günleri", "irregularRecurrence": "Düzensiz tekrar", "monthlyRecurrence": "Aylık tekrar", "monthlyWeekday": "Haftanın günü", "monthlyOccurrence": "Aydaki tekrar", "durationDays": "Süre (gün)", "durationMinutes": "Süre (dakika)"},
    "zh": {"name": "名称", "frequency": "重复", "repeatInterval": "间隔", "repeatUnit": "单位", "rotation": "轮换", "requiredPersons": "所需人员", "customFrequencyDays": "自定义重复日期", "irregularRecurrence": "不规则重复", "monthlyRecurrence": "每月重复", "monthlyWeekday": "星期", "monthlyOccurrence": "当月第几次", "durationDays": "时长（天）", "durationMinutes": "时长（分钟）"},
    "ar": {"name": "الاسم", "frequency": "التكرار", "repeatInterval": "الفاصل", "repeatUnit": "الوحدة", "rotation": "التناوب", "requiredPersons": "الأشخاص المطلوبون", "customFrequencyDays": "أيام التكرار المخصصة", "irregularRecurrence": "تكرار غير منتظم", "monthlyRecurrence": "تكرار شهري", "monthlyWeekday": "يوم الأسبوع", "monthlyOccurrence": "التكرار في الشهر", "durationDays": "المدة (أيام)", "durationMinutes": "المدة (دقائق)"},
}


for language in PLANKISTE:
    plankiste_path = LOCALES / language / "plankiste.json"
    with plankiste_path.open(encoding="utf-8") as source:
        plankiste = json.load(source)
    for key, text in PLANKISTE[language].items():
        put(plankiste, key, text)
    plankiste_path.write_text(json.dumps(plankiste, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    common_path = LOCALES / language / "common.json"
    with common_path.open(encoding="utf-8") as source:
        common = json.load(source)
    for key, text in COMMON[language].items():
        put(common, key, text)
    common_path.write_text(json.dumps(common, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    borrows_path = LOCALES / language / "borrows.json"
    with borrows_path.open(encoding="utf-8") as source:
        borrows = json.load(source)
    put(borrows, "approvalNote", BORROWS[language])
    borrows_path.write_text(json.dumps(borrows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    shopping_path = LOCALES / language / "shopping.json"
    with shopping_path.open(encoding="utf-8") as source:
        shopping = json.load(source)
    put(shopping, "fields.notesPlaceholder", NOTES_PLACEHOLDER[language])
    shopping_path.write_text(json.dumps(shopping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    tasks_path = LOCALES / language / "tasks.json"
    with tasks_path.open(encoding="utf-8") as source:
        tasks = json.load(source)
    for key, text in TASK_LABELS[language].items():
        put(tasks, f"labels.{key}", text)
    tasks_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Übersetzungsschlüssel für de, en, es, fr, tr, zh und ar ergänzt.")
