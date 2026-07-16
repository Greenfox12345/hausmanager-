/**
 * Centralized multilingual activity log text generator.
 * All history entries are generated in the household's configured language (de/en/es/fr/zh/tr/ar).
 */

type Lang = "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar";

function t(lang: Lang, de: string, en: string, es: string, fr: string, zh: string, tr: string, ar: string): string {
  if (lang === "en") return en;
  if (lang === "es") return es;
  if (lang === "fr") return fr;
  if (lang === "zh") return zh;
  if (lang === "tr") return tr;
  if (lang === "ar") return ar;
  return de;
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export function shoppingItemAdded(lang: Lang, itemName: string, category?: string): string {
  const cat = category ? t(lang,
    ` (Kategorie: ${category})`,
    ` (category: ${category})`,
    ` (categoría: ${category})`,
    ` (catégorie : ${category})`,
    `（分类：${category}）`,
    ` (kategori: ${category})`,
    ` (الفئة: ${category})`
  ) : "";
  return t(lang,
    `Artikel „${itemName}"${cat} zur Einkaufsliste hinzugefügt`,
    `Item "${itemName}"${cat} added to shopping list`,
    `Artículo "${itemName}"${cat} añadido a la lista de compras`,
    `Article « ${itemName} »${cat} ajouté à la liste de courses`,
    `已将"${itemName}"${cat}添加到购物清单`,
    `"${itemName}"${cat} alışveriş listesine eklendi`,
    `تمت إضافة "${itemName}"${cat} إلى قائمة التسوق`
  );
}

export function shoppingItemUpdated(lang: Lang, itemName: string, changes?: string): string {
  const ch = changes ? t(lang, `: ${changes}`, `: ${changes}`, `: ${changes}`, ` : ${changes}`, `：${changes}`, `: ${changes}`, `: ${changes}`) : "";
  return t(lang,
    `Artikel „${itemName}" in der Einkaufsliste aktualisiert${ch}`,
    `Shopping item "${itemName}" updated${ch}`,
    `Artículo "${itemName}" actualizado en la lista de compras${ch}`,
    `Article « ${itemName} » mis à jour dans la liste de courses${ch}`,
    `购物清单中的"${itemName}"已更新${ch}`,
    `Alışveriş listesindeki "${itemName}" güncellendi${ch}`,
    `تم تحديث "${itemName}" في قائمة التسوق${ch}`
  );
}

export function shoppingItemDeleted(lang: Lang, itemName: string): string {
  return t(lang,
    `Artikel „${itemName}" aus der Einkaufsliste entfernt`,
    `Item "${itemName}" removed from shopping list`,
    `Artículo "${itemName}" eliminado de la lista de compras`,
    `Article « ${itemName} » supprimé de la liste de courses`,
    `已从购物清单中删除"${itemName}"`,
    `"${itemName}" alışveriş listesinden kaldırıldı`,
    `تمت إزالة "${itemName}" من قائمة التسوق`
  );
}

export function shoppingBatchCompleted(lang: Lang, count: number, listName?: string): string {
  const list = listName ? t(lang,
    ` aus Liste „${listName}"`,
    ` from list "${listName}"`,
    ` de la lista "${listName}"`,
    ` de la liste « ${listName} »`,
    `（来自清单"${listName}"）`,
    ` "${listName}" listesinden`,
    ` من قائمة "${listName}"`
  ) : "";
  return t(lang,
    `${count} Artikel${list} als eingekauft markiert`,
    `${count} item${count !== 1 ? "s" : ""}${list} marked as purchased`,
    `${count} artículo${count !== 1 ? "s" : ""}${list} marcado${count !== 1 ? "s" : ""} como comprado${count !== 1 ? "s" : ""}`,
    `${count} article${count !== 1 ? "s" : ""}${list} marqué${count !== 1 ? "s" : ""} comme acheté${count !== 1 ? "s" : ""}`,
    `${count} 件商品${list}已标记为已购买`,
    `${count} ürün${list} satın alındı olarak işaretlendi`,
    `تم تحديد ${count} عنصر${list} كمشترى`
  );
}

export function shoppingCategoryAdded(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" erstellt`,
    `Shopping category "${categoryName}" created`,
    `Categoría de compras "${categoryName}" creada`,
    `Catégorie de courses « ${categoryName} » créée`,
    `已创建购物分类"${categoryName}"`,
    `"${categoryName}" alışveriş kategorisi oluşturuldu`,
    `تم إنشاء فئة التسوق "${categoryName}"`
  );
}

export function shoppingCategoryUpdated(lang: Lang, oldName: string, newName: string): string {
  return t(lang,
    `Einkaufskategorie „${oldName}" in „${newName}" umbenannt`,
    `Shopping category "${oldName}" renamed to "${newName}"`,
    `Categoría de compras "${oldName}" renombrada a "${newName}"`,
    `Catégorie de courses « ${oldName} » renommée en « ${newName} »`,
    `购物分类"${oldName}"已重命名为"${newName}"`,
    `"${oldName}" alışveriş kategorisi "${newName}" olarak yeniden adlandırıldı`,
    `تمت إعادة تسمية فئة التسوق "${oldName}" إلى "${newName}"`
  );
}

