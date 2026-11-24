import { describe, expect, it } from 'vitest';
import { parseErDiagram } from '../core';
import { describeParseResult } from './announcements';
import { forSpeech } from './pronunciation';

describe('forSpeech: símbolos entre aspas', () => {
  it('fala por extenso a chave e os dois-pontos, que o leitor de tela deixaria em silêncio', () => {
    expect(forSpeech('falta "}" antes da linha 5')).toBe('falta "fecha chave" antes da linha 5');
    expect(forSpeech('abra com "{"')).toBe('abra com "abre chave"');
    expect(forSpeech('depois de ":".')).toBe('depois de "dois-pontos".');
  });

  it('não mexe em símbolos fora de aspas nem em textos entre aspas comuns', () => {
    expect(forSpeech('id: int')).toBe('id: int');
    expect(forSpeech('rótulo "aparece em"')).toBe('rótulo "aparece em"');
  });

  it('vale para o anúncio do erro de bloco não fechado (E03)', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE {
    int id PK
  PEDIDO {
    int id PK
  }`);
    expect(describeParseResult(result)).toContain(
      'O bloco da entidade CLIENTE não foi fechado: falta "fecha chave" antes da linha 4.',
    );
  });
});
