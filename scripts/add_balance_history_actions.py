import json
from pathlib import Path

actions = {
    "de": {"balance_entry_created": "Bilanzaufwand erfasst", "balance_entry_updated": "Bilanzaufwand aktualisiert", "balance_entry_deleted": "Bilanzaufwand gelöscht"},
    "en": {"balance_entry_created": "Balance effort recorded", "balance_entry_updated": "Balance effort updated", "balance_entry_deleted": "Balance effort deleted"},
    "es": {"balance_entry_created": "Gasto registrado", "balance_entry_updated": "Gasto actualizado", "balance_entry_deleted": "Gasto eliminado"},
    "fr": {"balance_entry_created": "Effort enregistré", "balance_entry_updated": "Effort mis à jour", "balance_entry_deleted": "Effort supprimé"},
    "tr": {"balance_entry_created": "Bilanço kaydı eklendi", "balance_entry_updated": "Bilanço kaydı güncellendi", "balance_entry_deleted": "Bilanço kaydı silindi"},
    "zh": {"balance_entry_created": "已添加收支与工时记录", "balance_entry_updated": "已更新收支与工时记录", "balance_entry_deleted": "已删除收支与工时记录"},
    "ar": {"balance_entry_created": "تم تسجيل إدخال الميزان", "balance_entry_updated": "تم تحديث إدخال الميزان", "balance_entry_deleted": "تم حذف إدخال الميزان"},
}

for language, values in actions.items():
    target = Path(f"client/public/locales/{language}/history.json")
    payload = json.loads(target.read_text(encoding="utf-8"))
    payload.setdefault("actions", {}).update(values)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