export function shoppingCategoryDeleted(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" gelöscht`,
    `Shopping category "${categoryName}" deleted`,
    `Categoría de compras "${categoryName}" eliminada`,
    `Catégorie de courses « ${categoryName} » supprimée`,
    `已删除购物分类"${categoryName}"`,
    `"${categoryName}" alışveriş kategorisi silindi`,
    `تم حذف فئة التسوق "${categoryName}"`
  );
}

export function shoppingTaskLinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Artikel „${itemName}" mit Aufgabe „${taskName}" verknüpft`,
    `Item "${itemName}" linked to task "${taskName}"`,
    `Artículo "${itemName}" vinculado a la tarea "${taskName}"`,
    `Article « ${itemName} » lié à la tâche « ${taskName} »`,
    `"${itemName}"已关联到任务"${taskName}"`,
    `"${itemName}" "${taskName}" göreviyle ilişkilendirildi`,
    `تم ربط "${itemName}" بمهمة "${taskName}"`
  );
}

export function shoppingTaskUnlinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Verknüpfung von Artikel „${itemName}" mit Aufgabe „${taskName}" aufgehoben`,
    `Item "${itemName}" unlinked from task "${taskName}"`,
    `Artículo "${itemName}" desvinculado de la tarea "${taskName}"`,
    `Article « ${itemName} » dissocié de la tâche « ${taskName} »`,
    `"${itemName}"已取消与任务"${taskName}"的关联`,
    `"${itemName}" "${taskName}" göreviyle ilişkisi kaldırıldı`,
    `تم إلغاء ربط "${itemName}" من مهمة "${taskName}"`
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function taskCreated(lang: Lang, taskName: string, assignees?: string[]): string {
  const who = assignees && assignees.length > 0
    ? t(lang,
        ` – zugewiesen an: ${assignees.join(", ")}`,
        ` – assigned to: ${assignees.join(", ")}`,
        ` – asignado a: ${assignees.join(", ")}`,
        ` – assigné à : ${assignees.join(", ")}`,
        `，负责人：${assignees.join("、")}`,
        ` – atanan: ${assignees.join(", ")}`,
        ` – مُسند إلى: ${assignees.join("، ")}`
      )
    : "";
  return t(lang,
    `Aufgabe „${taskName}" erstellt${who}`,
    `Task "${taskName}" created${who}`,
    `Tarea "${taskName}" creada${who}`,
    `Tâche « ${taskName} » créée${who}`,
    `已创建任务"${taskName}"${who}`,
    `"${taskName}" görevi oluşturuldu${who}`,
    `تم إنشاء مهمة "${taskName}"${who}`
  );
}

export function taskUpdated(lang: Lang, taskName: string, changes?: string): string {
  const ch = changes ? t(lang,
    ` – Änderungen: ${changes}`,
    ` – changes: ${changes}`,
    ` – cambios: ${changes}`,
    ` – modifications : ${changes}`,
    `，更改：${changes}`,
    ` – değişiklikler: ${changes}`,
    ` – التغييرات: ${changes}`
  ) : "";
  return t(lang,
    `Aufgabe „${taskName}" aktualisiert${ch}`,
    `Task "${taskName}" updated${ch}`,
    `Tarea "${taskName}" actualizada${ch}`,
    `Tâche « ${taskName} » mise à jour${ch}`,
    `任务"${taskName}"已更新${ch}`,
    `"${taskName}" görevi güncellendi${ch}`,
    `تم تحديث مهمة "${taskName}"${ch}`
  );
}

export function taskCompleted(lang: Lang, taskName: string, memberName: string, dateStr?: string): string {
  const date = dateStr ? t(lang,
    ` am ${dateStr}`,
    ` on ${dateStr}`,
    ` el ${dateStr}`,
    ` le ${dateStr}`,
    `（${dateStr}）`,
    ` ${dateStr} tarihinde`,
    ` في ${dateStr}`
  ) : "";
  return t(lang,
    `Aufgabe „${taskName}"${date} von ${memberName} abgeschlossen`,
    `Task "${taskName}"${date} completed by ${memberName}`,
    `Tarea "${taskName}"${date} completada por ${memberName}`,
    `Tâche « ${taskName} »${date} terminée par ${memberName}`,
    `${memberName}${date}完成了任务"${taskName}"`,
    `"${taskName}" görevi${date} ${memberName} tarafından tamamlandı`,
    `أتم ${memberName} مهمة "${taskName}"${date}`
  );
}

export function taskUncompleted(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Abschluss von Aufgabe „${taskName}" durch ${memberName} rückgängig gemacht`,
    `Completion of task "${taskName}" undone by ${memberName}`,
    `Finalización de la tarea "${taskName}" deshecha por ${memberName}`,
    `Complétion de la tâche « ${taskName} » annulée par ${memberName}`,
    `${memberName}撤销了任务"${taskName}"的完成状态`,
    `"${taskName}" görevinin tamamlanması ${memberName} tarafından geri alındı`,
    `ألغى ${memberName} إتمام مهمة "${taskName}"`
  );
}

