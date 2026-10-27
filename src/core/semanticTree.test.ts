import { describe, expect, it } from 'vitest';
import { buildSemanticTree, parseErDiagram } from './index';
import type { Diagram, SemanticNode } from './index';

function parseValid(source: string): Diagram {
  const result = parseErDiagram(source);
  if (!result.diagram) {
    throw new Error(`Diagrama inválido: ${JSON.stringify(result.errors)}`);
  }
  return result.diagram;
}

function findNode(node: SemanticNode, id: string): SemanticNode | undefined {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function collectIds(node: SemanticNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

const lojaSource = `erDiagram
  CLIENTE ||..o{ PEDIDO : realiza
  PEDIDO ||--|{ ITEM_PEDIDO : contem
  CLIENTE {
    int id PK
    string nome "nome completo"
  }
  PEDIDO {
    int id PK
    int cliente_id FK
  }`;

describe('buildSemanticTree', () => {
  it('organiza o diagrama em entidades e relacionamentos', () => {
    const tree = buildSemanticTree(parseValid(lojaSource));

    expect(tree).toMatchObject({
      id: 'diagram',
      kind: 'diagram',
      description: 'Diagrama ER com 3 entidades e 2 relacionamentos.',
      line: 1,
    });
    expect(tree.children.map((node) => node.id)).toEqual(['entities', 'relationships']);
    expect(tree.children[0].children.map((node) => node.label)).toEqual([
      'CLIENTE',
      'PEDIDO',
      'ITEM_PEDIDO',
    ]);
    expect(tree.children[1].children.map((node) => node.label)).toEqual([
      'CLIENTE realiza PEDIDO',
      'PEDIDO contem ITEM_PEDIDO',
    ]);
  });

  it('cria atributos e relacionamentos de cada entidade', () => {
    const tree = buildSemanticTree(parseValid(lojaSource));
    const cliente = findNode(tree, 'entity:CLIENTE');

    expect(cliente).toMatchObject({
      kind: 'entity',
      description: 'Entidade: CLIENTE. 2 atributos, 1 relacionamento.',
      line: 4,
      reference: { kind: 'entity', entityName: 'CLIENTE' },
    });
    expect(cliente?.children.map(({ label, description }) => ({ label, description }))).toEqual([
      { label: 'Atributos (2)', description: '2 atributos.' },
      { label: 'Relacionamentos (1)', description: '1 relacionamento.' },
    ]);
    expect(findNode(tree, 'entity:CLIENTE:attribute:id')).toMatchObject({
      kind: 'attribute',
      label: 'id: int [PK]',
      description: 'id: int, chave primária.',
      line: 5,
      reference: { kind: 'attribute', entityName: 'CLIENTE', attributeName: 'id' },
    });
  });

  it('aponta o destino de cada relacionamento para a outra entidade', () => {
    const tree = buildSemanticTree(parseValid(lojaSource));
    const pedidoRelationships = findNode(tree, 'entity:PEDIDO:relationships');

    expect(pedidoRelationships?.children).toEqual([
      expect.objectContaining({
        id: 'entity:PEDIDO:relationship:0',
        targetId: 'entity:CLIENTE',
        reference: { kind: 'relationship', relationshipIndex: 0 },
      }),
      expect.objectContaining({
        id: 'entity:PEDIDO:relationship:1',
        targetId: 'entity:ITEM_PEDIDO',
        reference: { kind: 'relationship', relationshipIndex: 1 },
      }),
    ]);
    expect(findNode(tree, 'relationship:0')?.targetId).toBeUndefined();
  });

  it('omite grupos vazios', () => {
    const tree = buildSemanticTree(parseValid(lojaSource));

    expect(findNode(tree, 'entity:ITEM_PEDIDO')?.children.map((node) => node.id)).toEqual([
      'entity:ITEM_PEDIDO:relationships',
    ]);
    expect(buildSemanticTree(parseValid('erDiagram')).children).toEqual([]);
  });

  it('lista autorrelacionamento uma vez, com destino na própria entidade', () => {
    const tree = buildSemanticTree(
      parseValid(`erDiagram
  FUNCIONARIO |o..o{ FUNCIONARIO : gerencia`),
    );

    expect(findNode(tree, 'entity:FUNCIONARIO')?.description).toBe(
      'Entidade: FUNCIONARIO. 0 atributos, 1 relacionamento.',
    );
    expect(findNode(tree, 'entity:FUNCIONARIO:relationships')?.children).toEqual([
      expect.objectContaining({ targetId: 'entity:FUNCIONARIO' }),
    ]);
  });

  it('gera identificadores únicos mesmo com nomes parecidos', () => {
    const tree = buildSemanticTree(
      parseValid(`erDiagram
  A ||--o{ A-attributes : tem
  A {
    int id PK
  }
  A-attributes {
    int id PK
  }`),
    );
    const ids = collectIds(tree);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
