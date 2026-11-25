// Testes de ponta a ponta do núcleo: cobre o requisito RF09 (validação de sintaxe
// com erro textual) e a tabela de códigos de erro da seção 9 de docs/gramatica-er.md,
// um diagrama por código, mais o anúncio que a interface lê na região aria-live.
import { describe, expect, it } from 'vitest';
import { parseErDiagram } from '../../src/core';
import { describeParseResult } from '../../src/ui/announcements';

describe('CT-E2E-06 · cada código de erro E01–E14 é reportado com linha e motivo', () => {
  const casos: readonly { readonly codigo: string; readonly fonte: string; readonly linha: number }[] =
    [
      { codigo: 'E01', fonte: 'CLIENTE', linha: 1 },
      {
        codigo: 'E02',
        fonte: `erDiagram
algo que nao pertence ao diagrama`,
        linha: 2,
      },
      {
        codigo: 'E03',
        fonte: `erDiagram
CLIENTE {
  int id PK`,
        linha: 2,
      },
      {
        codigo: 'E04',
        fonte: `erDiagram
CLIENTE {
  int
}`,
        linha: 3,
      },
      {
        codigo: 'E05',
        fonte: `erDiagram
CLIENTE {
  int codigo XK
}`,
        linha: 3,
      },
      {
        codigo: 'E06',
        fonte: `erDiagram
CLIENTE xx..o{ PEDIDO : faz`,
        linha: 2,
      },
      {
        codigo: 'E07',
        fonte: `erDiagram
CLIENTE ||..o{ PEDIDO`,
        linha: 2,
      },
      {
        codigo: 'E08',
        fonte: `erDiagram
CLIENTE {
  int id PK
}
CLIENTE {
  int outro PK
}`,
        linha: 5,
      },
      {
        codigo: 'E09',
        fonte: `erDiagram
CLIENTE {
  int id PK
  int id
}`,
        linha: 4,
      },
      {
        codigo: 'E10',
        fonte: `erDiagram
CLIENTE {
}`,
        linha: 3,
      },
      {
        codigo: 'E11',
        fonte: `erDiagram
CLIENTE {
  string nome "nome incompleto
}`,
        linha: 3,
      },
      {
        codigo: 'E12',
        fonte: `erDiagram
CLIENTE {
  int id PK, PK
}`,
        linha: 3,
      },
      {
        codigo: 'E13',
        fonte: `erDiagram
direction LR`,
        linha: 2,
      },
      {
        codigo: 'E14',
        fonte: `erDiagram
CLIENTE ||..o{ PEDIDO : ""`,
        linha: 2,
      },
    ];

  it.each(casos)('código $codigo aponta a linha $linha', ({ codigo, fonte, linha }) => {
    const result = parseErDiagram(fonte);

    expect(result.diagram).toBeUndefined();
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: codigo, line: linha }),
    );
    // Toda mensagem informa a linha em texto claro, como exige o RF09.
    expect(result.errors.find((error) => error.code === codigo)?.message).toMatch(
      new RegExp(`^Linha ${linha}: `),
    );
  });

  // A checagem "existe 1 diagrama de exemplo para cada um dos 14 códigos, nem a mais nem a
  // menos" passou a ser feita por src/core/exampleDiagrams.test.ts (fixture oficial da equipe,
  // reutilizada em testes manuais e demonstrações). Não repetimos aqui para não manter duas
  // listas de "os 14 códigos" que podem divergir uma da outra sem ninguém notar.
});

// CT-E2E-07 (anúncio de erro único/múltiplo) e CT-E2E-08 (recursos fora do MVP) foram
// removidos daqui por serem redundantes com cobertura já existente:
// - O anúncio com 1 erro e com vários erros já é testado por src/ui/treeNavigation.test.ts
//   ("anuncia a quantidade de erros e o primeiro deles"), com outro diagrama mas o mesmo
//   formato. "Não entrega diagrama parcial" já é garantido, nos 14 casos acima, pela
//   própria asserção `expect(result.diagram).toBeUndefined()`.
// - Os recursos fora do MVP (classDef, varchar(10), acento, alias, cardinalidade em texto,
//   nome entre aspas) já têm teste mais rigoroso em src/core/parser.test.ts ("explica o
//   motivo de cada recurso fora do MVP"), que confere a mensagem inteira, não só o código.

describe('CT-E2E-09 · aviso W01 (chave estrangeira sem relacionamento) chega até o anúncio', () => {
  // W01 é novo: a equipe já tem teste unitário do parser (src/core/parser.test.ts) e um teste de
  // interface que seleciona o aviso (src/App.test.tsx), mas nenhum dos dois confere o texto
  // final que o anúncio em aria-live compõe ao juntar diagrama interpretado + aviso. É esse
  // ponto de integração que falta cobertura, e é o que este teste garante.
  it('não é um erro: a árvore é montada normalmente, mas o aviso aparece em result.warnings', () => {
    const result = parseErDiagram(`erDiagram
CLIENTE {
  int id PK
}
PEDIDO {
  int id PK
  int cliente_id FK
}`);

    expect(result.diagram).toBeDefined();
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'W01', line: 7 }),
    ]);
  });

  it('o anúncio lido pelo leitor de tela informa o diagrama interpretado e, em seguida, o aviso', () => {
    const result = parseErDiagram(`erDiagram
PEDIDO {
  int id PK
  int cliente_id FK
}`);

    // "cliente_id" sai como "cliente id" porque describeParseResult passa o texto inteiro por
    // forSpeech, que troca sublinhado por espaço para o leitor de tela ler palavras separadas
    // (ver src/ui/pronunciation.ts) — igual já acontece com os anúncios de erro.
    expect(describeParseResult(result)).toBe(
      'Diagrama interpretado. Diagrama ER com 1 entidade e sem relacionamentos. ' +
        'A árvore foi atualizada. 1 aviso: Linha 4: A entidade PEDIDO tem chave estrangeira ' +
        '(cliente id), mas não participa de nenhum relacionamento.',
    );
  });
});
