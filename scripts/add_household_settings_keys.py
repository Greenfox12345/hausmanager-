#!/usr/bin/env python3
"""Add new household.settings keys for categories/units overview to all 7 locale common.json files."""
import json, os

LOCALES_DIR = "/home/ubuntu/haushaltsmanager/client/public/locales"

# New keys to add inside household.settings object
NEW_SETTINGS_KEYS = {
    "de": {
        "title": "Einstellungen",
        "general": "Haushalt",
        "languageHint": "Nur Admins können die Haushaltssprache ändern.",
        "onlyAdminCanChange": "Nur der Haushaltsersteller kann die Haushaltssprache ändern.",
        "categories": "Kategorien",
        "categoriesHint": "Kategorien für Einkaufsliste und Inventar verwalten",
        "noCategories": "Noch keine Kategorien vorhanden.",
        "newCategory": "Neue Kategorie",
        "categoryNamePlaceholder": "z. B. Getränke",
        "categoryAdded": "Kategorie hinzugefügt",
        "categoryUpdated": "Kategorie aktualisiert",
        "categoryDeleted": "Kategorie gelöscht",
        "deleteCategoryTitle": "Kategorie löschen?",
        "deleteCategoryDesc": "Die Kategorie wird von allen zugehörigen Einträgen entfernt.",
        "unitsHint": "Einheiten für Mengenangaben haushaltsweit verwalten",
    },
    "en": {
        "title": "Settings",
        "general": "Household",
        "languageHint": "Only admins can change the household language.",
        "onlyAdminCanChange": "Only the household creator can change the household language.",
        "categories": "Categories",
        "categoriesHint": "Manage categories for shopping list and inventory",
        "noCategories": "No categories yet.",
        "newCategory": "New Category",
        "categoryNamePlaceholder": "e.g. Beverages",
        "categoryAdded": "Category added",
        "categoryUpdated": "Category updated",
        "categoryDeleted": "Category deleted",
        "deleteCategoryTitle": "Delete category?",
        "deleteCategoryDesc": "The category will be removed from all associated entries.",
        "unitsHint": "Manage units for quantities household-wide",
    },
    "ar": {
        "title": "الإعدادات",
        "general": "المنزل",
        "languageHint": "يمكن للمسؤولين فقط تغيير لغة المنزل.",
        "onlyAdminCanChange": "يمكن لمنشئ المنزل فقط تغيير لغة المنزل.",
        "categories": "الفئات",
        "categoriesHint": "إدارة فئات قائمة التسوق والمخزون",
        "noCategories": "لا توجد فئات بعد.",
        "newCategory": "فئة جديدة",
        "categoryNamePlaceholder": "مثال: المشروبات",
        "categoryAdded": "تمت إضافة الفئة",
        "categoryUpdated": "تم تحديث الفئة",
        "categoryDeleted": "تم حذف الفئة",
        "deleteCategoryTitle": "حذف الفئة؟",
        "deleteCategoryDesc": "سيتم إزالة الفئة من جميع الإدخالات المرتبطة بها.",
        "unitsHint": "إدارة وحدات الكميات على مستوى المنزل",
    },
    "es": {
        "title": "Configuración",
        "general": "Hogar",
        "languageHint": "Solo los administradores pueden cambiar el idioma del hogar.",
        "onlyAdminCanChange": "Solo el creador del hogar puede cambiar el idioma del hogar.",
        "categories": "Categorías",
        "categoriesHint": "Gestionar categorías para la lista de compras e inventario",
        "noCategories": "Aún no hay categorías.",
        "newCategory": "Nueva categoría",
        "categoryNamePlaceholder": "p. ej. Bebidas",
        "categoryAdded": "Categoría añadida",
        "categoryUpdated": "Categoría actualizada",
        "categoryDeleted": "Categoría eliminada",
        "deleteCategoryTitle": "¿Eliminar categoría?",
        "deleteCategoryDesc": "La categoría se eliminará de todas las entradas asociadas.",
        "unitsHint": "Gestionar unidades de cantidad en todo el hogar",
    },
    "fr": {
        "title": "Paramètres",
        "general": "Foyer",
        "languageHint": "Seuls les administrateurs peuvent changer la langue du foyer.",
        "onlyAdminCanChange": "Seul le créateur du foyer peut changer la langue du foyer.",
        "categories": "Catégories",
        "categoriesHint": "Gérer les catégories pour la liste de courses et l'inventaire",
        "noCategories": "Pas encore de catégories.",
        "newCategory": "Nouvelle catégorie",
        "categoryNamePlaceholder": "ex. Boissons",
        "categoryAdded": "Catégorie ajoutée",
        "categoryUpdated": "Catégorie mise à jour",
        "categoryDeleted": "Catégorie supprimée",
        "deleteCategoryTitle": "Supprimer la catégorie ?",
        "deleteCategoryDesc": "La catégorie sera supprimée de toutes les entrées associées.",
        "unitsHint": "Gérer les unités de quantité à l'échelle du foyer",
    },
    "tr": {
        "title": "Ayarlar",
        "general": "Hane",
        "languageHint": "Yalnızca yöneticiler hane dilini değiştirebilir.",
        "onlyAdminCanChange": "Yalnızca hane kurucusu hane dilini değiştirebilir.",
        "categories": "Kategoriler",
        "categoriesHint": "Alışveriş listesi ve envanter için kategorileri yönetin",
        "noCategories": "Henüz kategori yok.",
        "newCategory": "Yeni Kategori",
        "categoryNamePlaceholder": "örn. İçecekler",
        "categoryAdded": "Kategori eklendi",
        "categoryUpdated": "Kategori güncellendi",
        "categoryDeleted": "Kategori silindi",
        "deleteCategoryTitle": "Kategori silinsin mi?",
        "deleteCategoryDesc": "Kategori ilgili tüm girişlerden kaldırılacak.",
        "unitsHint": "Hane genelinde miktar birimlerini yönetin",
    },
    "zh": {
        "title": "设置",
        "general": "家庭",
        "languageHint": "只有管理员可以更改家庭语言。",
        "onlyAdminCanChange": "只有家庭创建者可以更改家庭语言。",
        "categories": "分类",
        "categoriesHint": "管理购物清单和库存的分类",
        "noCategories": "暂无分类。",
        "newCategory": "新建分类",
        "categoryNamePlaceholder": "例如：饮料",
        "categoryAdded": "分类已添加",
        "categoryUpdated": "分类已更新",
        "categoryDeleted": "分类已删除",
        "deleteCategoryTitle": "删除分类？",
        "deleteCategoryDesc": "该分类将从所有相关条目中移除。",
        "unitsHint": "管理全家庭的数量单位",
    },
}

for lang, new_settings in NEW_SETTINGS_KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Ensure household.settings exists
    if "household" not in data:
        data["household"] = {}
    if "settings" not in data["household"]:
        data["household"]["settings"] = {}
    
    changed = False
    for key, value in new_settings.items():
        if key not in data["household"]["settings"]:
            data["household"]["settings"][key] = value
            changed = True
            print(f"  [{lang}] Added household.settings.{key}")
    
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {path}")
    else:
        print(f"[{lang}] No changes needed")

print("Done!")
