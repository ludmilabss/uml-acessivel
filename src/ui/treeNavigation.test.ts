import { describe, expect, it } from 'vitest';
import { buildSemanticTree, parseErDiagram } from '../core';
import {
  ancestorIds,
  buildParentMap,
  findNode,
  flattenVisible,
  initialExpandedIds,
} from './treeNavigation';
import { lineRange } from './textPosition';
import { describeParseResult } from './announcements';
import { forSpeech } from './pronunciation';

const tree = buildSemanticTree(
  parseErDiagram(`erDiagram
  CLIENTE ||..o{ PEDIDO : faz
  CLIENTE {
    int id PK
  }`).diagram!,
);

describe('navegação da árvore', () => {
  it('lista só os nós visíveis, na ordem da tela', () => {
    expect(flattenVisible(tree, new Set(['diagram'])).map((node) => node.id)).toEqual([
      'diagram',
      'entities',
      'relationships',
    ]);
    expect(flattenVisible(tree, initialExpandedIds(tree)).map((node) => node.id)).toEqual([
      'diagram',
      'entities',
      'entity:CLIENTE',
      'entity:PEDIDO',
      'relationships',
      'relationship:0',
    ]);
  });

  it('encontra o pai e os ancestrais de um nó', () => {
    const parents = buildParentMap(tree);
    expect(parents.get('entity:CLIENTE')).toBe('entities');
    expect(parents.has('diagram')).toBe(false);
    expect(ancestorIds('entity:CLIENTE:attribute:id', parents)).toEqual([
      'entity:CLIENTE:attributes',
      'entity:CLIENTE',
      'entities',
      'diagram',
    ]);
  });

  it('encontra um nó pelo id', () => {
    expect(findNode(tree, 'entity:PEDIDO')?.label).toBe('PEDIDO');
    expect(findNode(tree, 'nao-existe')).toBeUndefined();
  });
});

describe('lineRange', () => {
  const text = 'erDiagram\n  CLIENTE {\r\n    int id PK\n  }';

  it('devolve início e fim da linha pedida', () => {
    expect(lineRange(text, 1)).toEqual({ start: 0, end: 9 });
    expect(text.slice(lineRange(text, 2).start, lineRange(text, 2).end)).toBe('  CLIENTE {');
  });

  it('limita linhas fora do texto à primeira e à última', () => {
    expect(lineRange(text, 0)).toEqual(lineRange(text, 1));
    expect(text.slice(lineRange(text, 99).start, lineRange(text, 99).end)).toBe('  }');
  });
});

describe('describeParseResult', () => {
  it('resume o diagrama interpretado', () => {
    expect(describeParseResult(parseErDiagram('erDiagram\n  A ||..o{ B : tem'))).toBe(
      'Diagrama interpretado. Diagrama ER com 2 entidades e 1 relacionamento. A árvore foi atualizada.',
    );
  });

  it('anuncia a quantidade de erros e o primeiro deles', () => {
    expect(describeParseResult(parseErDiagram('erDiagram\n  A ||..o{ B'))).toBe(
      '1 erro de sintaxe. Linha 2: O relacionamento precisa de um rótulo depois de ":". Código E07.',
    );
    expect(
      describeParseResult(parseErDiagram('erDiagram\n  A ||..o{ B\n  C ||xxo{ D : x')),
    ).toMatch(
      /^2 erros de sintaxe\. Linha 2: .* Código E07\. Veja a lista de erros abaixo do campo\.$/,
    );
  });
});

describe('forSpeech', () => {
  it('troca sublinhados por espaço, para o leitor de tela ler as palavras separadas', () => {
    expect(forSpeech('Entidade: ITEM_PEDIDO. cliente_id: int')).toBe(
      'Entidade: ITEM PEDIDO. cliente id: int',
    );
  });

  it('vale também para os anúncios de erro', () => {
    const result = parseErDiagram(
      'erDiagram\n  ITEM_PEDIDO {\n    int item_id\n    int item_id\n  }',
    );
    expect(describeParseResult(result)).toContain(
      "O atributo 'item id' já existe na entidade ITEM PEDIDO.",
    );
  });
});
