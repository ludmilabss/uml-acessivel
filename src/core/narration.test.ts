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
      'CLIENTE, exatamente um, faz PEDIDO, zero ou muitos. Relacionamento um para muitos. Não identificador: cada entidade tem identificação própria.',
      'PEDIDO, exatamente um, possui itens ITEM_PEDIDO, um ou muitos. Relacionamento um para muitos. Identificador: ITEM_PEDIDO depende de PEDIDO para ser identificada.',
      'FUNCIONARIO, zero ou muitos, participa PROJETO, zero ou muitos. Relacionamento muitos para muitos. Não identificador: cada entidade tem identificação própria.',
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
      'id: int, chave primária.',
      'pedido_id: int, chave primária e chave estrangeira.',
      'codigo: string, chave única. Comentário: código interno.',
      'nome: string.',
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
      'Entidade: PEDIDO. Nenhum atributo, 2 relacionamentos.',
    );
    expect(describeDiagram(diagram)).toBe('Diagrama ER com 2 entidades e sem relacionamentos.');
  });

  it('explica o relacionamento identificador dizendo quem depende de quem', () => {
    const diagram = parseValid(`erDiagram
  ITEM }|--|| PEDIDO : pertence
  PESSOA ||--|| CPF : possui`);

    expect(diagram.relationships.map(describeRelationship)).toEqual([
      'ITEM, um ou muitos, pertence PEDIDO, exatamente um. Relacionamento muitos para um. Identificador: ITEM depende de PEDIDO para ser identificada.',
      'PESSOA, exatamente um, possui CPF, exatamente um. Relacionamento um para um. Identificador: uma entidade depende da outra para ser identificada.',
    ]);
  });

  it('descreve o diagrama sem entidades', () => {
    expect(describeDiagram(parseValid('erDiagram'))).toBe('Diagrama ER sem entidades.');
  });
});
