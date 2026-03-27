/**
 * Centralized multilingual activity log text generator.
 * All history entries are generated in the household's configured language (de/en/es/fr/zh).
 */

type Lang = "de" | "en" | "es" | "fr" | "zh";

function t(lang: Lang, de: string, en: string, es: string, fr: string, zh: string): string {
  if (lang === "en") return en;
  if (lang === "es") return es;
  if (lang === "fr") return fr;
  if (lang === "zh") return zh;
  return de;
}

// ─── Shopping ────────────────────────────────────────────────────────────────

export function shoppingItemAdded(lang: Lang, itemName: string, category?: string): string {
  const cat = category ? t(lang,
    ` (Kategorie: ${category})`,
    ` (category: ${category})`,
    ` (categoría: ${category})`,
    ` (catégorie : ${category})`,
    `（分类：${category}）`
  ) : "";
  return t(lang,
    `Artikel „${itemName}"${cat} zur Einkaufsliste hinzugefügt`,
    `Item "${itemName}"${cat} added to shopping list`,
    `Artículo "${itemName}"${cat} añadido a la lista de compras`,
    `Article « ${itemName} »${cat} ajouté à la liste de courses`,
    `已将"${itemName}"${cat}添加到购物清单`
  );
}

export function shoppingItemUpdated(lang: Lang, itemName: string, changes?: string): string {
  const ch = changes ? t(lang, `: ${changes}`, `: ${changes}`, `: ${changes}`, ` : ${changes}`, `：${changes}`) : "";
  return t(lang,
    `Artikel „${itemName}" in der Einkaufsliste aktualisiert${ch}`,
    `Shopping item "${itemName}" updated${ch}`,
    `Artículo "${itemName}" actualizado en la lista de compras${ch}`,
    `Article « ${itemName} » mis à jour dans la liste de courses${ch}`,
    `购物清单中的"${itemName}"已更新${ch}`
  );
}

export function shoppingItemDeleted(lang: Lang, itemName: string): string {
  return t(lang,
    `Artikel „${itemName}" aus der Einkaufsliste entfernt`,
    `Item "${itemName}" removed from shopping list`,
    `Artículo "${itemName}" eliminado de la lista de compras`,
    `Article « ${itemName} » supprimé de la liste de courses`,
    `已从购物清单中删除"${itemName}"`
  );
}

export function shoppingBatchCompleted(lang: Lang, count: number, listName?: string): string {
  const list = listName ? t(lang,
    ` aus Liste „${listName}"`,
    ` from list "${listName}"`,
    ` de la lista "${listName}"`,
    ` de la liste « ${listName} »`,
    `（来自清单"${listName}"）`
  ) : "";
  return t(lang,
    `${count} Artikel${list} als eingekauft markiert`,
    `${count} item${count !== 1 ? "s" : ""}${list} marked as purchased`,
    `${count} artículo${count !== 1 ? "s" : ""}${list} marcado${count !== 1 ? "s" : ""} como comprado${count !== 1 ? "s" : ""}`,
    `${count} article${count !== 1 ? "s" : ""}${list} marqué${count !== 1 ? "s" : ""} comme acheté${count !== 1 ? "s" : ""}`,
    `${count} 件商品${list}已标记为已购买`
  );
}

export function shoppingCategoryAdded(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" erstellt`,
    `Shopping category "${categoryName}" created`,
    `Categoría de compras "${categoryName}" creada`,
    `Catégorie de courses « ${categoryName} » créée`,
    `已创建购物分类"${categoryName}"`
  );
}

export function shoppingCategoryUpdated(lang: Lang, oldName: string, newName: string): string {
  return t(lang,
    `Einkaufskategorie „${oldName}" in „${newName}" umbenannt`,
    `Shopping category "${oldName}" renamed to "${newName}"`,
    `Categoría de compras "${oldName}" renombrada a "${newName}"`,
    `Catégorie de courses « ${oldName} » renommée en « ${newName} »`,
    `购物分类"${oldName}"已重命名为"${newName}"`
  );
}

