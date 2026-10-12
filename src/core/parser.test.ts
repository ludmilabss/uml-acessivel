import { describe, expect, it } from 'vitest';
import { parseErDiagram } from './index';

describe('parseErDiagram', () => {
  it('interpreta entidades, atributos e relacionamento', () => {
    const result = parseErDiagram(`%% diagrama de vendas
erDiagram
  CLIENTE ||..o{ PEDIDO : realiza
  CLIENTE {
    int id PK
    string nome "nome completo"
  }
  PEDIDO {
    int id PK
    int cliente_id FK
  }`);

    expect(result.errors).toEqual([]);
    expect(result.diagram).toMatchObject({
      headerLine: 2,
      entities: [
        {
          name: 'CLIENTE',
          firstMentionLine: 3,
          declarationLine: 4,
          attributes: [
            { type: 'int', name: 'id', keys: ['PK'], line: 5 },
            {
              type: 'string',
              name: 'nome',
              keys: [],
              comment: 'nome completo',
              line: 6,
            },
          ],
        },
        { name: 'PEDIDO' },
      ],
      relationships: [
        {
          leftEntity: 'CLIENTE',
          rightEntity: 'PEDIDO',
          leftCardinality: 'exactlyOne',
          rightCardinality: 'zeroOrMany',
          kind: 'nonIdentifying',
          classification: 'oneToMany',
          label: 'realiza',
          line: 3,
        },
      ],
    });
  });

  it('aceita entidade isolada e atributos com mais de uma chave', () => {
    const result = parseErDiagram(`erDiagram
  CATEGORIA
  ITEM {
    int categoria_id PK, FK
  }`);

    expect(result.errors).toEqual([]);
    expect(result.diagram?.entities).toEqual([
      {
        name: 'CATEGORIA',
        attributes: [],
        firstMentionLine: 2,
        declarationLine: undefined,
      },
      {
        name: 'ITEM',
        attributes: [
          {
            type: 'int',
            name: 'categoria_id',
            keys: ['PK', 'FK'],
            comment: undefined,
            line: 4,
          },
        ],
        firstMentionLine: 3,
        declarationLine: 3,
      },
    ]);
  });

  it('preserva autorrelacionamentos e relacionamentos repetidos', () => {
    const result = parseErDiagram(`erDiagram
  FUNCIONARIO |o..o{ FUNCIONARIO : gerencia
  FUNCIONARIO |o..o{ FUNCIONARIO : supervisiona`);

    expect(result.errors).toEqual([]);
    expect(result.diagram?.relationships).toHaveLength(2);
    expect(result.diagram?.relationships.map((relationship) => relationship.label)).toEqual([
      'gerencia',
      'supervisiona',
    ]);
  });

  it('informa cabeçalho ausente', () => {
    const result = parseErDiagram('CLIENTE');

    expect(result).toEqual({
      errors: [
        {
          code: 'E01',
          line: 1,
          message: 'Linha 1: A primeira linha útil do diagrama deve ser erDiagram.',
        },
      ],
    });
  });

  it('informa bloco vazio e não devolve diagrama parcial', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE {
  }`);

    expect(result.diagram).toBeUndefined();
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'E10', line: 3 }),
    );
  });

  it('informa bloco não fechado na linha de abertura', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE {
    int id PK`);

    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'E03', line: 2 }),
    );
  });

  it('informa atributo repetido, chave repetida e chave desconhecida', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE {
    int id PK
    int chave_composta PK, PK
    int codigo XK
    int id
  }`);

    expect(result.errors.map((error) => error.code)).toEqual(['E12', 'E05', 'E09']);
  });

  it('informa problemas de rótulo, cardinalidade e aspas', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE ||..o{ PEDIDO :
  CLIENTE xx..o{ PEDIDO : faz
  CLIENTE ||..o{ PEDIDO : "`);

    expect(result.errors.map((error) => error.code)).toEqual(['E07', 'E06', 'E11']);
  });

  it('rejeita recursos fora do MVP', () => {
    const result = parseErDiagram(`erDiagram
  direction LR
  CLIENTE {
    string[] telefones
  }`);

    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'E13', line: 2 }),
      expect.objectContaining({ code: 'E13', line: 4 }),
    ]);
  });

  it('informa instrução desconhecida, bloco repetido, atributo incompleto e texto vazio', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE {
    int id
  }
  CLIENTE {
    int
  }
  CLIENTE ||..o{ PEDIDO : ""
  algo que nao pertence ao diagrama`);

    expect(result.errors.map((error) => error.code)).toEqual(['E08', 'E04', 'E14', 'E02']);
  });
});
