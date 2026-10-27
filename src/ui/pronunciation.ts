/**
 * Ajusta só o texto falado pelo leitor de tela; a tela continua mostrando o nome original.
 * O VoiceOver lê ITEM_PEDIDO como "itemsublinhadopedido"; com espaço, lê "item pedido".
 * As palavras continuam as mesmas, então o nome lido segue contendo o texto visível (WCAG 2.5.3).
 */
export function forSpeech(text: string): string {
  return text.replace(/_+/g, ' ');
}
