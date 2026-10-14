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

  it('rejeita palavras reservadas e segundo cabeçalho em vez de criar entidades', () => {
    const result = parseErDiagram(`erDiagram
  CLIENTE
  style CLIENTE fill:#f9f
  classDef destaque fill:#f9f
  class CLIENTE destaque
  erDiagram`);

    expect(result.diagram).toBeUndefined();
    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'E13', line: 3 }),
      expect.objectContaining({ code: 'E13', line: 4 }),
      expect.objectContaining({ code: 'E13', line: 5 }),
      expect.objectContaining({ code: 'E13', line: 6 }),
    ]);
  });

  it('aceita palavras reservadas como nomes de entidade em relacionamento válido', () => {
    const result = parseErDiagram(`erDiagram
  style ||..o{ class : usa`);

    expect(result.errors).toEqual([]);
    expect(result.diagram?.entities.map((entity) => entity.name)).toEqual(['style', 'class']);
  });

  it('rejeita acentos fora de aspas e aceita dentro delas', () => {
    const result = parseErDiagram(`erDiagram
  PREÇO
  PRODUTO {
    decimal preço
    string nome "descrição do produto"
  }
  PRODUTO ||..o{ PEDIDO : contém
  CLIENTE ||..o{ ENDERECO : "possui endereço"`);

    expect(result.errors).toEqual([
      expect.objectContaining({ code: 'E13', line: 2 }),
      expect.objectContaining({ code: 'E13', line: 4 }),
      expect.objectContaining({ code: 'E13', line: 7 }),
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

  it('explica o motivo de cada recurso fora do MVP', () => {
    const result = parseErDiagram(`erDiagram
  erDiagram
  style CLIENTE fill:#f9f
  PREÇO
  CLIENTE {
    varchar(10) nome
    string endereço
  }
  CLIENTE ||..o{ PEDIDO : contém
  p[Pessoa]
  "MEU CLIENTE"
  CLIENTE only one to zero or more PEDIDO : faz`);

    expect(result.errors.map((error) => error.message)).toEqual([
      'Linha 2: Só é permitido um diagrama por entrada; o cabeçalho erDiagram já aparece na linha 1.',
      'Linha 3: O comando style não é suportado; recursos visuais estão fora do MVP.',
      'Linha 4: Acentos e ç só são aceitos entre aspas.',
      'Linha 6: Tipos com colchetes, parênteses ou ?, como varchar(10), não são suportados.',
      'Linha 7: Acentos e ç só são aceitos entre aspas.',
      'Linha 9: Rótulo com acento deve ficar entre aspas, por exemplo "contém".',
      'Linha 10: Alias de entidade, como p[Pessoa], não é suportado.',
      'Linha 11: Nomes de entidade entre aspas não são suportados.',
      'Linha 12: Cardinalidade em texto não é suportada; use os símbolos ||, |o, }o ou }| à esquerda e ||, o|, o{ ou |{ à direita.',
    ]);
    expect(result.errors.every((error) => error.code === 'E13')).toBe(true);
  });

  it('classifica relacionamentos pelas cardinalidades máximas e pela ligação', () => {
    const result = parseErDiagram(`erDiagram
  PESSOA ||--|| CPF : possui
  PEDIDO }|..|| CLIENTE : pertence
  ALUNO }o..o{ CURSO : cursa
  PEDIDO ||--o| NOTA_FISCAL : gera`);

    expect(result.errors).toEqual([]);
    expect(
      result.diagram?.relationships.map(({ leftCardinality, rightCardinality, kind, classification }) => ({
        leftCardinality,
        rightCardinality,
        kind,
        classification,
      })),
    ).toEqual([
      {
        leftCardinality: 'exactlyOne',
        rightCardinality: 'exactlyOne',
        kind: 'identifying',
        classification: 'oneToOne',
      },
      {
        leftCardinality: 'oneOrMany',
        rightCardinality: 'exactlyOne',
        kind: 'nonIdentifying',
        classification: 'manyToOne',
      },
      {
        leftCardinality: 'zeroOrMany',
        rightCardinality: 'zeroOrMany',
        kind: 'nonIdentifying',
        classification: 'manyToMany',
      },
      {
        leftCardinality: 'exactlyOne',
        rightCardinality: 'zeroOrOne',
        kind: 'identifying',
        classification: 'oneToOne',
      },
    ]);
  });

  it('aceita quebras de linha do Windows, tabs e rótulo entre aspas com espaço', () => {
    const result = parseErDiagram(
      'erDiagram\r\n\tPRODUTO ||..o{ ITEM\t:\t"aparece em"\r\n\tPRODUTO {\r\n\t\tstring\tcodigo\tUK\r\n\t}',
    );

    expect(result.errors).toEqual([]);
    expect(result.diagram?.relationships[0]).toMatchObject({ label: 'aparece em', line: 2 });
    expect(result.diagram?.entities[0].attributes[0]).toMatchObject({
      name: 'codigo',
      keys: ['UK'],
      line: 4,
    });
  });

  it('informa cabeçalho que aparece depois de outra instrução', () => {
    const result = parseErDiagram(`%% comentário inicial

CLIENTE
erDiagram`);

    expect(result.errors).toEqual([expect.objectContaining({ code: 'E01', line: 3 })]);
  });
});
