import { describeDiagram, type ParseResult } from '../core';
import { forSpeech } from './pronunciation';

/** Texto anunciado na região aria-live depois de interpretar o código. */
export function describeParseResult(result: ParseResult): string {
  return forSpeech(describe(result));
}

function describe(result: ParseResult): string {
  if (result.diagram) {
    const interpreted = `Diagrama interpretado. ${describeDiagram(result.diagram)} A árvore foi atualizada.`;
    const warnings = result.warnings ?? [];
    if (warnings.length === 0) {
      return interpreted;
    }
    const count = warnings.length === 1 ? '1 aviso' : `${warnings.length} avisos`;
    return `${interpreted} ${count}: ${warnings[0].message}`;
  }

  // O código vem por último: quem ouve recebe antes a linha e o motivo.
  const count = result.errors.length;
  const [first] = result.errors;
  const summary = `${count} ${count === 1 ? 'erro' : 'erros'} de sintaxe. ${first.message} Código ${first.code}.`;
  return count > 1 ? `${summary} Veja a lista de erros abaixo do campo.` : summary;
}
