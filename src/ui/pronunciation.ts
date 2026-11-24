/**
 * Ajusta só o texto falado pelo leitor de tela; a tela continua mostrando o original.
 * - O VoiceOver lê ITEM_PEDIDO como "itemsublinhadopedido"; com espaço, lê "item pedido".
 * - Símbolos isolados entre aspas (como em 'falta "}"') ficam em silêncio no nível de
 *   pontuação padrão dos leitores de tela; por isso são falados por extenso.
 * As palavras continuam as mesmas, então o nome lido segue contendo o texto visível (WCAG 2.5.3).
 */
const SPOKEN_SYMBOLS: Readonly<Record<string, string>> = {
  '}': 'fecha chave',
  '{': 'abre chave',
  ':': 'dois-pontos',
};

export function forSpeech(text: string): string {
  return text
    .replace(/"([{}:])"/g, (_, symbol: string) => `"${SPOKEN_SYMBOLS[symbol]}"`)
    .replace(/_+/g, ' ');
}
