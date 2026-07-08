#!/usr/bin/env python3
"""Add new i18n keys for borrow quantity tracking and inventory availability."""
import json, os

BASE = "/home/ubuntu/haushaltsmanager/client/public/locales"

# Keys to add to borrow.json namespace
BORROW_KEYS = {
    "de": {
        "quantity": {
            "label": "Anzahl",
            "units": "Stk.",
            "exceedsAvailable": "Maximal {{max}} verfügbar",
            "conflictInfo": "Bereits {{count}} ausgeliehen ({{period}})",
            "conflictInfoNamed": "{{name}} hat bereits {{count}} ausgeliehen ({{period}})",
            "available": "{{count}} verfügbar",
            "totalAvailable": "{{available}} von {{total}} verfügbar",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} ausgeliehen · {{returned}} zurückgegeben · {{remaining}} ausstehend",
            "partialReturn": "Teilrückgabe",
            "partialNote": "Notiz zur Teilrückgabe",
            "partialNotePlaceholder": "Optional: Hinweis zur Teilrückgabe",
            "confirmPartial": "Teilrückgabe bestätigen",
            "partialSuccess": "{{returned}} {{unit}} zurückgegeben, noch {{remaining}} ausstehend",
            "partialFullyReturned": "Alle Teile zurückgegeben – Ausleihe abgeschlossen",
        },
    },
    "en": {
        "quantity": {
            "label": "Quantity",
            "units": "pcs.",
            "exceedsAvailable": "Maximum {{max}} available",
            "conflictInfo": "Already {{count}} borrowed ({{period}})",
            "conflictInfoNamed": "{{name}} has already borrowed {{count}} ({{period}})",
            "available": "{{count}} available",
            "totalAvailable": "{{available}} of {{total}} available",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} borrowed · {{returned}} returned · {{remaining}} outstanding",
            "partialReturn": "Partial return",
            "partialNote": "Note for partial return",
            "partialNotePlaceholder": "Optional: note about partial return",
            "confirmPartial": "Confirm partial return",
            "partialSuccess": "{{returned}} {{unit}} returned, {{remaining}} still outstanding",
            "partialFullyReturned": "All items returned – loan completed",
        },
    },
    "es": {
        "quantity": {
            "label": "Cantidad",
            "units": "uds.",
            "exceedsAvailable": "Máximo {{max}} disponible",
            "conflictInfo": "Ya {{count}} prestado ({{period}})",
            "conflictInfoNamed": "{{name}} ya tiene {{count}} prestado ({{period}})",
            "available": "{{count}} disponible",
            "totalAvailable": "{{available}} de {{total}} disponible",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} prestado · {{returned}} devuelto · {{remaining}} pendiente",
            "partialReturn": "Devolución parcial",
            "partialNote": "Nota de devolución parcial",
            "partialNotePlaceholder": "Opcional: nota sobre la devolución parcial",
            "confirmPartial": "Confirmar devolución parcial",
            "partialSuccess": "{{returned}} {{unit}} devuelto, {{remaining}} pendiente",
            "partialFullyReturned": "Todos los artículos devueltos – préstamo completado",
        },
    },
    "fr": {
        "quantity": {
            "label": "Quantité",
            "units": "pcs.",
            "exceedsAvailable": "Maximum {{max}} disponible",
            "conflictInfo": "Déjà {{count}} emprunté ({{period}})",
            "conflictInfoNamed": "{{name}} a déjà emprunté {{count}} ({{period}})",
            "available": "{{count}} disponible",
            "totalAvailable": "{{available}} sur {{total}} disponible",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} emprunté · {{returned}} rendu · {{remaining}} en attente",
            "partialReturn": "Retour partiel",
            "partialNote": "Note de retour partiel",
            "partialNotePlaceholder": "Optionnel : note sur le retour partiel",
            "confirmPartial": "Confirmer le retour partiel",
            "partialSuccess": "{{returned}} {{unit}} rendu, {{remaining}} encore en attente",
            "partialFullyReturned": "Tous les articles rendus – emprunt terminé",
        },
    },
    "tr": {
        "quantity": {
            "label": "Miktar",
            "units": "adet",
            "exceedsAvailable": "Maksimum {{max}} mevcut",
            "conflictInfo": "Zaten {{count}} ödünç alındı ({{period}})",
            "conflictInfoNamed": "{{name}} zaten {{count}} ödünç aldı ({{period}})",
            "available": "{{count}} mevcut",
            "totalAvailable": "{{total}} adet içinden {{available}} mevcut",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} ödünç alındı · {{returned}} iade edildi · {{remaining}} bekliyor",
            "partialReturn": "Kısmi iade",
            "partialNote": "Kısmi iade notu",
            "partialNotePlaceholder": "İsteğe bağlı: kısmi iade hakkında not",
            "confirmPartial": "Kısmi iadeyi onayla",
            "partialSuccess": "{{returned}} {{unit}} iade edildi, {{remaining}} hâlâ bekliyor",
            "partialFullyReturned": "Tüm parçalar iade edildi – ödünç tamamlandı",
        },
    },
    "ar": {
        "quantity": {
            "label": "الكمية",
            "units": "قطعة",
            "exceedsAvailable": "الحد الأقصى {{max}} متاح",
            "conflictInfo": "تم استعارة {{count}} بالفعل ({{period}})",
            "conflictInfoNamed": "استعار {{name}} بالفعل {{count}} ({{period}})",
            "available": "{{count}} متاح",
            "totalAvailable": "{{available}} من {{total}} متاح",
        },
        "returnDialog": {
            "quantitySummary": "{{loan}} {{unit}} مستعار · {{returned}} مُعاد · {{remaining}} معلق",
            "partialReturn": "إعادة جزئية",
            "partialNote": "ملاحظة الإعادة الجزئية",
            "partialNotePlaceholder": "اختياري: ملاحظة حول الإعادة الجزئية",
            "confirmPartial": "تأكيد الإعادة الجزئية",
            "partialSuccess": "تم إعادة {{returned}} {{unit}}، لا يزال {{remaining}} معلقاً",
            "partialFullyReturned": "تمت إعادة جميع العناصر – اكتملت الاستعارة",
        },
    },
    "zh": {
        "quantity": {
            "label": "数量",
            "units": "件",
            "exceedsAvailable": "最多可借 {{max}}",
            "conflictInfo": "已借出 {{count}}（{{period}}）",
            "conflictInfoNamed": "{{name}} 已借出 {{count}}（{{period}}）",
            "available": "{{count}} 可用",
            "totalAvailable": "{{total}} 中有 {{available}} 可用",
        },
        "returnDialog": {
            "quantitySummary": "已借 {{loan}} {{unit}} · 已还 {{returned}} · 待还 {{remaining}}",
            "partialReturn": "部分归还",
            "partialNote": "部分归还备注",
            "partialNotePlaceholder": "可选：关于部分归还的备注",
            "confirmPartial": "确认部分归还",
            "partialSuccess": "已归还 {{returned}} {{unit}}，仍有 {{remaining}} 待还",
            "partialFullyReturned": "所有物品已归还 – 借用完成",
        },
    },
}

