function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()}  `;
  const result = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    result.add(padded.slice(i, i + 3));
  }
  return result;
}

function similarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  ta.forEach((t) => { if (tb.has(t)) intersection++; });
  return intersection / Math.max(ta.size, tb.size);
}

export interface DuplicateGroup {
  id: string;
  name: string;
  duplicateOf: string;
  duplicateOfName: string;
  score: number;
}

export function findDuplicates(
  items: { id: string; name: string }[],
  threshold = 0.6
): DuplicateGroup[] {
  const results: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const score = similarity(items[i].name, items[j].name);
      if (score >= threshold && !seen.has(items[j].id)) {
        seen.add(items[j].id);
        results.push({
          id: items[j].id,
          name: items[j].name,
          duplicateOf: items[i].id,
          duplicateOfName: items[i].name,
          score,
        });
      }
    }
  }

  return results;
}
