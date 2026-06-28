#!/usr/bin/env python3
"""
Fügt alle fehlenden i18n-Schlüssel in die Locale-Dateien ein.
Betrifft: de, en (und alle anderen Sprachen wo sinnvoll).
"""

import json
import os
from pathlib import Path

LOCALES_DIR = Path("/home/ubuntu/haushaltsmanager/client/public/locales")
LANGUAGES = ["de", "en", "ar", "es", "fr", "tr", "zh"]

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

def set_nested(d, keys, value):
    """Setzt einen verschachtelten Schlüssel, falls er noch nicht existiert."""
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    if keys[-1] not in d:
        d[keys[-1]] = value
        return True
    return False

# ─── Fehlende Schlüssel mit Übersetzungen ─────────────────────────────────────

MISSING_KEYS = {
    "common.json": {
        # common:status.saving
        ("status", "saving"): {
            "de": "Wird gespeichert...",
            "en": "Saving...",
            "ar": "جارٍ الحفظ...",
            "es": "Guardando...",
            "fr": "Enregistrement...",
            "tr": "Kaydediliyor...",
            "zh": "保存中...",
        },
        # common:actions.details
        ("actions", "details"): {
            "de": "Details",
            "en": "Details",
            "ar": "التفاصيل",
            "es": "Detalles",
            "fr": "Détails",
            "tr": "Detaylar",
            "zh": "详情",
        },
        # common:pagination.perPage
        ("pagination", "perPage"): {
            "de": "pro Seite:",
            "en": "per page:",
            "ar": "لكل صفحة:",
            "es": "por página:",
            "fr": "par page :",
            "tr": "sayfa başına:",
            "zh": "每页：",
        },
        # common:labels.selectMonthYear
        ("labels", "selectMonthYear"): {
            "de": "Monat und Jahr auswählen",
            "en": "Select month and year",
            "ar": "اختر الشهر والسنة",
            "es": "Seleccionar mes y año",
            "fr": "Sélectionner le mois et l'année",
            "tr": "Ay ve yıl seçin",
            "zh": "选择月份和年份",
        },
    },
    "calendar.json": {
        # calendar:legend.*
        ("legend", "open"): {
            "de": "Offen",
            "en": "Open",
            "ar": "مفتوح",
            "es": "Abierto",
            "fr": "Ouvert",
            "tr": "Açık",
            "zh": "待办",
        },
        ("legend", "overdue"): {
            "de": "Überfällig",
            "en": "Overdue",
            "ar": "متأخر",
            "es": "Vencido",
            "fr": "En retard",
            "tr": "Gecikmiş",
            "zh": "已逾期",
        },
        ("legend", "completed"): {
            "de": "Erledigt",
            "en": "Completed",
            "ar": "مكتمل",
            "es": "Completado",
            "fr": "Terminé",
            "tr": "Tamamlandı",
            "zh": "已完成",
        },
        ("legend", "future"): {
            "de": "Folgetermin",
            "en": "Future occurrence",
            "ar": "موعد مستقبلي",
            "es": "Próxima ocurrencia",
            "fr": "Prochaine occurrence",
            "tr": "Gelecek tekrar",
            "zh": "未来日程",
        },
        ("legend", "special"): {
            "de": "Sondertermin",
            "en": "Special appointment",
            "ar": "موعد خاص",
            "es": "Cita especial",
            "fr": "Rendez-vous spécial",
            "tr": "Özel randevu",
            "zh": "特殊日程",
        },
        ("legend", "skipped"): {
            "de": "Übersprungen",
            "en": "Skipped",
            "ar": "تم التخطي",
            "es": "Omitido",
            "fr": "Ignoré",
            "tr": "Atlandı",
            "zh": "已跳过",
        },
        # calendar:skipChainWarning.*
        ("skipChainWarning", "title"): {
            "de": "Folgetermine werden übersprungen",
            "en": "Following occurrences will be skipped",
            "ar": "سيتم تخطي المواعيد التالية",
            "es": "Las siguientes ocurrencias serán omitidas",
            "fr": "Les occurrences suivantes seront ignorées",
            "tr": "Sonraki tekrarlar atlanacak",
            "zh": "后续日程将被跳过",
        },
        ("skipChainWarning", "body"): {
            "de": "Beim Abschluss werden {{count}} Termin(e) übersprungen:",
            "en": "On completion, {{count}} occurrence(s) will be skipped:",
            "ar": "عند الإكمال، سيتم تخطي {{count}} موعد(مواعيد):",
            "es": "Al completar, se omitirán {{count}} ocurrencia(s):",
            "fr": "À la complétion, {{count}} occurrence(s) seront ignorées :",
            "tr": "Tamamlandığında {{count}} tekrar atlanacak:",
            "zh": "完成时，将跳过 {{count}} 个日程：",
        },
        ("skipChainWarning", "nextDate"): {
            "de": "Nächster offener Termin: {{date}}",
            "en": "Next open occurrence: {{date}}",
            "ar": "الموعد المفتوح التالي: {{date}}",
            "es": "Próxima ocurrencia abierta: {{date}}",
            "fr": "Prochaine occurrence ouverte : {{date}}",
            "tr": "Sonraki açık tekrar: {{date}}",
            "zh": "下一个待办日程：{{date}}",
        },
        ("skipChainWarning", "confirm"): {
            "de": "Trotzdem abschließen",
            "en": "Complete anyway",
            "ar": "إكمال على أي حال",
            "es": "Completar de todos modos",
            "fr": "Compléter quand même",
            "tr": "Yine de tamamla",
            "zh": "仍然完成",
        },
        # calendar:messages.occurrenceRestored
        ("messages", "occurrenceRestored"): {
            "de": "Termin wiederhergestellt!",
            "en": "Occurrence restored!",
            "ar": "تمت استعادة الموعد!",
            "es": "¡Ocurrencia restaurada!",
            "fr": "Occurrence restaurée !",
            "tr": "Tekrar geri yüklendi!",
            "zh": "日程已恢复！",
        },
        # calendar:skippedOccurrence
        ("skippedOccurrence",): {
            "de": "Ausgelassen",
            "en": "Skipped",
            "ar": "تم التخطي",
            "es": "Omitido",
            "fr": "Ignoré",
            "tr": "Atlandı",
            "zh": "已跳过",
        },
        # calendar:unskip
        ("unskip",): {
            "de": "Auslassen rückgängig",
            "en": "Undo skip",
            "ar": "التراجع عن التخطي",
            "es": "Deshacer omisión",
            "fr": "Annuler l'ignorance",
            "tr": "Atlamayı geri al",
            "zh": "撤销跳过",
        },
        # calendar:skipConfirm.*
        ("skipConfirm", "title"): {
            "de": "Übersprungene Termine",
            "en": "Skipped occurrences",
            "ar": "المواعيد المتخطاة",
            "es": "Ocurrencias omitidas",
            "fr": "Occurrences ignorées",
            "tr": "Atlanan tekrarlar",
            "zh": "已跳过的日程",
        },
        ("skipConfirm", "singleSkip"): {
            "de": "Der nächste Termin ({{date}}) ist bereits als \"Auslassen\" markiert. Die Aufgabe wird zum übernächsten offenen Termin weitergeleitet.",
            "en": "The next occurrence ({{date}}) is already marked as skipped. The task will advance to the next open occurrence.",
            "ar": "الموعد التالي ({{date}}) محدد بالفعل كمتخطى. ستنتقل المهمة إلى الموعد المفتوح التالي.",
            "es": "La próxima ocurrencia ({{date}}) ya está marcada como omitida. La tarea avanzará a la siguiente ocurrencia abierta.",
            "fr": "La prochaine occurrence ({{date}}) est déjà marquée comme ignorée. La tâche avancera à la prochaine occurrence ouverte.",
            "tr": "Sonraki tekrar ({{date}}) zaten atlandı olarak işaretlendi. Görev bir sonraki açık tekrara ilerleyecek.",
            "zh": "下一个日程（{{date}}）已被标记为跳过。任务将前进到下一个待办日程。",
        },
        ("skipConfirm", "multiSkip"): {
            "de": "Die nächsten {{count}} Termine sind bereits als \"Auslassen\" markiert. Die Aufgabe wird zum nächsten offenen Termin weitergeleitet.",
            "en": "The next {{count}} occurrences are already marked as skipped. The task will advance to the next open occurrence.",
            "ar": "المواعيد الـ {{count}} التالية محددة بالفعل كمتخطاة. ستنتقل المهمة إلى الموعد المفتوح التالي.",
            "es": "Las próximas {{count}} ocurrencias ya están marcadas como omitidas. La tarea avanzará a la siguiente ocurrencia abierta.",
            "fr": "Les {{count}} prochaines occurrences sont déjà marquées comme ignorées. La tâche avancera à la prochaine occurrence ouverte.",
            "tr": "Sonraki {{count}} tekrar zaten atlandı olarak işaretlendi. Görev bir sonraki açık tekrara ilerleyecek.",
            "zh": "接下来的 {{count}} 个日程已被标记为跳过。任务将前进到下一个待办日程。",
        },
        ("skipConfirm", "skippedDates"): {
            "de": "Übersprungene Termine:",
            "en": "Skipped dates:",
            "ar": "التواريخ المتخطاة:",
            "es": "Fechas omitidas:",
            "fr": "Dates ignorées :",
            "tr": "Atlanan tarihler:",
            "zh": "已跳过的日期：",
        },
        ("skipConfirm", "nextOpen"): {
            "de": "Nächster offener Termin:",
            "en": "Next open occurrence:",
            "ar": "الموعد المفتوح التالي:",
            "es": "Próxima ocurrencia abierta:",
            "fr": "Prochaine occurrence ouverte :",
            "tr": "Sonraki açık tekrar:",
            "zh": "下一个待办日程：",
        },
        ("skipConfirm", "confirm"): {
            "de": "Trotzdem abschließen",
            "en": "Complete anyway",
            "ar": "إكمال على أي حال",
            "es": "Completar de todos modos",
            "fr": "Compléter quand même",
            "tr": "Yine de tamamla",
            "zh": "仍然完成",
        },
    },
    "tasks.json": {
        # tasks:repeat.specialName
        ("repeat", "specialName"): {
            "de": "Name des Sondertermins",
            "en": "Special occurrence name",
            "ar": "اسم الموعد الخاص",
            "es": "Nombre de la ocurrencia especial",
            "fr": "Nom de l'occurrence spéciale",
            "tr": "Özel tekrar adı",
            "zh": "特殊日程名称",
        },
        ("repeat", "specialNamePlaceholder"): {
            "de": "z.B. Weihnachtsputz",
            "en": "e.g. Christmas cleaning",
            "ar": "مثال: تنظيف عيد الميلاد",
            "es": "p.ej. Limpieza de Navidad",
            "fr": "ex. Nettoyage de Noël",
            "tr": "örn. Yılbaşı temizliği",
            "zh": "例如：圣诞大扫除",
        },
        # tasks:fields.selectDate
        ("fields", "selectDate"): {
            "de": "Datum auswählen",
            "en": "Select date",
            "ar": "اختر التاريخ",
            "es": "Seleccionar fecha",
            "fr": "Sélectionner une date",
            "tr": "Tarih seçin",
            "zh": "选择日期",
        },
        # tasks:messages.specialOccurrenceAdded
        ("messages", "specialOccurrenceAdded"): {
            "de": "Sondertermin hinzugefügt",
            "en": "Special occurrence added",
            "ar": "تمت إضافة الموعد الخاص",
            "es": "Ocurrencia especial añadida",
            "fr": "Occurrence spéciale ajoutée",
            "tr": "Özel tekrar eklendi",
            "zh": "已添加特殊日程",
        },
        # tasks:messages.saveError
        ("messages", "saveError"): {
            "de": "Fehler beim Speichern",
            "en": "Error saving",
            "ar": "خطأ في الحفظ",
            "es": "Error al guardar",
            "fr": "Erreur lors de l'enregistrement",
            "tr": "Kaydetme hatası",
            "zh": "保存失败",
        },
        # tasks:labels.occurrence
        ("labels", "occurrence"): {
            "de": "Termin",
            "en": "Occurrence",
            "ar": "موعد",
            "es": "Ocurrencia",
            "fr": "Occurrence",
            "tr": "Tekrar",
            "zh": "日程",
        },
        # tasks:sharing.shareWithOtherHouseholds
        ("sharing", "shareWithOtherHouseholds"): {
            "de": "Mit anderen Haushalten teilen",
            "en": "Share with other households",
            "ar": "مشاركة مع المنازل الأخرى",
            "es": "Compartir con otros hogares",
            "fr": "Partager avec d'autres foyers",
            "tr": "Diğer hanelerle paylaş",
            "zh": "与其他家庭共享",
        },
    },
    "inventory.json": {
        # inventory:messages.categoryCreateError
        ("messages", "categoryCreateError"): {
            "de": "Fehler beim Erstellen der Kategorie",
            "en": "Error creating category",
            "ar": "خطأ في إنشاء الفئة",
            "es": "Error al crear la categoría",
            "fr": "Erreur lors de la création de la catégorie",
            "tr": "Kategori oluşturma hatası",
            "zh": "创建分类失败",
        },
        # inventory:messages.borrowError
        ("messages", "borrowError"): {
            "de": "Fehler beim Ausleihen",
            "en": "Error borrowing item",
            "ar": "خطأ في الاستعارة",
            "es": "Error al tomar prestado",
            "fr": "Erreur lors de l'emprunt",
            "tr": "Ödünç alma hatası",
            "zh": "借用失败",
        },
    },
    "shopping.json": {
        # shopping:fields.noCategory
        ("fields", "noCategory"): {
            "de": "Keine Kategorie",
            "en": "No category",
            "ar": "بدون فئة",
            "es": "Sin categoría",
            "fr": "Aucune catégorie",
            "tr": "Kategori yok",
            "zh": "无分类",
        },
    },
}

# ─── Schlüssel einfügen ────────────────────────────────────────────────────────

changes = 0
for filename, keys_dict in MISSING_KEYS.items():
    for lang in LANGUAGES:
        path = LOCALES_DIR / lang / filename
        if not path.exists():
            print(f"  SKIP {lang}/{filename} (nicht vorhanden)")
            continue
        data = load_json(path)
        modified = False
        for key_tuple, translations in keys_dict.items():
            value = translations.get(lang, translations.get("en", ""))
            if len(key_tuple) == 1:
                # Top-level Schlüssel
                if key_tuple[0] not in data:
                    data[key_tuple[0]] = value
                    modified = True
                    print(f"  + {lang}/{filename}: {key_tuple[0]}")
            else:
                # Verschachtelter Schlüssel
                section = data.setdefault(key_tuple[0], {})
                if key_tuple[1] not in section:
                    section[key_tuple[1]] = value
                    modified = True
                    print(f"  + {lang}/{filename}: {'.'.join(key_tuple)}")
        if modified:
            save_json(path, data)
            changes += 1

print(f"\n✅ {changes} Dateien aktualisiert.")
