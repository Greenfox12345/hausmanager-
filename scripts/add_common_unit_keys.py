#!/usr/bin/env python3
"""Add missing common keys (error, save, delete) to all 7 locale common.json files."""
import json, os

LOCALES_DIR = "/home/ubuntu/haushaltsmanager/client/public/locales"

# Keys to add at top-level of common.json
KEYS = {
    "de": {"error": "Fehler", "save": "Speichern", "delete": "Löschen", "cancel": "Abbrechen", "add": "Hinzufügen"},
    "en": {"error": "Error", "save": "Save", "delete": "Delete", "cancel": "Cancel", "add": "Add"},
    "ar": {"error": "خطأ", "save": "حفظ", "delete": "حذف", "cancel": "إلغاء", "add": "إضافة"},
    "es": {"error": "Error", "save": "Guardar", "delete": "Eliminar", "cancel": "Cancelar", "add": "Añadir"},
    "fr": {"error": "Erreur", "save": "Enregistrer", "delete": "Supprimer", "cancel": "Annuler", "add": "Ajouter"},
    "tr": {"error": "Hata", "save": "Kaydet", "delete": "Sil", "cancel": "İptal", "add": "Ekle"},
    "zh": {"error": "错误", "save": "保存", "delete": "删除", "cancel": "取消", "add": "添加"},
}

for lang, new_keys in KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    changed = False
    for key, value in new_keys.items():
        if key not in data:
            data[key] = value
            changed = True
            print(f"  [{lang}] Added '{key}': '{value}'")
    
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {path}")
    else:
        print(f"[{lang}] No changes needed")

print("Done!")