export function taskDeleted(lang: Lang, taskName: string): string {
  return t(lang,
    `Aufgabe „${taskName}" gelöscht`,
    `Task "${taskName}" deleted`,
    `Tarea "${taskName}" eliminada`,
    `Tâche « ${taskName} » supprimée`,
    `已删除任务"${taskName}"`,
    `"${taskName}" görevi silindi`,
    `تم حذف مهمة "${taskName}"`
  );
}

export function taskRotated(lang: Lang, taskName: string, fromMember: string, toMember: string): string {
  return t(lang,
    `Aufgabe „${taskName}" rotiert: Verantwortung von ${fromMember} an ${toMember} übergeben`,
    `Task "${taskName}" rotated: responsibility transferred from ${fromMember} to ${toMember}`,
    `Tarea "${taskName}" rotada: responsabilidad transferida de ${fromMember} a ${toMember}`,
    `Tâche « ${taskName} » tournée : responsabilité transférée de ${fromMember} à ${toMember}`,
    `任务"${taskName}"已轮换：责任从${fromMember}转移给${toMember}`,
    `"${taskName}" görevi döndürüldü: sorumluluk ${fromMember}'dan ${toMember}'a aktarıldı`,
    `تم تدوير مهمة "${taskName}": نُقلت المسؤولية من ${fromMember} إلى ${toMember}`
  );
}

export function taskMilestone(lang: Lang, taskName: string, milestoneName: string): string {
  return t(lang,
    `Zwischenziel „${milestoneName}" für Aufgabe „${taskName}" erreicht`,
    `Milestone "${milestoneName}" reached for task "${taskName}"`,
    `Hito "${milestoneName}" alcanzado para la tarea "${taskName}"`,
    `Étape « ${milestoneName} » atteinte pour la tâche « ${taskName} »`,
    `任务"${taskName}"已达成里程碑"${milestoneName}"`,
    `"${taskName}" görevi için "${milestoneName}" kilometre taşına ulaşıldı`,
    `تم الوصول إلى المعلم "${milestoneName}" للمهمة "${taskName}"`
  );
}

export function taskReminder(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Erinnerung für Aufgabe „${taskName}" an ${memberName} gesendet`,
    `Reminder for task "${taskName}" sent to ${memberName}`,
    `Recordatorio para la tarea "${taskName}" enviado a ${memberName}`,
    `Rappel pour la tâche « ${taskName} » envoyé à ${memberName}`,
    `已向${memberName}发送任务"${taskName}"的提醒`,
    `"${taskName}" görevi için ${memberName}'a hatırlatma gönderildi`,
    `تم إرسال تذكير بمهمة "${taskName}" إلى ${memberName}`
  );
}

