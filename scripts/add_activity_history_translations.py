"""Ergänzt Verlaufscodes und Wertehilfen in allen unterstützten Sprachen."""

import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "client" / "public" / "locales"

ACTION_TRANSLATIONS = {
    "de": {
        "created": "Erstellt", "updated": "Aktualisiert", "update": "Rotationsplan aktualisiert",
        "completed": "Abgeschlossen", "uncompleted": "Als offen markiert", "deleted": "Gelöscht",
        "milestone": "Zwischenziel erfasst", "reminder": "Erinnerung gesendet", "skipped": "Termin übersprungen",
        "restored": "Termin wiederhergestellt", "commented": "Kommentar hinzugefügt",
        "change_proposed": "Änderung vorgeschlagen", "change_proposal_withdrawn": "Änderungsvorschlag zurückgezogen",
        "change_proposal_approved": "Änderungsvorschlag angenommen", "change_proposal_rejected": "Änderungsvorschlag abgelehnt",
    },
    "en": {
        "created": "Created", "updated": "Updated", "update": "Rotation schedule updated",
        "completed": "Completed", "uncompleted": "Marked as open", "deleted": "Deleted",
        "milestone": "Milestone recorded", "reminder": "Reminder sent", "skipped": "Appointment skipped",
        "restored": "Appointment restored", "commented": "Comment added",
        "change_proposed": "Change proposed", "change_proposal_withdrawn": "Change proposal withdrawn",
        "change_proposal_approved": "Change proposal approved", "change_proposal_rejected": "Change proposal rejected",
    },
    "es": {
        "created": "Creado", "updated": "Actualizado", "update": "Plan de rotación actualizado",
        "completed": "Completado", "uncompleted": "Marcado como pendiente", "deleted": "Eliminado",
        "milestone": "Hito registrado", "reminder": "Recordatorio enviado", "skipped": "Cita omitida",
        "restored": "Cita restaurada", "commented": "Comentario añadido",
        "change_proposed": "Cambio propuesto", "change_proposal_withdrawn": "Propuesta de cambio retirada",
        "change_proposal_approved": "Propuesta de cambio aprobada", "change_proposal_rejected": "Propuesta de cambio rechazada",
    },
    "fr": {
        "created": "Créé", "updated": "Mis à jour", "update": "Planning de rotation mis à jour",
        "completed": "Terminé", "uncompleted": "Marqué comme ouvert", "deleted": "Supprimé",
        "milestone": "Jalon enregistré", "reminder": "Rappel envoyé", "skipped": "Rendez-vous ignoré",
        "restored": "Rendez-vous restauré", "commented": "Commentaire ajouté",
        "change_proposed": "Modification proposée", "change_proposal_withdrawn": "Proposition de modification retirée",
        "change_proposal_approved": "Proposition de modification acceptée", "change_proposal_rejected": "Proposition de modification refusée",
    },
    "tr": {
        "created": "Oluşturuldu", "updated": "Güncellendi", "update": "Dönüşüm planı güncellendi",
        "completed": "Tamamlandı", "uncompleted": "Açık olarak işaretlendi", "deleted": "Silindi",
        "milestone": "Ara hedef kaydedildi", "reminder": "Hatırlatıcı gönderildi", "skipped": "Randevu atlandı",
        "restored": "Randevu geri yüklendi", "commented": "Yorum eklendi",
        "change_proposed": "Değişiklik önerildi", "change_proposal_withdrawn": "Değişiklik önerisi geri çekildi",
        "change_proposal_approved": "Değişiklik önerisi kabul edildi", "change_proposal_rejected": "Değişiklik önerisi reddedildi",
    },
    "zh": {
        "created": "已创建", "updated": "已更新", "update": "轮换计划已更新",
        "completed": "已完成", "uncompleted": "已标记为未完成", "deleted": "已删除",
        "milestone": "已记录里程碑", "reminder": "已发送提醒", "skipped": "已跳过预约",
        "restored": "已恢复预约", "commented": "已添加评论",
        "change_proposed": "已提出修改", "change_proposal_withdrawn": "已撤回修改建议",
        "change_proposal_approved": "已接受修改建议", "change_proposal_rejected": "已拒绝修改建议",
    },
    "ar": {
        "created": "تم الإنشاء", "updated": "تم التحديث", "update": "تم تحديث جدول التناوب",
        "completed": "تم الإكمال", "uncompleted": "تم وضع علامة مفتوحة", "deleted": "تم الحذف",
        "milestone": "تم تسجيل المرحلة", "reminder": "تم إرسال التذكير", "skipped": "تم تخطي الموعد",
        "restored": "تمت استعادة الموعد", "commented": "تمت إضافة تعليق",
        "change_proposed": "تم اقتراح تغيير", "change_proposal_withdrawn": "تم سحب اقتراح التغيير",
        "change_proposal_approved": "تم قبول اقتراح التغيير", "change_proposal_rejected": "تم رفض اقتراح التغيير",
    },
}

MINUTES = {
    "de": "{{count}} Minuten", "en": "{{count}} minutes", "es": "{{count}} minutos",
    "fr": "{{count}} minutes", "tr": "{{count}} dakika", "zh": "{{count}} 分钟", "ar": "{{count}} دقيقة",
}

REPEAT_DAYS = {
    "de": "{{count}} Tage", "en": "{{count}} days", "es": "{{count}} días",
    "fr": "{{count}} jours", "tr": "{{count}} gün", "zh": "{{count}} 天", "ar": "{{count}} أيام",
}

for language, action_values in ACTION_TRANSLATIONS.items():
    history_path = BASE / language / "history.json"
    data = json.loads(history_path.read_text(encoding="utf-8"))
    data.setdefault("actions", {}).update(action_values)
    data.setdefault("values", {})["minutes"] = MINUTES[language]
    history_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    tasks_path = BASE / language / "tasks.json"
    tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    tasks.setdefault("repeat", {})["daysN"] = REPEAT_DAYS[language]
    tasks_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Verlaufsübersetzungen für 7 Sprachen ergänzt.")
