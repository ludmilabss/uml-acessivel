import type { ParseErrorCode } from './model';

/**
 * Diagramas de exemplo para teste (#7): válidos, cobrindo a gramática do MVP, e inválidos,
 * um para cada código de erro. Também servem para testes manuais e demonstrações.
 */

export interface ValidExample {
  readonly name: string;
  readonly description: string;
  readonly source: string;
  readonly entityCount: number;
  readonly relationshipCount: number;
}

export interface InvalidExample {
  readonly name: string;
  readonly source: string;
  readonly expectedCode: ParseErrorCode;
}

export const validExamples: readonly ValidExample[] = [
  {
    name: 'E-commerce (Cenário 1)',
    description: 'Loja virtual: chave composta, ligação identificadora e não identificadora.',
    entityCount: 4,
    relationshipCount: 3,
    source: `erDiagram
  CLIENTE ||..o{ PEDIDO : faz
  PEDIDO ||--|{ ITEM_PEDIDO : contem
  PRODUTO ||--o{ ITEM_PEDIDO : "aparece em"

  CLIENTE {
    int id PK
    string nome "nome completo"
    string email UK
  }
  PEDIDO {
    int id PK
    int cliente_id FK
    date data
  }
  ITEM_PEDIDO {
    int pedido_id PK, FK
    int produto_id PK, FK
    int quantidade
  }
  PRODUTO {
    int id PK
    string nome
    decimal preco
  }`,
  },
  {
    name: 'Escola',
    description: 'Muitos para muitos e um para um.',
    entityCount: 4,
    relationshipCount: 3,
    source: `erDiagram
  ALUNO }o..o{ TURMA : "está matriculado em"
  PROFESSOR ||..o{ TURMA : leciona
  ALUNO ||--|| MATRICULA : possui

  ALUNO {
    int id PK
    string nome
  }
  TURMA {
    int codigo PK
    string disciplina
  }
  PROFESSOR {
    int id PK
    string nome
  }
  MATRICULA {
    int aluno_id PK, FK
    string numero UK
  }`,
  },
  {
    name: 'Biblioteca',
    description: 'Zero ou um, muitos para um e entidade só citada em relacionamento.',
    entityCount: 4,
    relationshipCount: 3,
    source: `erDiagram
  %% AUTOR aparece só nos relacionamentos, sem bloco de atributos
  LIVRO }|..|| EDITORA : "é publicado por"
  LIVRO }o..o{ AUTOR : "é escrito por"
  EMPRESTIMO |o..|| LIVRO : registra

  LIVRO {
    string isbn PK
    string titulo
    int editora_id FK
  }
  EDITORA {
    int id PK
    string nome
  }
  EMPRESTIMO {
    int id PK
    string isbn FK
    date devolucao "data prevista de devolução"
  }`,
  },
  {
    name: 'Hospital',
    description: 'Mais de um relacionamento entre o mesmo par de entidades.',
    entityCount: 3,
    relationshipCount: 3,
    source: `erDiagram
  MEDICO ||..o{ CONSULTA : atende
  PACIENTE ||..o{ CONSULTA : agenda
  MEDICO }o..o{ PACIENTE : acompanha

  MEDICO {
    int crm PK
    string especialidade
  }
  PACIENTE {
    int id PK
    string nome
  }
  CONSULTA {
    int id PK
    int crm FK
    int paciente_id FK
    date data
  }`,
  },
  {
    name: 'Rede social',
    description: 'Autorrelacionamento.',
    entityCount: 2,
    relationshipCount: 2,
    source: `erDiagram
  USUARIO }o..o{ USUARIO : segue
  USUARIO ||..o{ POSTAGEM : publica

  USUARIO {
    int id PK
    string apelido UK
  }
  POSTAGEM {
    int id PK
    int autor_id FK
    string texto
  }`,
  },
];

export const invalidExamples: readonly InvalidExample[] = [
  { name: 'Sem cabeçalho', expectedCode: 'E01', source: 'CLIENTE ||..o{ PEDIDO : faz' },
  {
    name: 'Linha não reconhecida',
    expectedCode: 'E02',
    source: 'erDiagram\n  CLIENTE ||..o{ PEDIDO : faz "pedido"',
  },
  {
    name: 'Bloco sem fechar',
    expectedCode: 'E03',
    source: 'erDiagram\n  CLIENTE {\n    int id PK',
  },
  {
    name: 'Atributo sem nome',
    expectedCode: 'E04',
    source: 'erDiagram\n  CLIENTE {\n    int\n  }',
  },
  {
    name: 'Chave desconhecida',
    expectedCode: 'E05',
    source: 'erDiagram\n  CLIENTE {\n    int id XK\n  }',
  },
  {
    name: 'Cardinalidade inválida',
    expectedCode: 'E06',
    source: 'erDiagram\n  CLIENTE ||xxo{ PEDIDO : faz',
  },
  {
    name: 'Relacionamento sem rótulo',
    expectedCode: 'E07',
    source: 'erDiagram\n  CLIENTE ||..o{ PEDIDO',
  },
  {
    name: 'Entidade com dois blocos',
    expectedCode: 'E08',
    source: 'erDiagram\n  CLIENTE {\n    int id PK\n  }\n  CLIENTE {\n    string nome\n  }',
  },
  {
    name: 'Atributo repetido',
    expectedCode: 'E09',
    source: 'erDiagram\n  CLIENTE {\n    int id PK\n    int id\n  }',
  },
  { name: 'Bloco vazio', expectedCode: 'E10', source: 'erDiagram\n  CLIENTE {\n  }' },
  {
    name: 'Aspas não fechadas',
    expectedCode: 'E11',
    source: 'erDiagram\n  CLIENTE {\n    string nome "sem fechar\n  }',
  },
  {
    name: 'Chave repetida',
    expectedCode: 'E12',
    source: 'erDiagram\n  CLIENTE {\n    int id PK, PK\n  }',
  },
  {
    name: 'Recurso fora do MVP (acento fora de aspas)',
    expectedCode: 'E13',
    source: 'erDiagram\n  CLIENTE ||..o{ PEDIDO : contém',
  },
  {
    name: 'Texto entre aspas vazio',
    expectedCode: 'E14',
    source: 'erDiagram\n  CLIENTE ||..o{ PEDIDO : ""',
  },
];