export function taskSkipped(lang: Lang, taskName: string, dateStr: string): string {
  return t(lang,
    `Termin am ${dateStr} für Aufgabe „${taskName}" übersprungen`,
    `Occurrence on ${dateStr} for task "${taskName}" skipped`,
    `Cita del ${dateStr} para la tarea "${taskName}" omitida`,
    `Occurrence du ${dateStr} pour la tâche « ${taskName} » ignorée`,
    `任务"${taskName}"在${dateStr}的计划已跳过`,
    `"${taskName}" görevi için ${dateStr} tarihindeki tekrar atlandı`,
    `تم تخطي موعد ${dateStr} لمهمة "${taskName}"`
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export function inventoryItemAdded(lang: Lang, itemName: string, category?: string): string {
  const cat = category ? t(lang,
    ` (Kategorie: ${category})`,
    ` (category: ${category})`,
    ` (categoría: ${category})`,
    ` (catégorie : ${category})`,
    `（分类：${category}）`,
    ` (kategori: ${category})`,
    ` (الفئة: ${category})`
  ) : "";
  return t(lang,
    `Inventarartikel „${itemName}"${cat} hinzugefügt`,
    `Inventory item "${itemName}"${cat} added`,
    `Artículo de inventario "${itemName}"${cat} añadido`,
    `Article d'inventaire « ${itemName} »${cat} ajouté`,
    `已添加库存物品"${itemName}"${cat}`,
    `"${itemName}"${cat} envantere eklendi`,
    `تمت إضافة عنصر المخزون "${itemName}"${cat}`
  );
}

export function inventoryItemUpdated(lang: Lang, itemName: string, changes?: string): string {
  const ch = changes ? t(lang,
    ` – Änderungen: ${changes}`,
    ` – changes: ${changes}`,
    ` – cambios: ${changes}`,
    ` – modifications : ${changes}`,
    `，更改：${changes}`,
    ` – değişiklikler: ${changes}`,
    ` – التغييرات: ${changes}`
  ) : "";
  return t(lang,
    `Inventarartikel „${itemName}" aktualisiert${ch}`,
    `Inventory item "${itemName}" updated${ch}`,
    `Artículo de inventario "${itemName}" actualizado${ch}`,
    `Article d'inventaire « ${itemName} » mis à jour${ch}`,
    `库存物品"${itemName}"已更新${ch}`,
    `"${itemName}" envanter öğesi güncellendi${ch}`,
    `تم تحديث عنصر المخزون "${itemName}"${ch}`
  );
}

export function inventoryItemDeleted(lang: Lang, itemName: string): string {
  return t(lang,
    `Inventarartikel „${itemName}" gelöscht`,
    `Inventory item "${itemName}" deleted`,
    `Artículo de inventario "${itemName}" eliminado`,
    `Article d'inventaire « ${itemName} » supprimé`,
    `已删除库存物品"${itemName}"`,
    `"${itemName}" envanter öğesi silindi`,
    `تم حذف عنصر المخزون "${itemName}"`
  );
}

export function inventoryItemConsumed(lang: Lang, itemName: string, quantity: number, unit?: string): string {
  const qty = unit ? `${quantity} ${unit}` : `${quantity}`;
  return t(lang,
    `${qty} von „${itemName}" als verbraucht markiert`,
    `${qty} of "${itemName}" marked as consumed`,
    `${qty} de "${itemName}" marcado como consumido`,
    `${qty} de « ${itemName} » marqué comme consommé`,
    `已将${qty}的"${itemName}"标记为已消耗`,
    `"${itemName}"dan ${qty} tüketildi olarak işaretlendi`,
    `تم تحديد ${qty} من "${itemName}" كمستهلك`
  );
}

export function inventoryItemRestocked(lang: Lang, itemName: string, quantity: number, unit?: string): string {
  const qty = unit ? `${quantity} ${unit}` : `${quantity}`;
  return t(lang,
    `Bestand von „${itemName}" um ${qty} aufgefüllt`,
    `Stock of "${itemName}" restocked by ${qty}`,
    `Stock de "${itemName}" reabastecido en ${qty}`,
    `Stock de « ${itemName} » réapprovisionné de ${qty}`,
    `"${itemName}"的库存已补充${qty}`,
    `"${itemName}" stoğu ${qty} artırıldı`,
    `تم تجديد مخزون "${itemName}" بمقدار ${qty}`
  );
}

export function inventoryCategoryAdded(lang: Lang, categoryName: string): string {
  return t(lang,
    `Inventarkategorie „${categoryName}" erstellt`,
    `Inventory category "${categoryName}" created`,
    `Categoría de inventario "${categoryName}" creada`,
    `Catégorie d'inventaire « ${categoryName} » créée`,
    `已创建库存分类"${categoryName}"`,
    `"${categoryName}" envanter kategorisi oluşturuldu`,
    `تم إنشاء فئة المخزون "${categoryName}"`
  );
}

export function inventoryCategoryUpdated(lang: Lang, oldName: string, newName: string): string {
  return t(lang,
    `Inventarkategorie „${oldName}" in „${newName}" umbenannt`,
    `Inventory category "${oldName}" renamed to "${newName}"`,
    `Categoría de inventario "${oldName}" renombrada a "${newName}"`,
    `Catégorie d'inventaire « ${oldName} » renommée en « ${newName} »`,
    `库存分类"${oldName}"已重命名为"${newName}"`,
    `"${oldName}" envanter kategorisi "${newName}" olarak yeniden adlandırıldı`,
    `تمت إعادة تسمية فئة المخزون "${oldName}" إلى "${newName}"`
  );
}

export function inventoryCategoryDeleted(lang: Lang, categoryName: string): string {
  return t(lang,
    `Inventarkategorie „${categoryName}" gelöscht`,
    `Inventory category "${categoryName}" deleted`,
    `Categoría de inventario "${categoryName}" eliminada`,
    `Catégorie d'inventaire « ${categoryName} » supprimée`,
    `已删除库存分类"${categoryName}"`,
    `"${categoryName}" envanter kategorisi silindi`,
    `تم حذف فئة المخزون "${categoryName}"`
  );
}

// ─── Borrow ──────────────────────────────────────────────────────────────────

export function borrowRequested(lang: Lang, requesterName: string, itemName: string, ownerName: string): string {
  return t(lang,
    `${requesterName} hat eine Ausleih-Anfrage für „${itemName}" von ${ownerName} gestellt`,
    `${requesterName} requested to borrow "${itemName}" from ${ownerName}`,
    `${requesterName} solicitó tomar prestado "${itemName}" de ${ownerName}`,
    `${requesterName} a demandé à emprunter « ${itemName} » à ${ownerName}`,
    `${requesterName}向${ownerName}申请借用"${itemName}"`,
    `${requesterName}, ${ownerName}'dan "${itemName}" ödünç almak istedi`,
    `طلب ${requesterName} استعارة "${itemName}" من ${ownerName}`
  );
}

export function borrowApproved(lang: Lang, ownerName: string, itemName: string, requesterName: string): string {
  return t(lang,
    `${ownerName} hat die Ausleih-Anfrage für „${itemName}" von ${requesterName} genehmigt`,
    `${ownerName} approved the borrow request for "${itemName}" by ${requesterName}`,
    `${ownerName} aprobó la solicitud de préstamo de "${itemName}" por ${requesterName}`,
    `${ownerName} a approuvé la demande d'emprunt de « ${itemName} » par ${requesterName}`,
    `${ownerName}批准了${requesterName}借用"${itemName}"的申请`,
    `${ownerName}, ${requesterName}'ın "${itemName}" ödünç alma talebini onayladı`,
    `وافق ${ownerName} على طلب استعارة "${itemName}" من ${requesterName}`
  );
}

export function borrowRejected(lang: Lang, ownerName: string, itemName: string, requesterName: string, reason?: string): string {
  const r = reason ? t(lang,
    ` – Grund: ${reason}`,
    ` – reason: ${reason}`,
    ` – motivo: ${reason}`,
    ` – motif : ${reason}`,
    `，原因：${reason}`,
    ` – neden: ${reason}`,
    ` – السبب: ${reason}`
  ) : "";
  return t(lang,
    `${ownerName} hat die Ausleih-Anfrage für „${itemName}" von ${requesterName} abgelehnt${r}`,
    `${ownerName} rejected the borrow request for "${itemName}" by ${requesterName}${r}`,
    `${ownerName} rechazó la solicitud de préstamo de "${itemName}" por ${requesterName}${r}`,
    `${ownerName} a refusé la demande d'emprunt de « ${itemName} » par ${requesterName}${r}`,
    `${ownerName}拒绝了${requesterName}借用"${itemName}"的申请${r}`,
    `${ownerName}, ${requesterName}'ın "${itemName}" ödünç alma talebini reddetti${r}`,
    `رفض ${ownerName} طلب استعارة "${itemName}" من ${requesterName}${r}`
  );
}

export function borrowReturned(lang: Lang, itemName: string, memberName: string, ownerName?: string): string {
  const ownerPart = ownerName ? t(lang,
    ` an ${ownerName}`,
    ` to ${ownerName}`,
    ` a ${ownerName}`,
    ` à ${ownerName}`,
    `给${ownerName}`,
    ` ${ownerName}'a`,
    ` إلى ${ownerName}`
  ) : "";
  return t(lang,
    `${memberName} hat „${itemName}"${ownerPart} zurückgegeben`,
    `${memberName} returned "${itemName}"${ownerPart}`,
    `${memberName} devolvió "${itemName}"${ownerPart}`,
    `${memberName} a rendu « ${itemName} »${ownerPart}`,
    `${memberName}已将"${itemName}"归还${ownerPart}`,
    `${memberName} "${itemName}"ı${ownerPart} iade etti`,
    `أعاد ${memberName} "${itemName}"${ownerPart}`
  );
}

export function borrowPickedUp(lang: Lang, memberName: string, itemName: string): string {
  return t(lang,
    `${memberName} hat „${itemName}“ abgeholt`,
    `${memberName} picked up "${itemName}"`,
    `${memberName} recogió "${itemName}"`,
    `${memberName} a récupéré « ${itemName} »`,
    `${memberName}已取走"${itemName}"`,
    `${memberName} "${itemName}"ı teslim aldı`,
    `استلم ${memberName} "${itemName}"`
  );
}

export function borrowRevoked(lang: Lang, itemName: string, revokerName: string, reason?: string): string {
  const reasonPart = reason ? t(lang,
    ` – Grund: ${reason}`,
    ` – reason: ${reason}`,
    ` – motivo: ${reason}`,
    ` – motif : ${reason}`,
    `，原因：${reason}`,
    ` – neden: ${reason}`,
    ` – السبب: ${reason}`
  ) : "";
  return t(lang,
    `${revokerName} hat die Ausleihe von „${itemName}" widerrufen${reasonPart}`,
    `${revokerName} revoked the loan of "${itemName}"${reasonPart}`,
    `${revokerName} revocó el préstamo de "${itemName}"${reasonPart}`,
    `${revokerName} a révoqué le prêt de « ${itemName} »${reasonPart}`,
    `${revokerName}撤销了"${itemName}"的借用${reasonPart}`,
    `${revokerName} "${itemName}" ödünç almasını iptal etti${reasonPart}`,
    `ألغى ${revokerName} إعارة "${itemName}"${reasonPart}`
  );
}

export function borrowCancelled(lang: Lang, requesterName: string, itemName: string): string {
  return t(lang,
    `${requesterName} hat die Ausleih-Anfrage für „${itemName}" storniert`,
    `${requesterName} cancelled the borrow request for "${itemName}"`,
    `${requesterName} canceló la solicitud de préstamo de "${itemName}"`,
    `${requesterName} a annulé la demande d'emprunt de « ${itemName} »`,
    `${requesterName}已取消借用"${itemName}"的申请`,
    `${requesterName}, "${itemName}" için ödünç alma talebini iptal etti`,
    `ألغى ${requesterName} طلب استعارة "${itemName}"`
  );
}

// ─── Members ─────────────────────────────────────────────────────────────────

export function memberLeft(lang: Lang, memberName: string, newAdminName?: string): string {
  const admin = newAdminName ? t(lang,
    ` – ${newAdminName} wurde neuer Admin`,
    ` – ${newAdminName} became the new admin`,
    ` – ${newAdminName} se convirtió en el nuevo administrador`,
    ` – ${newAdminName} est devenu le nouvel administrateur`,
    `，${newAdminName}成为新管理员`,
    ` – ${newAdminName} yeni yönetici oldu`,
    ` – أصبح ${newAdminName} المسؤول الجديد`
  ) : "";
  return t(lang,
    `${memberName} hat den Haushalt verlassen${admin}`,
    `${memberName} left the household${admin}`,
    `${memberName} abandonó el hogar${admin}`,
    `${memberName} a quitté le foyer${admin}`,
    `${memberName}已离开家庭${admin}`,
    `${memberName} haneden ayrıldı${admin}`,
    `غادر ${memberName} المنزل${admin}`
  );
}

export function adminTransferred(lang: Lang, fromMember: string, toMember: string): string {
  return t(lang,
    `Admin-Rechte von ${fromMember} an ${toMember} übertragen`,
    `Admin rights transferred from ${fromMember} to ${toMember}`,
    `Derechos de administrador transferidos de ${fromMember} a ${toMember}`,
    `Droits d'administrateur transférés de ${fromMember} à ${toMember}`,
    `管理员权限已从${fromMember}转移给${toMember}`,
    `Yönetici hakları ${fromMember}'dan ${toMember}'a devredildi`,
    `نُقلت صلاحيات المسؤول من ${fromMember} إلى ${toMember}`
  );
}

export function dissolveVoteCast(lang: Lang, memberName: string, votesCount: number, votesNeeded: number): string {
  return t(lang,
    `${memberName} hat für die Auflösung des Haushalts gestimmt (${votesCount}/${votesNeeded} Stimmen)`,
    `${memberName} voted to dissolve the household (${votesCount}/${votesNeeded} votes)`,
    `${memberName} votó por disolver el hogar (${votesCount}/${votesNeeded} votos)`,
    `${memberName} a voté pour la dissolution du foyer (${votesCount}/${votesNeeded} voix)`,
    `${memberName}投票解散家庭（${votesCount}/${votesNeeded} 票）`,
    `${memberName} hanenin dağıtılması için oy kullandı (${votesCount}/${votesNeeded} oy)`,
    `صوّت ${memberName} لحل المنزل (${votesCount}/${votesNeeded} أصوات)`
  );
}

export function dissolveVoteRetracted(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} hat die Stimme zur Haushaltsauflösung zurückgezogen`,
    `${memberName} retracted the vote to dissolve the household`,
    `${memberName} retiró el voto para disolver el hogar`,
    `${memberName} a retiré son vote pour la dissolution du foyer`,
    `${memberName}已撤回解散家庭的投票`,
    `${memberName} hanenin dağıtılması için kullandığı oyu geri çekti`,
    `سحب ${memberName} تصويته على حل المنزل`
  );
}

export function householdLanguageChanged(lang: Lang, adminName: string, newLang: string): string {
  const langName = (l: string) => {
    if (l === "de") return t(lang, "Deutsch", "German", "Alemán", "Allemand", "德语", "Almanca", "الألمانية");
    if (l === "en") return t(lang, "Englisch", "English", "Inglés", "Anglais", "英语", "İngilizce", "الإنجليزية");
    if (l === "es") return t(lang, "Spanisch", "Spanish", "Español", "Espagnol", "西班牙语", "İspanyolca", "الإسبانية");
    if (l === "fr") return t(lang, "Französisch", "French", "Francés", "Français", "法语", "Fransızca", "الفرنسية");
    if (l === "zh") return t(lang, "Chinesisch", "Chinese", "Chino", "Chinois", "中文", "Çince", "الصينية");
    if (l === "tr") return t(lang, "Türkisch", "Turkish", "Turco", "Turc", "土耳其语", "Türkçe", "التركية");
    if (l === "ar") return t(lang, "Arabisch", "Arabic", "Árabe", "Arabe", "阿拉伯语", "Arapça", "العربية");
    return l;
  };
  return t(lang,
    `${adminName} hat die Haushaltssprache auf ${langName(newLang)} geändert`,
    `${adminName} changed the household language to ${langName(newLang)}`,
    `${adminName} cambió el idioma del hogar a ${langName(newLang)}`,
    `${adminName} a changé la langue du foyer en ${langName(newLang)}`,
    `${adminName}已将家庭语言更改为${langName(newLang)}`,
    `${adminName} hane dilini ${langName(newLang)} olarak değiştirdi`,
    `غيّر ${adminName} لغة المنزل إلى ${langName(newLang)}`
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function projectCreated(lang: Lang, projectName: string, memberName: string, description?: string): string {
  const desc = description
    ? t(lang,
        ` – Beschreibung: ${description}`,
        ` – description: ${description}`,
        ` – descripción: ${description}`,
        ` – description : ${description}`,
        `，描述：${description}`,
        ` – açıklama: ${description}`,
        ` – الوصف: ${description}`
      )
    : "";
  return t(lang,
    `${memberName} hat Projekt „${projectName}"${desc} erstellt`,
    `${memberName} created project "${projectName}"${desc}`,
    `${memberName} creó el proyecto "${projectName}"${desc}`,
    `${memberName} a créé le projet « ${projectName} »${desc}`,
    `${memberName}已创建项目"${projectName}"${desc}`,
    `${memberName} "${projectName}"${desc} projesini oluşturdu`,
    `أنشأ ${memberName} مشروع "${projectName}"${desc}`
  );
}

