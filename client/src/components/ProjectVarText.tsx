import { VarText } from "@/components/VarToken";
import type { PlanVariable } from "@/lib/varParser";
import { toRevealVariables, type RevealableProjectVariable } from "../../../shared/projectVariableReveal";

type ProjectVarTextProps = {
  text: string | null | undefined;
  variables?: RevealableProjectVariable[] | null;
  className?: string;
};

/** Verwendet die bewährte Plankiste-Anzeige auch für Texte aus laufenden Projekten. */
export function ProjectVarText({ text, variables, className }: ProjectVarTextProps) {
  const content = text ?? "";
  const revealVariables = toRevealVariables(variables) as PlanVariable[];
  if (!revealVariables.length) return <span className={className}>{content}</span>;
  return <VarText text={content} variables={revealVariables} className={className} />;
}
