#!/usr/bin/env python3
"""Fügt listView und gridView in den actions-Abschnitt aller common.json-Dateien ein."""
import json, os

translations = {
    "de": {"listView": "Listen", "gridView": "Kacheln"},
    "en": {"listView": "List", "gridView": "Grid"},
    "ar": {"listView": "قائمة", "gridView": "شبكة"},
    "es": {"listView": "Lista", "gridView": "Cuadrícula"},
    "fr": {"listView": "Liste", "gridView": "Grille"},
    "tr": {"listView": "Liste", "gridView": "Izgara"},
    "zh": {"listView": "列表", "gridView": "网格"},
}

base = "/home/ubuntu/haushaltsmanager/client/public/locales"
for lang, keys in translations.items():
    path = os.path.join(base, lang, "common.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "actions" not in data:
        data["actions"] = {}
    data["actions"]["listView"] = keys["listView"]
    data["actions"]["gridView"] = keys["gridView"]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ {lang}/common.json aktualisiert")

print("Fertig.")