export function projectUpdated(lang: Lang, projectName: string, memberName: string, changes?: string): string {
  const ch = changes
    ? t(lang,
        ` – Änderungen: ${changes}`,
        ` – changes: ${changes}`,
        ` – cambios: ${changes}`,
        ` – modifications : ${changes}`,
        `，更改：${changes}`,
        ` – değişiklikler: ${changes}`,
        ` – التغييرات: ${changes}`
      )
    : "";
  return t(lang,
    `${memberName} hat Projekt „${projectName}" aktualisiert${ch}`,
    `${memberName} updated project "${projectName}"${ch}`,
    `${memberName} actualizó el proyecto "${projectName}"${ch}`,
    `${memberName} a mis à jour le projet « ${projectName} »${ch}`,
    `${memberName}已更新项目"${projectName}"${ch}`,
    `${memberName} "${projectName}" projesini güncelledi${ch}`,
    `حدّث ${memberName} مشروع "${projectName}"${ch}`
  );
}

export function projectDeleted(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" gelöscht`,
    `${memberName} deleted project "${projectName}"`,
    `${memberName} eliminó el proyecto "${projectName}"`,
    `${memberName} a supprimé le projet « ${projectName} »`,
    `${memberName}已删除项目"${projectName}"`,
    `${memberName} "${projectName}" projesini sildi`,
    `حذف ${memberName} مشروع "${projectName}"`
  );
}

