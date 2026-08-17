import fs from "node:fs";
import path from "node:path";

const translations = {
  de: { withdrawProposal: "Vorschlag zurückziehen", proposalWithdrawn: "Änderungsvorschlag zurückgezogen" },
  en: { withdrawProposal: "Withdraw proposal", proposalWithdrawn: "Change proposal withdrawn" },
  es: { withdrawProposal: "Retirar propuesta", proposalWithdrawn: "Propuesta de cambio retirada" },
  fr: { withdrawProposal: "Retirer la proposition", proposalWithdrawn: "Proposition de modification retirée" },
  tr: { withdrawProposal: "Öneriyi geri çek", proposalWithdrawn: "Değişiklik önerisi geri çekildi" },
  zh: { withdrawProposal: "撤回建议", proposalWithdrawn: "更改建议已撤回" },
  ar: { withdrawProposal: "سحب الاقتراح", proposalWithdrawn: "تم سحب اقتراح التغيير" },
};

for (const [language, values] of Object.entries(translations)) {
  const filePath = path.join("client", "public", "locales", language, "tasks.json");
  const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
  content.dialog ??= {};
  Object.assign(content.dialog, values);
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}