export function shoppingCategoryDeleted(lang: Lang, categoryName: string): string {
  return t(lang,
    `Einkaufskategorie „${categoryName}" gelöscht`,
    `Shopping category "${categoryName}" deleted`,
    `Categoría de compras "${categoryName}" eliminada`,
    `Catégorie de courses « ${categoryName} » supprimée`,
    `已删除购物分类"${categoryName}"`
  );
}

export function shoppingTaskLinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Artikel „${itemName}" mit Aufgabe „${taskName}" verknüpft`,
    `Item "${itemName}" linked to task "${taskName}"`,
    `Artículo "${itemName}" vinculado a la tarea "${taskName}"`,
    `Article « ${itemName} » lié à la tâche « ${taskName} »`,
    `"${itemName}"已关联到任务"${taskName}"`
  );
}

export function shoppingTaskUnlinked(lang: Lang, itemName: string, taskName: string): string {
  return t(lang,
    `Verknüpfung von Artikel „${itemName}" mit Aufgabe „${taskName}" aufgehoben`,
    `Item "${itemName}" unlinked from task "${taskName}"`,
    `Artículo "${itemName}" desvinculado de la tarea "${taskName}"`,
    `Article « ${itemName} » dissocié de la tâche « ${taskName} »`,
    `"${itemName}"已取消与任务"${taskName}"的关联`
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
        `，负责人：${assignees.join("、")}`
      )
    : "";
  return t(lang,
    `Aufgabe „${taskName}" erstellt${who}`,
    `Task "${taskName}" created${who}`,
    `Tarea "${taskName}" creada${who}`,
    `Tâche « ${taskName} » créée${who}`,
    `已创建任务"${taskName}"${who}`
  );
}

export function taskUpdated(lang: Lang, taskName: string, changes?: string): string {
  const ch = changes ? t(lang,
    ` – Änderungen: ${changes}`,
    ` – changes: ${changes}`,
    ` – cambios: ${changes}`,
    ` – modifications : ${changes}`,
    `，更改：${changes}`
  ) : "";
  return t(lang,
    `Aufgabe „${taskName}" aktualisiert${ch}`,
    `Task "${taskName}" updated${ch}`,
    `Tarea "${taskName}" actualizada${ch}`,
    `Tâche « ${taskName} » mise à jour${ch}`,
    `任务"${taskName}"已更新${ch}`
  );
}

export function taskCompleted(lang: Lang, taskName: string, memberName: string, dateStr?: string): string {
  const date = dateStr ? t(lang,
    ` am ${dateStr}`,
    ` on ${dateStr}`,
    ` el ${dateStr}`,
    ` le ${dateStr}`,
    `（${dateStr}）`
  ) : "";
  return t(lang,
    `Aufgabe „${taskName}"${date} von ${memberName} abgeschlossen`,
    `Task "${taskName}"${date} completed by ${memberName}`,
    `Tarea "${taskName}"${date} completada por ${memberName}`,
    `Tâche « ${taskName} »${date} terminée par ${memberName}`,
    `${memberName}${date}完成了任务"${taskName}"`
  );
}

export function taskUncompleted(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Abschluss von Aufgabe „${taskName}" durch ${memberName} rückgängig gemacht`,
    `Completion of task "${taskName}" undone by ${memberName}`,
    `Finalización de la tarea "${taskName}" deshecha por ${memberName}`,
    `Complétion de la tâche « ${taskName} » annulée par ${memberName}`,
    `${memberName}撤销了任务"${taskName}"的完成状态`
  );
}

export function taskDeleted(lang: Lang, taskName: string): string {
  return t(lang,
    `Aufgabe „${taskName}" gelöscht`,
    `Task "${taskName}" deleted`,
    `Tarea "${taskName}" eliminada`,
    `Tâche « ${taskName} » supprimée`,
    `已删除任务"${taskName}"`
  );
}

export function taskRotated(lang: Lang, taskName: string, fromMember: string, toMember: string): string {
  return t(lang,
    `Aufgabe „${taskName}" rotiert: Verantwortung von ${fromMember} an ${toMember} übergeben`,
    `Task "${taskName}" rotated: responsibility transferred from ${fromMember} to ${toMember}`,
    `Tarea "${taskName}" rotada: responsabilidad transferida de ${fromMember} a ${toMember}`,
    `Tâche « ${taskName} » tournée : responsabilité transférée de ${fromMember} à ${toMember}`,
    `任务"${taskName}"已轮换：责任从${fromMember}转移给${toMember}`
  );
}

