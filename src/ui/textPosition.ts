/** Posições de início e fim de uma linha (contada a partir de 1), para selecionar no textarea. */
export function lineRange(text: string, line: number): { start: number; end: number } {
  const lines = text.split('\n');
  const index = Math.min(Math.max(line, 1), lines.length) - 1;

  let start = 0;
  for (let current = 0; current < index; current += 1) {
    start += lines[current].length + 1;
  }

  return { start, end: start + lines[index].replace(/\r$/, '').length };
}
