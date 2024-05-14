import { diffWords } from 'diff';
import kleur from 'kleur';

export function getDiffColoredText(input: string, output: string): string {
  const diffResult = diffWords(input, output);

  if (!diffResult.some((chunk) => chunk.added || chunk.removed)) {
    return output;
  }

  const diffText = diffResult.map((chunk) => {
    if (!chunk.added && !chunk.removed) return chunk.value;
    return chunk.value.split('\n')
      .map(kleur[chunk.added ? 'green' : 'red'])
      .join('\n');
  }).join('');
  return diffText;
}
