#!/usr/bin/env python3
"""Add missing inventory:actions.editQuantity key to all 7 locale inventory.json files."""
import json, os

LOCALES_DIR = "/home/ubuntu/haushaltsmanager/client/public/locales"

TRANSLATIONS = {
    "de": "Menge direkt eingeben",
    "en": "Edit quantity directly",
    "ar": "تعديل الكمية مباشرة",
    "es": "Editar cantidad directamente",
    "fr": "Modifier la quantité directement",
    "tr": "Miktarı doğrudan düzenle",
    "zh": "直接编辑数量",
}

for lang, value in TRANSLATIONS.items():
    path = os.path.join(LOCALES_DIR, lang, "inventory.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "actions" not in data:
        data["actions"] = {}
    if "editQuantity" not in data["actions"]:
        data["actions"]["editQuantity"] = value
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[{lang}] Added actions.editQuantity")
    else:
        print(f"[{lang}] Already present")

# Also add itemCount key
ITEM_COUNT = {
    "de": "Artikel",
    "en": "items",
    "ar": "عناصر",
    "es": "artículos",
    "fr": "articles",
    "tr": "öğe",
    "zh": "件",
}

for lang, value in ITEM_COUNT.items():
    path = os.path.join(LOCALES_DIR, lang, "inventory.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "messages" not in data:
        data["messages"] = {}
    if "itemCount" not in data["messages"]:
        data["messages"]["itemCount"] = value
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[{lang}] Added messages.itemCount")
    else:
        print(f"[{lang}] itemCount already present")

print("Done!")
