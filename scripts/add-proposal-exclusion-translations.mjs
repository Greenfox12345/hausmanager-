import fs from 'node:fs';

const base = '/home/ubuntu/haushaltsmanager/client/public/locales';
const values = {
  de: 'Ausgeschlossene Mitglieder', en: 'Excluded members', es: 'Miembros excluidos',
  fr: 'Membres exclus', tr: 'Hariç tutulan üyeler', zh: '排除的成员', ar: 'الأعضاء المستبعدون',
};
for (const [language, excludedMembers] of Object.entries(values)) {
  const file = `${base}/${language}/tasks.json`;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.dialog = { ...(json.dialog ?? {}), excludedMembers };
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}
