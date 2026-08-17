type BalanceLanguage = "de" | "en" | "es" | "fr" | "tr" | "zh" | "ar";
type BalanceEvent = "created" | "updated" | "deleted";

const locales: Record<BalanceLanguage, string> = {
  de: "de-DE", en: "en-GB", es: "es-ES", fr: "fr-FR", tr: "tr-TR", zh: "zh-CN", ar: "ar-SA",
};

function languageOf(language: string): BalanceLanguage {
  const normalized = language.split("-")[0] as BalanceLanguage;
  return normalized in locales ? normalized : "de";
}

function formatWorkMinutes(language: BalanceLanguage, minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const labels: Record<BalanceLanguage, [string, string]> = {
    de: ["Std.", "Min."], en: ["h", "min"], es: ["h", "min"], fr: ["h", "min"], tr: ["sa.", "dk."], zh: ["小时", "分钟"], ar: ["ساعة", "دقيقة"],
  };
  const [hourLabel, minuteLabel] = labels[language];
  return `${hours > 0 ? `${hours} ${hourLabel} ` : ""}${remainingMinutes} ${minuteLabel}`.trim();
}

export function formatBalanceActivityText(input: {
  language: string;
  event: BalanceEvent;
  memberName?: string;
  entryType?: "payment" | "work";
  amount?: number | string | null;
  minutes?: number | null;
  description: string;
  sourceType?: "manual" | "task" | "milestone" | "shopping";
  sourceLabel?: string | null;
}): string {
  const language = languageOf(input.language);
  const sourceNames: Record<BalanceLanguage, Record<NonNullable<typeof input.sourceType>, string>> = {
    de: { manual: "manuell", task: "Aufgabe", milestone: "Zwischenziel", shopping: "Einkauf" },
    en: { manual: "manual", task: "task", milestone: "milestone", shopping: "shopping" },
    es: { manual: "manual", task: "tarea", milestone: "hito", shopping: "compra" },
    fr: { manual: "manuel", task: "tâche", milestone: "étape", shopping: "courses" },
    tr: { manual: "manuel", task: "görev", milestone: "ara hedef", shopping: "alışveriş" },
    zh: { manual: "手动", task: "任务", milestone: "里程碑", shopping: "购物" },
    ar: { manual: "يدوي", task: "مهمة", milestone: "مرحلة", shopping: "تسوّق" },
  };
  const sourceSuffix = input.sourceType && input.sourceType !== "manual"
    ? ` · ${sourceNames[language][input.sourceType]}${input.sourceLabel ? `: ${input.sourceLabel}` : ""}`
    : "";
  if (input.event === "updated") {
    const texts: Record<BalanceLanguage, string> = {
      de: `Bilanzaufwand „${input.description}" wurde geändert.`, en: `Balance entry “${input.description}” was updated.`, es: `Se actualizó el gasto «${input.description}».`, fr: `L’effort « ${input.description} » a été mis à jour.`, tr: `“${input.description}” bilanço kaydı güncellendi.`, zh: `已更新记录“${input.description}”。`, ar: `تم تحديث إدخال الميزان «${input.description}».`,
    };
    return `${texts[language]}${sourceSuffix}`;
  }
  if (input.event === "deleted") {
    const texts: Record<BalanceLanguage, string> = {
      de: `Bilanzaufwand „${input.description}" wurde gelöscht.`, en: `Balance entry “${input.description}” was deleted.`, es: `Se eliminó el gasto «${input.description}».`, fr: `L’effort « ${input.description} » a été supprimé.`, tr: `“${input.description}” bilanço kaydı silindi.`, zh: `已删除记录“${input.description}”。`, ar: `تم حذف إدخال الميزان «${input.description}».`,
    };
    return `${texts[language]}${sourceSuffix}`;
  }
  const value = input.entryType === "payment"
    ? Number(input.amount ?? 0).toLocaleString(locales[language], { style: "currency", currency: "EUR" })
    : formatWorkMinutes(language, Number(input.minutes ?? 0));
  const verb: Record<BalanceLanguage, string> = input.entryType === "payment"
    ? { de: "bezahlt", en: "paid", es: "pagó", fr: "a payé", tr: "ödedi", zh: "支付了", ar: "دفع" }
    : { de: "gearbeitet", en: "worked", es: "trabajó", fr: "a travaillé", tr: "çalıştı", zh: "工作了", ar: "عمل" };
  const templates: Record<BalanceLanguage, string> = {
    de: `${input.memberName} hat ${value} ${verb[language]}: ${input.description}${sourceSuffix}`,
    en: `${input.memberName} ${verb[language]} ${value}: ${input.description}${sourceSuffix}`,
    es: `${input.memberName} ${verb[language]} ${value}: ${input.description}${sourceSuffix}`,
    fr: `${input.memberName} ${verb[language]} ${value} : ${input.description}${sourceSuffix}`,
    tr: `${input.memberName}, ${input.description} için ${value} ${verb[language]}.${sourceSuffix}`,
    zh: `${input.memberName}${verb[language]} ${value}：${input.description}${sourceSuffix}`,
    ar: `${input.memberName} ${verb[language]} ${value}: ${input.description}${sourceSuffix}`,
  };
  return templates[language];
}