export function projectArchived(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" archiviert`,
    `${memberName} archived project "${projectName}"`,
    `${memberName} archivó el proyecto "${projectName}"`,
    `${memberName} a archivé le projet « ${projectName} »`,
    `${memberName}已归档项目"${projectName}"`,
    `${memberName} "${projectName}" projesini arşivledi`,
    `أرشف ${memberName} مشروع "${projectName}"`
  );
}

export function projectUnarchived(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" aus dem Archiv geholt`,
    `${memberName} unarchived project "${projectName}"`,
    `${memberName} desarchivó el proyecto "${projectName}"`,
    `${memberName} a désarchivé le projet « ${projectName} »`,
    `${memberName}已从归档中恢复项目"${projectName}"`,
    `${memberName} "${projectName}" projesini arşivden çıkardı`,
    `استعاد ${memberName} مشروع "${projectName}" من الأرشيف`
  );
}

export function projectStatusChanged(lang: Lang, projectName: string, memberName: string, newStatus: string): string {
  const statusLabel = (s: string) => {
    const map: Record<string, [string, string, string, string, string, string, string]> = {
      planning:  ["Planung",       "Planning",   "Planificación", "Planification", "规划中",  "Planlama",     "التخطيط"],
      active:    ["Aktiv",         "Active",     "Activo",        "Actif",         "进行中",  "Aktif",        "نشط"],
      completed: ["Abgeschlossen", "Completed",  "Completado",    "Terminé",       "已完成",  "Tamamlandı",   "مكتمل"],
      cancelled: ["Abgebrochen",   "Cancelled",  "Cancelado",     "Annulé",        "已取消",  "İptal edildi", "ملغى"],
    };
    const entry = map[s];
    if (!entry) return s;
    return t(lang, entry[0], entry[1], entry[2], entry[3], entry[4], entry[5], entry[6]);
  };
  return t(lang,
    `${memberName} hat den Status von Projekt „${projectName}" auf „${statusLabel(newStatus)}" geändert`,
    `${memberName} changed the status of project "${projectName}" to "${statusLabel(newStatus)}"`,
    `${memberName} cambió el estado del proyecto "${projectName}" a "${statusLabel(newStatus)}"`,
    `${memberName} a changé le statut du projet « ${projectName} » en « ${statusLabel(newStatus)} »`,
    `${memberName}已将项目"${projectName}"的状态更改为"${statusLabel(newStatus)}"`,
    `${memberName} "${projectName}" projesinin durumunu "${statusLabel(newStatus)}" olarak değiştirdi`,
    `غيّر ${memberName} حالة مشروع "${projectName}" إلى "${statusLabel(newStatus)}"`
  );
}

