#!/usr/bin/env python3
"""Fügt navigation.home in alle common.json-Dateien ein."""
import json, os

translations = {
    "de": "Startseite",
    "en": "Home",
    "ar": "الرئيسية",
    "es": "Inicio",
    "fr": "Accueil",
    "tr": "Ana Sayfa",
    "zh": "首页",
}

base = "/home/ubuntu/haushaltsmanager/client/public/locales"
for lang, value in translations.items():
    path = os.path.join(base, lang, "common.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "navigation" not in data:
        data["navigation"] = {}
    data["navigation"]["home"] = value
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ {lang}/common.json aktualisiert")

print("Fertig.")