export function taskMilestone(lang: Lang, taskName: string, milestoneName: string): string {
  return t(lang,
    `Zwischenziel „${milestoneName}" für Aufgabe „${taskName}" erreicht`,
    `Milestone "${milestoneName}" reached for task "${taskName}"`,
    `Hito "${milestoneName}" alcanzado para la tarea "${taskName}"`,
    `Étape « ${milestoneName} » atteinte pour la tâche « ${taskName} »`,
    `任务"${taskName}"已达成里程碑"${milestoneName}"`
  );
}

export function taskReminder(lang: Lang, taskName: string, memberName: string): string {
  return t(lang,
    `Erinnerung für Aufgabe „${taskName}" an ${memberName} gesendet`,
    `Reminder for task "${taskName}" sent to ${memberName}`,
    `Recordatorio para la tarea "${taskName}" enviado a ${memberName}`,
    `Rappel pour la tâche « ${taskName} » envoyé à ${memberName}`,
    `已向${memberName}发送任务"${taskName}"的提醒`
  );
}

export function taskSkipped(lang: Lang, taskName: string, dateStr: string): string {
  return t(lang,
    `Termin am ${dateStr} für Aufgabe „${taskName}" übersprungen`,
    `Occurrence on ${dateStr} for task "${taskName}" skipped`,
    `Cita del ${dateStr} para la tarea "${taskName}" omitida`,
    `Occurrence du ${dateStr} pour la tâche « ${taskName} » ignorée`,
    `任务"${taskName}"在${dateStr}的计划已跳过`
  );
}

export function taskRestored(lang: Lang, taskName: string, dateStr: string): string {
  return t(lang,
    `Übersprungener Termin am ${dateStr} für Aufgabe „${taskName}" wiederhergestellt`,
    `Skipped occurrence on ${dateStr} for task "${taskName}" restored`,
    `Cita omitida del ${dateStr} para la tarea "${taskName}" restaurada`,
    `Occurrence ignorée du ${dateStr} pour la tâche « ${taskName} » restaurée`,
    `任务"${taskName}"在${dateStr}被跳过的计划已恢复`
  );
}

// ─── Borrow ──────────────────────────────────────────────────────────────────

export function borrowRequested(lang: Lang, itemName: string, requesterName: string, reason?: string): string {
  const why = reason ? t(lang,
    ` – Grund: ${reason}`,
    ` – reason: ${reason}`,
    ` – motivo: ${reason}`,
    ` – raison : ${reason}`,
    `，原因：${reason}`
  ) : "";
  return t(lang,
    `${requesterName} hat eine Ausleih-Anfrage für „${itemName}" gestellt${why}`,
    `${requesterName} requested to borrow "${itemName}"${why}`,
    `${requesterName} solicitó tomar prestado "${itemName}"${why}`,
    `${requesterName} a demandé à emprunter « ${itemName} »${why}`,
    `${requesterName}申请借用"${itemName}"${why}`
  );
}

export function borrowAutoApproved(lang: Lang, itemName: string, requesterName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" automatisch genehmigt (Haushaltseigentum)`,
    `Borrow request by ${requesterName} for "${itemName}" automatically approved (household property)`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" aprobada automáticamente (propiedad del hogar)`,
    `Demande d'emprunt de ${requesterName} pour « ${itemName} » approuvée automatiquement (bien du foyer)`,
    `${requesterName}借用"${itemName}"的申请已自动批准（家庭共有物品）`
  );
}

export function borrowApproved(lang: Lang, itemName: string, requesterName: string, approverName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" von ${approverName} genehmigt`,
    `Borrow request by ${requesterName} for "${itemName}" approved by ${approverName}`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" aprobada por ${approverName}`,
    `Demande d'emprunt de ${requesterName} pour « ${itemName} » approuvée par ${approverName}`,
    `${approverName}已批准${requesterName}借用"${itemName}"的申请`
  );
}

