export type WordDiffPart = { value: string; type: "unchanged" | "removed" | "added" };

function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

/**
 * Berechnet einen stabilen wortbasierten Diff. Leerzeichen bleiben Teil der
 * Token, damit die Vorschau exakt lesbar bleibt.
 */
export function getWordDiff(previousText: string, nextText: string): WordDiffPart[] {
  const previous = tokenize(previousText);
  const next = tokenize(nextText);
  const table = Array.from({ length: previous.length + 1 }, () => Array<number>(next.length + 1).fill(0));

  for (let i = previous.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--) {
      table[i][j] = previous[i] === next[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: WordDiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < previous.length && j < next.length) {
    if (previous[i] === next[j]) {
      result.push({ value: previous[i], type: "unchanged" });
      i++; j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      result.push({ value: previous[i], type: "removed" });
      i++;
    } else {
      result.push({ value: next[j], type: "added" });
      j++;
    }
  }
  while (i < previous.length) result.push({ value: previous[i++], type: "removed" });
  while (j < next.length) result.push({ value: next[j++], type: "added" });
  return result;
}
