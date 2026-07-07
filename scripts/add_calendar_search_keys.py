#!/usr/bin/env python3
"""Fügt Suchschlüssel in alle calendar.json Locale-Dateien ein."""
import json
import os

LOCALES_DIR = "/home/ubuntu/haushaltsmanager/client/public/locales"

# Übersetzungen für alle Sprachen
TRANSLATIONS = {
    "de": {
        "searchPlaceholder": "Termine oder Notizen suchen...",
        "searchNoResults": "Keine Ergebnisse für \"{query}\"",
        "searchClear": "Suche löschen",
    },
    "en": {
        "searchPlaceholder": "Search appointments or notes...",
        "searchNoResults": "No results for \"{query}\"",
        "searchClear": "Clear search",
    },
    "ar": {
        "searchPlaceholder": "البحث في المواعيد أو الملاحظات...",
        "searchNoResults": "لا توجد نتائج لـ \"{query}\"",
        "searchClear": "مسح البحث",
    },
    "es": {
        "searchPlaceholder": "Buscar citas o notas...",
        "searchNoResults": "Sin resultados para \"{query}\"",
        "searchClear": "Borrar búsqueda",
    },
    "fr": {
        "searchPlaceholder": "Rechercher des rendez-vous ou des notes...",
        "searchNoResults": "Aucun résultat pour \"{query}\"",
        "searchClear": "Effacer la recherche",
    },
    "tr": {
        "searchPlaceholder": "Randevu veya notları ara...",
        "searchNoResults": "\"{query}\" için sonuç bulunamadı",
        "searchClear": "Aramayı temizle",
    },
    "zh": {
        "searchPlaceholder": "搜索约会或笔记...",
        "searchNoResults": '没有找到"{query}"的结果',
        "searchClear": "清除搜索",
    },
}

for lang, keys in TRANSLATIONS.items():
    path = os.path.join(LOCALES_DIR, lang, "calendar.json")
    if not os.path.exists(path):
        print(f"  SKIP {path} (nicht gefunden)")
        continue
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    changed = False
    for key, value in keys.items():
        if key not in data:
            data[key] = value
            changed = True
            print(f"  [{lang}] +{key}: {value}")
        else:
            print(f"  [{lang}] ={key} (bereits vorhanden)")
    
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  [{lang}] calendar.json aktualisiert")

print("Fertig.")
