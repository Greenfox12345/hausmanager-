import fs from 'node:fs';

const base = '/home/ubuntu/haushaltsmanager/client/public/locales';
const values = {
  de: 'Es wurden keine Änderungen vorgenommen.',
  en: 'No changes were made.',
  es: 'No se realizaron cambios.',
  fr: 'Aucune modification n’a été effectuée.',
  tr: 'Herhangi bir değişiklik yapılmadı.',
  zh: '未进行任何更改。',
  ar: 'لم يتم إجراء أي تغييرات.',
};

for (const [language, noChanges] of Object.entries(values)) {
  const file = `${base}/${language}/tasks.json`;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.dialog = { ...(json.dialog ?? {}), noChanges };
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}