// ─── Calendar Events ───────────────────────────────────────────────────────────

export function calendarEventCreated(lang: Lang, title: string, memberName: string, dateStr: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" am ${dateStr} erstellt`,
    `${memberName} created calendar event "${title}" on ${dateStr}`,
    `${memberName} creó el evento de calendario "${title}" el ${dateStr}`,
    `${memberName} a créé l'événement calendrier « ${title} » le ${dateStr}`,
    `${memberName}已创建日历事件"${title}"（${dateStr}）`,
    `${memberName} ${dateStr} tarihinde "${title}" takvim etkinliği oluşturdu`,
    `أنشأ ${memberName} حدث التقويم "${title}" في ${dateStr}`
  );
}

export function calendarEventUpdated(lang: Lang, title: string, memberName: string, changes?: string): string {
  const ch = changes
    ? t(lang,
        ` – Änderungen: ${changes}`,
        ` – changes: ${changes}`,
        ` – cambios: ${changes}`,
        ` – modifications : ${changes}`,
        `，更改：${changes}`,
        ` – değişiklikler: ${changes}`,
        ` – التغييرات: ${changes}`
      )
    : "";
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" aktualisiert${ch}`,
    `${memberName} updated calendar event "${title}"${ch}`,
    `${memberName} actualizó el evento de calendario "${title}"${ch}`,
    `${memberName} a mis à jour l'événement calendrier « ${title} »${ch}`,
    `${memberName}已更新日历事件"${title}"${ch}`,
    `${memberName} "${title}" takvim etkinliğini güncelledi${ch}`,
    `حدّث ${memberName} حدث التقويم "${title}"${ch}`
  );
}