export function borrowRejected(lang: Lang, itemName: string, requesterName: string, reason?: string): string {
  const why = reason ? t(lang,
    ` – Grund: ${reason}`,
    ` – reason: ${reason}`,
    ` – motivo: ${reason}`,
    ` – raison : ${reason}`,
    `，原因：${reason}`
  ) : "";
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" abgelehnt${why}`,
    `Borrow request by ${requesterName} for "${itemName}" rejected${why}`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" rechazada${why}`,
    `Demande d'emprunt de ${requesterName} pour « ${itemName} » refusée${why}`,
    `${requesterName}借用"${itemName}"的申请已被拒绝${why}`
  );
}

export function borrowReturned(lang: Lang, itemName: string, returnerName: string): string {
  return t(lang,
    `„${itemName}" von ${returnerName} zurückgegeben`,
    `"${itemName}" returned by ${returnerName}`,
    `"${itemName}" devuelto por ${returnerName}`,
    `« ${itemName} » retourné par ${returnerName}`,
    `${returnerName}已归还"${itemName}"`
  );
}

export function borrowRevoked(lang: Lang, itemName: string, revokerName: string, reason?: string): string {
  const why = reason ? t(lang,
    ` – Begründung: ${reason}`,
    ` – reason: ${reason}`,
    ` – motivo: ${reason}`,
    ` – raison : ${reason}`,
    `，原因：${reason}`
  ) : "";
  return t(lang,
    `Ausleihgenehmigung für „${itemName}" von ${revokerName} widerrufen${why}`,
    `Borrow approval for "${itemName}" revoked by ${revokerName}${why}`,
    `Aprobación de préstamo para "${itemName}" revocada por ${revokerName}${why}`,
    `Approbation d'emprunt pour « ${itemName} » révoquée par ${revokerName}${why}`,
    `${revokerName}已撤销"${itemName}"的借用批准${why}`
  );
}

export function borrowCancelled(lang: Lang, itemName: string, requesterName: string): string {
  return t(lang,
    `Ausleih-Anfrage von ${requesterName} für „${itemName}" storniert`,
    `Borrow request by ${requesterName} for "${itemName}" cancelled`,
    `Solicitud de préstamo de ${requesterName} para "${itemName}" cancelada`,
    `Demande d'emprunt de ${requesterName} pour « ${itemName} » annulée`,
    `${requesterName}已取消借用"${itemName}"的申请`
  );
}

// ─── Task Occurrence Items ────────────────────────────────────────────────────

export function occurrenceItemAdded(lang: Lang, itemName: string, taskName: string, occurrence: number): string {
  return t(lang,
    `Gegenstand „${itemName}" für Termin ${occurrence} der Aufgabe „${taskName}" hinzugefügt`,
    `Item "${itemName}" added for occurrence ${occurrence} of task "${taskName}"`,
    `Artículo "${itemName}" añadido para la cita ${occurrence} de la tarea "${taskName}"`,
    `Objet « ${itemName} » ajouté pour l'occurrence ${occurrence} de la tâche « ${taskName} »`,
    `已为任务"${taskName}"第${occurrence}次添加物品"${itemName}"`
  );
}

