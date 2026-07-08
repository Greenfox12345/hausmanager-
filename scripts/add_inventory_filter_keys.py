#!/usr/bin/env python3
"""Add new inventory filter/view i18n keys to all 7 locale inventory.json files."""
import json, os

LOCALES_DIR = "/home/ubuntu/haushaltsmanager/client/public/locales"

NEW_KEYS = {
    "de": {
        "filter.unit": "Einheit",
        "filter.allUnits": "Alle Einheiten",
        "filter.noUnit": "Ohne Einheit",
        "filter.hideImages": "Ohne Bilder",
        "filter.showImages": "Mit Bildern",
    },
    "en": {
        "filter.unit": "Unit",
        "filter.allUnits": "All units",
        "filter.noUnit": "No unit",
        "filter.hideImages": "Without images",
        "filter.showImages": "With images",
    },
    "ar": {
        "filter.unit": "الوحدة",
        "filter.allUnits": "جميع الوحدات",
        "filter.noUnit": "بدون وحدة",
        "filter.hideImages": "بدون صور",
        "filter.showImages": "مع الصور",
    },
    "es": {
        "filter.unit": "Unidad",
        "filter.allUnits": "Todas las unidades",
        "filter.noUnit": "Sin unidad",
        "filter.hideImages": "Sin imágenes",
        "filter.showImages": "Con imágenes",
    },
    "fr": {
        "filter.unit": "Unité",
        "filter.allUnits": "Toutes les unités",
        "filter.noUnit": "Sans unité",
        "filter.hideImages": "Sans images",
        "filter.showImages": "Avec images",
    },
    "tr": {
        "filter.unit": "Birim",
        "filter.allUnits": "Tüm birimler",
        "filter.noUnit": "Birim yok",
        "filter.hideImages": "Görselsiz",
        "filter.showImages": "Görsellerle",
    },
    "zh": {
        "filter.unit": "单位",
        "filter.allUnits": "所有单位",
        "filter.noUnit": "无单位",
        "filter.hideImages": "不显示图片",
        "filter.showImages": "显示图片",
    },
}

def set_nested(d, dotted_key, value):
    parts = dotted_key.split(".")
    for part in parts[:-1]:
        d = d.setdefault(part, {})
    if parts[-1] not in d:
        d[parts[-1]] = value
        return True
    return False

for lang, keys in NEW_KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "inventory.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    changed = False
    for dotted_key, value in keys.items():
        if set_nested(data, dotted_key, value):
            print(f"  [{lang}] Added {dotted_key}")
            changed = True
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {path}")
    else:
        print(f"[{lang}] No changes needed")

print("Done!")
