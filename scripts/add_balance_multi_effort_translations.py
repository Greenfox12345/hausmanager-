import json
from pathlib import Path

translations = {
    "de": {"addPayment": "Zahlung hinzufügen", "addWork": "Arbeitszeit hinzufügen", "removeEffort": "Aufwand entfernen", "multipleEffortsHint": "Sie können mehrere Zahlungen und Arbeitszeiten für verschiedene Personen hinzufügen.", "requiredEffort": "Bitte erfassen Sie mindestens einen vollständigen Bilanzaufwand."},
    "en": {"addPayment": "Add payment", "addWork": "Add work time", "removeEffort": "Remove effort", "multipleEffortsHint": "You can add several payments and work times for different people.", "requiredEffort": "Please add at least one complete balance effort."},
    "es": {"addPayment": "Añadir pago", "addWork": "Añadir tiempo de trabajo", "removeEffort": "Eliminar esfuerzo", "multipleEffortsHint": "Puede añadir varios pagos y tiempos de trabajo para distintas personas.", "requiredEffort": "Añada al menos un gasto completo."},
    "fr": {"addPayment": "Ajouter un paiement", "addWork": "Ajouter du temps de travail", "removeEffort": "Retirer l’effort", "multipleEffortsHint": "Vous pouvez ajouter plusieurs paiements et temps de travail pour différentes personnes.", "requiredEffort": "Ajoutez au moins un effort complet."},
    "tr": {"addPayment": "Ödeme ekle", "addWork": "Çalışma süresi ekle", "removeEffort": "Eforu kaldır", "multipleEffortsHint": "Farklı kişiler için birden fazla ödeme ve çalışma süresi ekleyebilirsiniz.", "requiredEffort": "Lütfen en az bir tam bilanço kaydı ekleyin."},
    "zh": {"addPayment": "添加付款", "addWork": "添加工时", "removeEffort": "移除记录", "multipleEffortsHint": "您可以为不同成员添加多笔付款和工时。", "requiredEffort": "请至少添加一条完整记录。"},
    "ar": {"addPayment": "إضافة دفعة", "addWork": "إضافة وقت عمل", "removeEffort": "إزالة الإدخال", "multipleEffortsHint": "يمكنك إضافة عدة دفعات وأوقات عمل لأشخاص مختلفين.", "requiredEffort": "يرجى إضافة إدخال ميزان مكتمل واحد على الأقل."},
}

for language, values in translations.items():
    target = Path(f"client/public/locales/{language}/balance.json")
    payload = json.loads(target.read_text(encoding="utf-8"))
    payload.update(values)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
