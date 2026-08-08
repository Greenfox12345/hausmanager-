import { readFileSync, writeFileSync, existsSync } from 'fs';

const keys = {
  de: {
    unitMismatch: 'Manuelle Einheit "{{manual}}" weicht von berechneter Einheit "{{computed}}" ab',
    unitFoundInText: 'Einheit "{{unit}}" aus Aufgabentexten übernehmen?',
    unitDialogTitle: 'Einheiten übernehmen?',
    unitDialogDesc: 'Folgende Einheiten wurden in Aufgabentexten erkannt:',
    unitDialogApply: 'Ja, übernehmen',
    unitApplied: 'Einheiten übernommen',
  },
  en: {
    unitMismatch: 'Manual unit "{{manual}}" differs from computed unit "{{computed}}"',
    unitFoundInText: 'Adopt unit "{{unit}}" from task texts?',
    unitDialogTitle: 'Adopt units?',
    unitDialogDesc: 'The following units were found in task texts:',
    unitDialogApply: 'Yes, adopt',
    unitApplied: 'Units adopted',
  },
  fr: {
    unitMismatch: "L'unité manuelle \"{{manual}}\" diffère de l'unité calculée \"{{computed}}\"",
    unitFoundInText: "Adopter l'unité \"{{unit}}\" des textes de tâche ?",
    unitDialogTitle: 'Adopter les unités ?',
    unitDialogDesc: 'Les unités suivantes ont été trouvées dans les textes de tâche :',
    unitDialogApply: 'Oui, adopter',
    unitApplied: 'Unités adoptées',
  },
  es: {
    unitMismatch: 'La unidad manual "{{manual}}" difiere de la unidad calculada "{{computed}}"',
    unitFoundInText: 'Adoptar la unidad "{{unit}}" de los textos de tarea?',
    unitDialogTitle: 'Adoptar unidades?',
    unitDialogDesc: 'Se encontraron las siguientes unidades en los textos de tarea:',
    unitDialogApply: 'Si, adoptar',
    unitApplied: 'Unidades adoptadas',
  },
  zh: {
    unitMismatch: '手动单位 {{manual}} 与计算单位 {{computed}} 不符',
    unitFoundInText: '从任务文本中采用单位 {{unit}}？',
    unitDialogTitle: '采用单位？',
    unitDialogDesc: '在任务文本中发现以下单位：',
    unitDialogApply: '是，采用',
    unitApplied: '单位已采用',
  },
  tr: {
    unitMismatch: 'Manuel birim "{{manual}}", hesaplanan birim "{{computed}}" ile uyusmuyor',
    unitFoundInText: 'Gorev metinlerinden "{{unit}}" birimini al?',
    unitDialogTitle: 'Birimler alinsın mı?',
    unitDialogDesc: 'Gorev metinlerinde asagidaki birimler bulundu:',
    unitDialogApply: 'Evet, al',
    unitApplied: 'Birimler alindi',
  },
  ar: {
    unitMismatch: 'الوحدة اليدوية {{manual}} تختلف عن الوحدة المحسوبة {{computed}}',
    unitFoundInText: 'اعتماد الوحدة {{unit}} من نصوص المهام؟',
    unitDialogTitle: 'اعتماد الوحدات؟',
    unitDialogDesc: 'تم العثور على الوحدات التالية في نصوص المهام:',
    unitDialogApply: 'نعم، اعتماد',
    unitApplied: 'تم اعتماد الوحدات',
  },
};

for (const [lang, newKeys] of Object.entries(keys)) {
  const path = `/home/ubuntu/haushaltsmanager/client/public/locales/${lang}/plankiste.json`;
  if (!existsSync(path)) { console.log(`SKIP ${lang}`); continue; }
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!data.variables) data.variables = {};
  Object.assign(data.variables, newKeys);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`OK ${lang}`);
}