export function occurrenceItemRemoved(lang: Lang, itemName: string, taskName: string, occurrence: number): string {
  return t(lang,
    `Gegenstand „${itemName}" von Termin ${occurrence} der Aufgabe „${taskName}" entfernt`,
    `Item "${itemName}" removed from occurrence ${occurrence} of task "${taskName}"`,
    `Artículo "${itemName}" eliminado de la cita ${occurrence} de la tarea "${taskName}"`,
    `Objet « ${itemName} » retiré de l'occurrence ${occurrence} de la tâche « ${taskName} »`,
    `已从任务"${taskName}"第${occurrence}次中移除物品"${itemName}"`
  );
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export function inventoryItemAdded(
  lang: Lang,
  itemName: string,
  memberName: string,
  category?: string,
  ownershipType?: "personal" | "household"
): string {
  const cat = category
    ? t(lang,
        ` in Kategorie „${category}"`,
        ` in category "${category}"`,
        ` en categoría "${category}"`,
        ` dans la catégorie « ${category} »`,
        `（分类：${category}）`
      )
    : "";
  const own =
    ownershipType === "personal"
      ? t(lang, " (persönliches Eigentum)", " (personal property)", " (propiedad personal)", " (bien personnel)", "（个人物品）")
      : ownershipType === "household"
      ? t(lang, " (Haushaltseigentum)", " (household property)", " (propiedad del hogar)", " (bien du foyer)", "（家庭共有物品）")
      : "";
  return t(lang,
    `${memberName} hat Gegenstand „${itemName}"${cat}${own} zum Inventar hinzugefügt`,
    `${memberName} added item "${itemName}"${cat}${own} to inventory`,
    `${memberName} añadió el artículo "${itemName}"${cat}${own} al inventario`,
    `${memberName} a ajouté l'objet « ${itemName} »${cat}${own} à l'inventaire`,
    `${memberName}已将"${itemName}"${cat}${own}添加到库存`
  );
}

export function inventoryItemUpdated(
  lang: Lang,
  itemName: string,
  memberName: string,
  changes?: string
): string {
  const ch = changes
    ? t(lang,
        ` – Änderungen: ${changes}`,
        ` – changes: ${changes}`,
        ` – cambios: ${changes}`,
        ` – modifications : ${changes}`,
        `，更改：${changes}`
      )
    : "";
  return t(lang,
    `${memberName} hat Gegenstand „${itemName}" im Inventar aktualisiert${ch}`,
    `${memberName} updated item "${itemName}" in inventory${ch}`,
    `${memberName} actualizó el artículo "${itemName}" en el inventario${ch}`,
    `${memberName} a mis à jour l'objet « ${itemName} » dans l'inventaire${ch}`,
    `${memberName}已更新库存中的"${itemName}"${ch}`
  );
}

export function inventoryItemDeleted(
  lang: Lang,
  itemName: string,
  memberName: string
): string {
  return t(lang,
    `${memberName} hat Gegenstand „${itemName}" aus dem Inventar gelöscht`,
    `${memberName} deleted item "${itemName}" from inventory`,
    `${memberName} eliminó el artículo "${itemName}" del inventario`,
    `${memberName} a supprimé l'objet « ${itemName} » de l'inventaire`,
    `${memberName}已从库存中删除"${itemName}"`
  );
}

export function inventoryCategoryAdded(lang: Lang, categoryName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Inventarkategorie „${categoryName}" erstellt`,
    `${memberName} created inventory category "${categoryName}"`,
    `${memberName} creó la categoría de inventario "${categoryName}"`,
    `${memberName} a créé la catégorie d'inventaire « ${categoryName} »`,
    `${memberName}已创建库存分类"${categoryName}"`
  );
}

export function inventoryCategoryUpdated(lang: Lang, oldName: string, newName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Inventarkategorie „${oldName}" in „${newName}" umbenannt`,
    `${memberName} renamed inventory category "${oldName}" to "${newName}"`,
    `${memberName} renombró la categoría de inventario "${oldName}" a "${newName}"`,
    `${memberName} a renommé la catégorie d'inventaire « ${oldName} » en « ${newName} »`,
    `${memberName}已将库存分类"${oldName}"重命名为"${newName}"`
  );
}

export function inventoryCategoryDeleted(lang: Lang, categoryName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Inventarkategorie „${categoryName}" gelöscht`,
    `${memberName} deleted inventory category "${categoryName}"`,
    `${memberName} eliminó la categoría de inventario "${categoryName}"`,
    `${memberName} a supprimé la catégorie d'inventaire « ${categoryName} »`,
    `${memberName}已删除库存分类"${categoryName}"`
  );
}

// ─── Household / Member ───────────────────────────────────────────────────────

export function memberJoined(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} ist dem Haushalt beigetreten`,
    `${memberName} joined the household`,
    `${memberName} se unió al hogar`,
    `${memberName} a rejoint le foyer`,
    `${memberName}已加入家庭`
  );
}

export function memberLeft(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} hat den Haushalt verlassen`,
    `${memberName} left the household`,
    `${memberName} abandonó el hogar`,
    `${memberName} a quitté le foyer`,
    `${memberName}已离开家庭`
  );
}

export function memberLeftNewAdmin(lang: Lang, memberName: string, newAdminName: string): string {
  return t(lang,
    `${memberName} hat den Haushalt verlassen – neuer Admin: ${newAdminName}`,
    `${memberName} left the household – new admin: ${newAdminName}`,
    `${memberName} abandonó el hogar – nuevo administrador: ${newAdminName}`,
    `${memberName} a quitté le foyer – nouvel administrateur : ${newAdminName}`,
    `${memberName}已离开家庭，新管理员：${newAdminName}`
  );
}

