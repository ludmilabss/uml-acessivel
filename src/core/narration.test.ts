import { describe, expect, it } from 'vitest';
import {
  describeAttribute,
  describeCardinality,
  describeDiagram,
  describeEntity,
  describeRelationship,
  parseErDiagram,
} from './index';
import type { Cardinality, Diagram } from './index';

function parseValid(source: string): Diagram {
  const result = parseErDiagram(source);
  if (!result.diagram) {
    throw new Error(`Diagrama inválido: ${JSON.stringify(result.errors)}`);
  }
  return result.diagram;
}

describe('narração', () => {
  it('descreve as quatro cardinalidades', () => {
    const cardinalities: readonly Cardinality[] = [
      'exactlyOne',
      'zeroOrOne',
      'oneOrMany',
      'zeroOrMany',
    ];

    expect(cardinalities.map(describeCardinality)).toEqual([
      'exatamente um',
      'zero ou um',
      'um ou muitos',
      'zero ou muitos',
    ]);
  });

  it('descreve relacionamento no formato da gramática', () => {
    const diagram = parseValid(`erDiagram
  CLIENTE ||..o{ PEDIDO : faz
  PEDIDO ||--|{ ITEM_PEDIDO : "possui itens"
  FUNCIONARIO }o..o{ PROJETO : participa`);

    expect(diagram.relationships.map(describeRelationship)).toEqual([
      'CLIENTE, exatamente um, faz PEDIDO, zero ou muitos. Relacionamento um para muitos, não identificador.',
      'PEDIDO, exatamente um, possui itens ITEM_PEDIDO, um ou muitos. Relacionamento um para muitos, identificador.',
      'FUNCIONARIO, zero ou muitos, participa PROJETO, zero ou muitos. Relacionamento muitos para muitos, não identificador.',
    ]);
  });

  it('descreve atributos com tipo, chaves e comentário', () => {
    const diagram = parseValid(`erDiagram
  ITEM {
    int id PK
    int pedido_id PK, FK
    string codigo UK "código interno"
    string nome
  }`);

    expect(diagram.entities[0].attributes.map(describeAttribute)).toEqual([
      'Atributo id, tipo int, chave primária.',
      'Atributo pedido_id, tipo int, chave primária e chave estrangeira.',
      'Atributo codigo, tipo string, chave única. Comentário: código interno.',
      'Atributo nome, tipo string.',
    ]);
  });

  it('concorda singular e plural nas contagens', () => {
    const diagram = parseValid(`erDiagram
  CLIENTE {
    int id PK
  }
  PEDIDO`);

    expect(describeEntity(diagram.entities[0], 1)).toBe(
      'Entidade: CLIENTE. 1 atributo, 1 relacionamento.',
    );
    expect(describeEntity(diagram.entities[1], 2)).toBe(
      'Entidade: PEDIDO. 0 atributos, 2 relacionamentos.',
    );
    expect(describeDiagram(diagram)).toBe('Diagrama ER com 2 entidades e 0 relacionamentos.');
  });
});
