#!/usr/bin/env python3
import json, os

BASE = "/home/ubuntu/haushaltsmanager/client/public/locales"

KEYS = {
    "de": {
        "partiallyAvailable": "Teilweise verfügbar",
        "quantity": {
            "conflict": "{{count}} bereits ausgeliehen ({{period}})",
            "conflictBy": "von {{name}}",
        },
    },
    "en": {
        "partiallyAvailable": "Partially available",
        "quantity": {
            "conflict": "{{count}} already borrowed ({{period}})",
            "conflictBy": "by {{name}}",
        },
    },
    "es": {
        "partiallyAvailable": "Parcialmente disponible",
        "quantity": {
            "conflict": "{{count}} ya prestado ({{period}})",
            "conflictBy": "por {{name}}",
        },
    },
    "fr": {
        "partiallyAvailable": "Partiellement disponible",
        "quantity": {
            "conflict": "{{count}} déjà emprunté ({{period}})",
            "conflictBy": "par {{name}}",
        },
    },
    "tr": {
        "partiallyAvailable": "Kısmen mevcut",
        "quantity": {
            "conflict": "{{count}} zaten ödünç alındı ({{period}})",
            "conflictBy": "{{name}} tarafından",
        },
    },
    "ar": {
        "partiallyAvailable": "متاح جزئياً",
        "quantity": {
            "conflict": "تم استعارة {{count}} بالفعل ({{period}})",
            "conflictBy": "بواسطة {{name}}",
        },
    },
    "zh": {
        "partiallyAvailable": "部分可用",
        "quantity": {
            "conflict": "已借出 {{count}}（{{period}}）",
            "conflictBy": "由 {{name}}",
        },
    },
}

def deep_merge(base, updates):
    for k, v in updates.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v

for lang, keys in KEYS.items():
    path = os.path.join(BASE, lang, "borrow.json")
    if not os.path.exists(path):
        print(f"SKIP: {path}")
        continue
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    deep_merge(data, keys)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated [{lang}]")

print("Done.")