export function adminTransferred(lang: Lang, fromMember: string, toMember: string): string {
  return t(lang,
    `Admin-Rechte von ${fromMember} an ${toMember} übertragen`,
    `Admin rights transferred from ${fromMember} to ${toMember}`,
    `Derechos de administrador transferidos de ${fromMember} a ${toMember}`,
    `Droits d'administrateur transférés de ${fromMember} à ${toMember}`,
    `管理员权限已从${fromMember}转移给${toMember}`
  );
}

export function dissolveVoteCast(lang: Lang, memberName: string, votesCount: number, votesNeeded: number): string {
  return t(lang,
    `${memberName} hat für die Auflösung des Haushalts gestimmt (${votesCount}/${votesNeeded} Stimmen)`,
    `${memberName} voted to dissolve the household (${votesCount}/${votesNeeded} votes)`,
    `${memberName} votó por disolver el hogar (${votesCount}/${votesNeeded} votos)`,
    `${memberName} a voté pour la dissolution du foyer (${votesCount}/${votesNeeded} voix)`,
    `${memberName}投票解散家庭（${votesCount}/${votesNeeded} 票）`
  );
}

export function dissolveVoteRetracted(lang: Lang, memberName: string): string {
  return t(lang,
    `${memberName} hat die Stimme zur Haushaltsauflösung zurückgezogen`,
    `${memberName} retracted the vote to dissolve the household`,
    `${memberName} retiró el voto para disolver el hogar`,
    `${memberName} a retiré son vote pour la dissolution du foyer`,
    `${memberName}已撤回解散家庭的投票`
  );
}

export function householdLanguageChanged(lang: Lang, adminName: string, newLang: string): string {
  const langName = (l: string) => {
    if (l === "de") return t(lang, "Deutsch", "German", "Alemán", "Allemand", "德语");
    if (l === "en") return t(lang, "Englisch", "English", "Inglés", "Anglais", "英语");
    if (l === "es") return t(lang, "Spanisch", "Spanish", "Español", "Espagnol", "西班牙语");
    if (l === "fr") return t(lang, "Französisch", "French", "Francés", "Français", "法语");
    if (l === "zh") return t(lang, "Chinesisch", "Chinese", "Chino", "Chinois", "中文");
    return l;
  };
  return t(lang,
    `${adminName} hat die Haushaltssprache auf ${langName(newLang)} geändert`,
    `${adminName} changed the household language to ${langName(newLang)}`,
    `${adminName} cambió el idioma del hogar a ${langName(newLang)}`,
    `${adminName} a changé la langue du foyer en ${langName(newLang)}`,
    `${adminName}已将家庭语言更改为${langName(newLang)}`
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
        `，描述：${description}`
      )
    : "";
  return t(lang,
    `${memberName} hat Projekt „${projectName}"${desc} erstellt`,
    `${memberName} created project "${projectName}"${desc}`,
    `${memberName} creó el proyecto "${projectName}"${desc}`,
    `${memberName} a créé le projet « ${projectName} »${desc}`,
    `${memberName}已创建项目"${projectName}"${desc}`
  );
}

export function projectUpdated(lang: Lang, projectName: string, memberName: string, changes?: string): string {
  const ch = changes
    ? t(lang,
        ` – Änderungen: ${changes}`,
        ` – changes: ${changes}`,
        ` – cambios: ${changes}`,
        ` – modifications : ${changes}`,
        `，更改：${changes}`
      )
    : "";
  return t(lang,
    `${memberName} hat Projekt „${projectName}" aktualisiert${ch}`,
    `${memberName} updated project "${projectName}"${ch}`,
    `${memberName} actualizó el proyecto "${projectName}"${ch}`,
    `${memberName} a mis à jour le projet « ${projectName} »${ch}`,
    `${memberName}已更新项目"${projectName}"${ch}`
  );
}

