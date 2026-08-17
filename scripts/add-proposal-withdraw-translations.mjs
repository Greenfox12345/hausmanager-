import fs from "node:fs";
import path from "node:path";

const translations = {
  de: { withdrawProposal: "Vorschlag zurückziehen", proposalWithdrawn: "Änderungsvorschlag zurückgezogen", withdrawProposalTitle: "Vorschlag zurückziehen?", withdrawProposalDescription: "Der Änderungsvorschlag wird zurückgezogen und kann danach nicht mehr angenommen werden." },
  en: { withdrawProposal: "Withdraw proposal", proposalWithdrawn: "Change proposal withdrawn", withdrawProposalTitle: "Withdraw proposal?", withdrawProposalDescription: "The change proposal will be withdrawn and can no longer be approved." },
  es: { withdrawProposal: "Retirar propuesta", proposalWithdrawn: "Propuesta de cambio retirada", withdrawProposalTitle: "¿Retirar propuesta?", withdrawProposalDescription: "La propuesta de cambio se retirará y ya no podrá aprobarse." },
  fr: { withdrawProposal: "Retirer la proposition", proposalWithdrawn: "Proposition de modification retirée", withdrawProposalTitle: "Retirer la proposition ?", withdrawProposalDescription: "La proposition sera retirée et ne pourra plus être acceptée." },
  tr: { withdrawProposal: "Öneriyi geri çek", proposalWithdrawn: "Değişiklik önerisi geri çekildi", withdrawProposalTitle: "Öneri geri çekilsin mi?", withdrawProposalDescription: "Değişiklik önerisi geri çekilir ve artık kabul edilemez." },
  zh: { withdrawProposal: "撤回建议", proposalWithdrawn: "更改建议已撤回", withdrawProposalTitle: "撤回建议？", withdrawProposalDescription: "该更改建议将被撤回，之后无法再被批准。" },
  ar: { withdrawProposal: "سحب الاقتراح", proposalWithdrawn: "تم سحب اقتراح التغيير", withdrawProposalTitle: "سحب الاقتراح؟", withdrawProposalDescription: "سيتم سحب اقتراح التغيير ولن يمكن قبوله بعد ذلك." },
};

for (const [language, values] of Object.entries(translations)) {
  const filePath = path.join("client", "public", "locales", language, "tasks.json");
  const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
  content.dialog ??= {};
  Object.assign(content.dialog, values);
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}
