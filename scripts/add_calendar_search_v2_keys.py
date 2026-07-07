#!/usr/bin/env python3
"""
Adds new calendar search UI keys to all 7 locale files.
New keys:
  - searchFilterCalendar: label for the "filter calendar" button (inactive state)
  - searchFilterCalendarActive: label for the "filter calendar" button (active state)
  - searchFilterCalendarActivate: tooltip when button is inactive
  - searchFilterCalendarDeactivate: tooltip when button is active
  - searchJump: label for the "jump" button in search results
Also fixes existing searchNoResults to use i18next interpolation {{query}} instead of {query}.
"""

import json
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "locales")

TRANSLATIONS = {
    "de": {
        "searchFilterCalendar": "Kalender filtern",
        "searchFilterCalendarActive": "Kalender gefiltert",
        "searchFilterCalendarActivate": "Kalender nach Suche filtern",
        "searchFilterCalendarDeactivate": "Kalenderfilter deaktivieren",
        "searchJump": "Springen",
        "searchNoResults": "Keine Ergebnisse für \"{{query}}\"",
    },
    "en": {
        "searchFilterCalendar": "Filter calendar",
        "searchFilterCalendarActive": "Calendar filtered",
        "searchFilterCalendarActivate": "Filter calendar by search",
        "searchFilterCalendarDeactivate": "Deactivate calendar filter",
        "searchJump": "Jump",
        "searchNoResults": "No results for \"{{query}}\"",
    },
    "ar": {
        "searchFilterCalendar": "تصفية التقويم",
        "searchFilterCalendarActive": "التقويم مُصفَّى",
        "searchFilterCalendarActivate": "تصفية التقويم بالبحث",
        "searchFilterCalendarDeactivate": "إلغاء تصفية التقويم",
        "searchJump": "انتقل",
        "searchNoResults": "لا توجد نتائج لـ \"{{query}}\"",
    },
    "es": {
        "searchFilterCalendar": "Filtrar calendario",
        "searchFilterCalendarActive": "Calendario filtrado",
        "searchFilterCalendarActivate": "Filtrar calendario por búsqueda",
        "searchFilterCalendarDeactivate": "Desactivar filtro del calendario",
        "searchJump": "Saltar",
        "searchNoResults": "Sin resultados para \"{{query}}\"",
    },
    "fr": {
        "searchFilterCalendar": "Filtrer le calendrier",
        "searchFilterCalendarActive": "Calendrier filtré",
        "searchFilterCalendarActivate": "Filtrer le calendrier par recherche",
        "searchFilterCalendarDeactivate": "Désactiver le filtre du calendrier",
        "searchJump": "Aller",
        "searchNoResults": "Aucun résultat pour \"{{query}}\"",
    },
    "tr": {
        "searchFilterCalendar": "Takvimi filtrele",
        "searchFilterCalendarActive": "Takvim filtrelendi",
        "searchFilterCalendarActivate": "Takvimi aramaya göre filtrele",
        "searchFilterCalendarDeactivate": "Takvim filtresini kaldır",
        "searchJump": "Atla",
        "searchNoResults": "\"{{query}}\" için sonuç bulunamadı",
    },
    "zh": {
        "searchFilterCalendar": "过滤日历",
        "searchFilterCalendarActive": "日历已过滤",
        "searchFilterCalendarActivate": "按搜索过滤日历",
        "searchFilterCalendarDeactivate": "取消日历过滤",
        "searchJump": "跳转",
        "searchNoResults": '未找到“{{query}}”的结果',
    },
}

def update_locale(lang: str, keys: dict):
    path = os.path.join(LOCALES_DIR, lang, "calendar.json")
    if not os.path.exists(path):
        print(f"  [SKIP] {path} not found")
        return

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    changed = False
    for key, value in keys.items():
        if data.get(key) != value:
            data[key] = value
            changed = True

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  [OK] Updated {lang}/calendar.json")
    else:
        print(f"  [--] No changes for {lang}/calendar.json")


if __name__ == "__main__":
    for lang, keys in TRANSLATIONS.items():
        update_locale(lang, keys)
    print("Done.")