export function projectDeleted(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" gelöscht`,
    `${memberName} deleted project "${projectName}"`,
    `${memberName} eliminó el proyecto "${projectName}"`,
    `${memberName} a supprimé le projet « ${projectName} »`,
    `${memberName}已删除项目"${projectName}"`
  );
}

export function projectArchived(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" archiviert`,
    `${memberName} archived project "${projectName}"`,
    `${memberName} archivó el proyecto "${projectName}"`,
    `${memberName} a archivé le projet « ${projectName} »`,
    `${memberName}已归档项目"${projectName}"`
  );
}

export function projectUnarchived(lang: Lang, projectName: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Projekt „${projectName}" aus dem Archiv geholt`,
    `${memberName} unarchived project "${projectName}"`,
    `${memberName} desarchivó el proyecto "${projectName}"`,
    `${memberName} a désarchivé le projet « ${projectName} »`,
    `${memberName}已从归档中恢复项目"${projectName}"`
  );
}

export function projectStatusChanged(lang: Lang, projectName: string, memberName: string, newStatus: string): string {
  const statusLabel = (s: string) => {
    const map: Record<string, [string, string, string, string, string]> = {
      planning:  ["Planung",       "Planning",   "Planificación", "Planification", "规划中"],
      active:    ["Aktiv",         "Active",     "Activo",        "Actif",         "进行中"],
      completed: ["Abgeschlossen", "Completed",  "Completado",    "Terminé",       "已完成"],
      cancelled: ["Abgebrochen",   "Cancelled",  "Cancelado",     "Annulé",        "已取消"],
    };
    const entry = map[s];
    if (!entry) return s;
    return t(lang, entry[0], entry[1], entry[2], entry[3], entry[4]);
  };
  return t(lang,
    `${memberName} hat den Status von Projekt „${projectName}" auf „${statusLabel(newStatus)}" geändert`,
    `${memberName} changed the status of project "${projectName}" to "${statusLabel(newStatus)}"`,
    `${memberName} cambió el estado del proyecto "${projectName}" a "${statusLabel(newStatus)}"`,
    `${memberName} a changé le statut du projet « ${projectName} » en « ${statusLabel(newStatus)} »`,
    `${memberName}已将项目"${projectName}"的状态更改为"${statusLabel(newStatus)}"`
  );
}

// ─── Calendar Events ───────────────────────────────────────────────────────────

export function calendarEventCreated(lang: Lang, title: string, memberName: string, dateStr: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" am ${dateStr} erstellt`,
    `${memberName} created calendar event "${title}" on ${dateStr}`,
    `${memberName} creó el evento de calendario "${title}" el ${dateStr}`,
    `${memberName} a créé l'événement calendrier « ${title} » le ${dateStr}`,
    `${memberName}已创建日历事件"${title}"（${dateStr}）`
  );
}

export function calendarEventUpdated(lang: Lang, title: string, memberName: string, changes?: string): string {
  const ch = changes
    ? t(lang,
        ` – Änderungen: ${changes}`,
        ` – changes: ${changes}`,
        ` – cambios: ${changes}`,
        ` – modifications : ${changes}`,
        `，更改：${changes}`
      )
    : "";
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" aktualisiert${ch}`,
    `${memberName} updated calendar event "${title}"${ch}`,
    `${memberName} actualizó el evento de calendario "${title}"${ch}`,
    `${memberName} a mis à jour l'événement calendrier « ${title} »${ch}`,
    `${memberName}已更新日历事件"${title}"${ch}`
  );
}

export function calendarEventDeleted(lang: Lang, title: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" gelöscht`,
    `${memberName} deleted calendar event "${title}"`,
    `${memberName} eliminó el evento de calendario "${title}"`,
    `${memberName} a supprimé l'événement calendrier « ${title} »`,
    `${memberName}已删除日历事件"${title}"`
  );
}

export function calendarEventCompleted(lang: Lang, title: string, memberName: string): string {
  return t(lang,
    `${memberName} hat Kalender-Ereignis „${title}" als erledigt markiert`,
    `${memberName} marked calendar event "${title}" as completed`,
    `${memberName} marcó el evento de calendario "${title}" como completado`,
    `${memberName} a marqué l'événement calendrier « ${title} » comme terminé`,
    `${memberName}已将日历事件"${title}"标记为已完成`
  );
}
