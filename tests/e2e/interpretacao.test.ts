// Teste de ponta a ponta do núcleo: do texto colado pelo usuário até o anúncio lido
// pelo leitor de tela, passando pelo parser, pela árvore semântica e pela narração.
//
// Este arquivo tinha mais testes originalmente, mas a maioria duplicava cobertura já
// existente em outros arquivos (mesmo diagrama ou mesma string de narração):
// - "4 entidades e 3 relacionamentos" → já coberto por src/core/exampleDiagrams.test.ts,
//   cujo fixture "E-commerce (Cenário 1)" é o mesmo diagrama de src/ui/exampleDiagram.ts.
// - "narra a entidade PEDIDO" → mesmo código testado por src/core/semanticTree.test.ts.
// - "narra o atributo de chave primária" → string idêntica já em src/core/narration.test.ts.
// - "narra o relacionamento 'faz'" → mesmo relacionamento testado por
//   src/core/parser.test.ts e src/core/narration.test.ts.
// - "não cria grupos vazios" → mesma lógica testada por src/core/semanticTree.test.ts
//   ("omite grupos vazios"), com outro diagrama.
//
// O que resta é o único ponto sem cobertura em nenhum outro teste: o texto exato do
// anúncio em aria-live para o diagrama que de fato abre quando alguém usa a aplicação.
import { describe, expect, it } from 'vitest';
import { parseErDiagram } from '../../src/core';
import { describeParseResult } from '../../src/ui/announcements';
import { exampleDiagram } from '../../src/ui/exampleDiagram';

describe('CT-E2E-01 · interpretação do diagrama de exemplo (ponta a ponta)', () => {
  it('anuncia o resultado como o leitor de tela vai ouvir (RF02, RF09)', () => {
    const result = parseErDiagram(exampleDiagram);

    expect(describeParseResult(result)).toBe(
      'Diagrama interpretado. Diagrama ER com 4 entidades e 3 relacionamentos. A árvore foi atualizada.',
    );
  });
});