# Keys to add to inventory.json namespace
INVENTORY_KEYS = {
    "de": {
        "availability": {
            "borrowed": "ausgeliehen",
            "reserved": "reserviert",
            "available": "verfügbar",
        },
        "quantity": {
            "units": "Stk.",
        },
    },
    "en": {
        "availability": {
            "borrowed": "borrowed",
            "reserved": "reserved",
            "available": "available",
        },
        "quantity": {
            "units": "pcs.",
        },
    },
    "es": {
        "availability": {
            "borrowed": "prestado",
            "reserved": "reservado",
            "available": "disponible",
        },
        "quantity": {
            "units": "uds.",
        },
    },
    "fr": {
        "availability": {
            "borrowed": "emprunté",
            "reserved": "réservé",
            "available": "disponible",
        },
        "quantity": {
            "units": "pcs.",
        },
    },
    "tr": {
        "availability": {
            "borrowed": "ödünç alındı",
            "reserved": "rezerve edildi",
            "available": "mevcut",
        },
        "quantity": {
            "units": "adet",
        },
    },
    "ar": {
        "availability": {
            "borrowed": "مستعار",
            "reserved": "محجوز",
            "available": "متاح",
        },
        "quantity": {
            "units": "قطعة",
        },
    },
    "zh": {
        "availability": {
            "borrowed": "已借出",
            "reserved": "已预约",
            "available": "可用",
        },
        "quantity": {
            "units": "件",
        },
    },
}

def deep_merge(base, updates):
    for k, v in updates.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v

for lang, keys in BORROW_KEYS.items():
    path = os.path.join(BASE, lang, "borrow.json")
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        continue
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    deep_merge(data, keys)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated borrow.json [{lang}]")

for lang, keys in INVENTORY_KEYS.items():
    path = os.path.join(BASE, lang, "inventory.json")
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        continue
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    deep_merge(data, keys)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated inventory.json [{lang}]")

print("Done.")
