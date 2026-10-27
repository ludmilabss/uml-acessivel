import { describeDiagram, type ParseResult } from '../core';

/** Texto anunciado na região aria-live depois de interpretar o código. */
export function describeParseResult(result: ParseResult): string {
  if (result.diagram) {
    return `Diagrama interpretado. ${describeDiagram(result.diagram)} A árvore foi atualizada.`;
  }

  // O código vem por último: quem ouve recebe antes a linha e o motivo.
  const count = result.errors.length;
  const [first] = result.errors;
  const summary = `${count} ${count === 1 ? 'erro' : 'erros'} de sintaxe. ${first.message} Código ${first.code}.`;
  return count > 1 ? `${summary} Veja a lista de erros abaixo do campo.` : summary;
}
