import { describeDiagram, type ParseResult } from '../core';

/** Texto anunciado na região aria-live depois de interpretar o código. */
export function describeParseResult(result: ParseResult): string {
  if (result.diagram) {
    return `Diagrama interpretado. ${describeDiagram(result.diagram)} A árvore foi atualizada.`;
  }

  const count = result.errors.length;
  const summary = `${count} ${count === 1 ? 'erro' : 'erros'} de sintaxe. ${result.errors[0].message}`;
  return count > 1 ? `${summary} Veja a lista de erros abaixo do código.` : summary;
}