export function calendarEventDeleted(lang: Lang, title: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" gelöscht`,
    `${memberName} deleted calendar event "${title}"`,
    `${memberName} eliminó el evento de calendario "${title}"`,
    `${memberName} a supprimé l'événement calendrier « ${title} »`,
    `${memberName}已删除日历事件"${title}"`,
    `${memberName} "${title}" takvim etkinliğini sildi`,
    `حذف ${memberName} حدث التقويم "${title}"`
  );
}

export function calendarEventCompleted(lang: Lang, title: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" als erledigt markiert`,
    `${memberName} marked calendar event "${title}" as completed`,
    `${memberName} marcó el evento de calendario "${title}" como completado`,
    `${memberName} a marqué l'événement calendrier « ${title} » comme terminé`,
    `${memberName}已将日历事件"${title}"标记为已完成`,
    `${memberName} "${title}" takvim etkinliğini tamamlandı olarak işaretledi`,
    `وضع ${memberName} علامة "مكتمل" على حدث التقويم "${title}"`
  );
}

// ─── Task Occurrence Items ────────────────────────────────────────────────────

export function occurrenceItemAdded(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Artikel „${itemName}" zu Aufgabe „${taskName}" hinzugefügt`,
    `Item "${itemName}" added to task "${taskName}"`,
    `Artículo "${itemName}" añadido a la tarea "${taskName}"`,
    `Article « ${itemName} » ajouté à la tâche « ${taskName} »`,
    `已将"${itemName}"添加到任务"${taskName}"`,
    `"${itemName}" "${taskName}" görevine eklendi`,
    `تمت إضافة "${itemName}" إلى مهمة "${taskName}"`
  );
}

export function occurrenceItemRemoved(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Artikel „${itemName}" aus Aufgabe „${taskName}" entfernt`,
    `Item "${itemName}" removed from task "${taskName}"`,
    `Artículo "${itemName}" eliminado de la tarea "${taskName}"`,
    `Article « ${itemName} » retiré de la tâche « ${taskName} »`,
    `已从任务"${taskName}"中删除"${itemName}"`,
    `"${itemName}" "${taskName}" görevinden kaldırıldı`,
    `تمت إزالة "${itemName}" من مهمة "${taskName}"`
  );
}

// ─── Additional Functions ─────────────────────────────────────────────────────

export function borrowAutoApproved(lang: Lang, itemName: string, memberName: string): string {
  return t(lang,
    `Ausleih-Anfrage für „${itemName}" von ${memberName} automatisch genehmigt`,
    `Borrow request for "${itemName}" by ${memberName} automatically approved`,
    `Solicitud de préstamo de "${itemName}" por ${memberName} aprobada automáticamente`,
    `Demande d'emprunt de « ${itemName} » par ${memberName} approuvée automatiquement`,
    `${memberName}借用"${itemName}"的申请已自动批准`,
    `${memberName}'ın "${itemName}" ödünç alma talebi otomatik olarak onaylandı`,
    `تمت الموافقة تلقائياً على طلب استعارة "${itemName}" من ${memberName}`
  );
}

export function taskRestored(lang: Lang, taskName: string, dateStr?: string): string {
  const date = dateStr ? t(lang,
    ` (${dateStr})`,
    ` (${dateStr})`,
    ` (${dateStr})`,
    ` (${dateStr})`,
    `（${dateStr}）`,
    ` (${dateStr})`,
    ` (${dateStr})`
  ) : "";
  return t(lang,
    `Aufgabe „${taskName}"${date} wiederhergestellt`,
    `Task "${taskName}"${date} restored`,
    `Tarea "${taskName}"${date} restaurada`,
    `Tâche « ${taskName} »${date} restaurée`,
    `任务"${taskName}"${date}已恢复`,
    `"${taskName}"${date} görevi geri yüklendi`,
    `تمت استعادة مهمة "${taskName}"${date}`
  );
}
