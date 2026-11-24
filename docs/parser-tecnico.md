# Documentação técnica do núcleo (parser, árvore e narração)

> Para quem vai manter ou estender o código em `src/core/`. A sintaxe aceita está em [gramatica-er.md](gramatica-er.md); o desempenho, em [relatorio-desempenho.md](relatorio-desempenho.md).

## 1. Visão geral

O núcleo transforma o texto `erDiagram` em estruturas que a interface usa. Ele é TypeScript puro: **nada em `src/core/` importa React** (regra do projeto). A interface importa o núcleo só por [`src/core/index.ts`](../src/core/index.ts).

```
texto erDiagram
   │  parseErDiagram()          parser.ts
   ▼
ParseResult { diagram?, errors, warnings? }
   │  buildSemanticTree()       semanticTree.ts   (usa narration.ts)
   ▼
SemanticNode (árvore navegável, com label, description e line em cada nó)
   │
   ├─ interface: árvore WAI-ARIA, desenho SVG, voz      (src/ui/)
   └─ exportMarkdown()          markdownExport.ts  (usa narration.ts)
```

| Arquivo | Responsabilidade |
|---|---|
| `model.ts` | Tipos: `Diagram`, `Entity`, `Attribute`, `Relationship`, `ParseError`, `ParseWarning`, `ParseResult` |
| `parser.ts` | Lê o texto linha a linha, valida e monta o `Diagram`; acumula erros e avisos |
| `narration.ts` | Frases em português lidas pelo leitor de tela, pela voz e usadas na exportação |
| `semanticTree.ts` | Projeta o `Diagram` na árvore de navegação (`SemanticNode`) |
| `markdownExport.ts` | Gera a descrição do diagrama em Markdown (#27) |
| `performanceFixtures.ts` | Gera diagramas sintéticos para o teste e o benchmark de desempenho |

## 2. Modelo de dados (`model.ts`)

- **`Diagram`**: `headerLine`, `entities` e `relationships` (na ordem do código).
- **`Entity`**: `name`, `attributes`, `firstMentionLine` (primeira vez que aparece, em bloco ou relacionamento) e `declarationLine` (linha do bloco `NOME {`, se houver).
- **`Attribute`**: `type`, `name`, `keys` (`PK`, `FK`, `UK`), `comment` opcional e `line`.
- **`Relationship`**: entidades da esquerda e da direita, `leftCardinality` e `rightCardinality` (`exactlyOne`, `zeroOrOne`, `oneOrMany`, `zeroOrMany`), `kind` (`identifying` ou `nonIdentifying`), `classification` (`oneToOne`, `oneToMany`, `manyToOne`, `manyToMany`), `label` e `line`.
- **`ParseError`**: `code` (E01 a E14), `message` (já começa com "Linha N:"), `line` e, quando se sabe o trecho exato, `column` e `length` (#29).
- **`ParseWarning`**: `code` (W01), `message` e `line`. Avisos não impedem o diagrama (#30).
- **`ParseResult`**: `diagram` só existe quando **não há erros**; `warnings` só existe junto com o `diagram`.

Todos os tipos são `readonly`: o núcleo nunca altera um diagrama depois de criado.

## 3. Parser (`parser.ts`)

### 3.1 Estratégia

O parser é **orientado a linhas**, com um único estado: o bloco de entidade aberto (`EntityBlockState`). Não há tokenizador separado; cada linha é reconhecida por expressões regulares no topo do arquivo.

1. Acha a **primeira linha útil** (não vazia e não comentário `%%`). Se não for `erDiagram`, devolve **E01** e para.
2. Percorre as linhas seguintes. Linhas vazias e comentários são ignorados.
3. **Dentro de um bloco**, `}` fecha o bloco (E10 se não houver atributos) e qualquer outra linha é um atributo, **exceto** a abertura de outra entidade (`NOME {`) ou um relacionamento (segunda palavra é um operador válido): aí falta o `}`, e o parser reporta **E03** e lê a linha fora do bloco, sem erros em cascata (#36).
4. **Fora de um bloco**, testa nesta ordem: abertura de bloco, palavras reservadas do Mermaid (E13), entidade solta, relacionamento, relacionamento sem rótulo (E07), recursos fora do MVP (E13) e, por fim, instrução não reconhecida (E02).
5. No fim, um bloco ainda aberto gera **E03**.

### 3.2 Erros acumulados

O parser **não para no primeiro erro**: ele registra o erro e segue para a próxima linha, para a pessoa ver todos os problemas de uma vez. Se houver qualquer erro, o resultado não traz `diagram`.

Cada erro é criado por `createError(code, message, line, span?)`, que já prefixa "Linha N:". O `span` opcional diz qual trecho da linha causou o erro (a chave, o operador, as aspas); a etapa final `locateErrors` procura esse trecho na linha original, com a indentação, e preenche `column` e `length`. A lista completa de códigos e mensagens está na seção 9 da gramática.

### 3.3 Avisos

Com o diagrama válido, `findWarnings` gera avisos que não bloqueiam nada. Hoje há um: **W01**, entidade com `FK` que não participa de nenhum relacionamento (seção 9.1 da gramática).

### 3.4 Pontos de atenção

- **Ordem dos testes fora do bloco importa.** Uma linha como `erDiagram` repetida casaria com "entidade solta"; por isso as palavras reservadas são testadas antes.
- **Três palavras não bastam para ser relacionamento.** Um atributo como `int id PK` também tem três; o reconhecimento exige que a segunda palavra seja um operador válido.
- **Acentos** só são aceitos dentro de aspas (rótulos e comentários); fora delas geram E13 com uma mensagem específica.

## 4. Árvore semântica (`semanticTree.ts`)

`buildSemanticTree(diagram)` monta:

```
Diagrama ER                         id: diagram
├── Entidades (N)                   id: entities
│   └── ENTIDADE                    id: entity:NOME
│       ├── Atributos (N)           id: entity:NOME:attributes
│       │   └── atributo            id: entity:NOME:attribute:ATRIBUTO
│       └── Relacionamentos (N)     id: entity:NOME:relationships
│           └── relacionamento      id: entity:NOME:relationship:ÍNDICE   (targetId: a outra entidade)
└── Relacionamentos (N)             id: relationships
    └── relacionamento              id: relationship:ÍNDICE
```

- **Grupos vazios são omitidos**, para não criar itens expansíveis sem conteúdo.
- Os ids usam `:` como separador, que não existe nos identificadores da gramática, então são únicos.
- Cada nó tem `label` (texto curto), `description` (narração completa), `line` (linha de origem, exceto nos grupos), `reference` (o elemento do modelo, usado para destacar no SVG) e, nos relacionamentos dentro de uma entidade, `targetId` (para onde o Enter leva).
- Os ids de relacionamento usam o **índice** na lista; se um relacionamento for inserido antes, os índices dos seguintes mudam. Por isso a interface, ao reinterpretar (#34), pode levar o foco para o relacionamento vizinho.

## 5. Narração (`narration.ts`)

Funções puras que geram as frases. São a fonte única do texto lido pelo leitor de tela, falado pela voz e escrito na exportação.

| Função | Exemplo |
|---|---|
| `describeDiagram` | "Diagrama ER com 4 entidades e 3 relacionamentos." |
| `describeEntity` | "Entidade: CLIENTE. 3 atributos, 1 relacionamento." ("Nenhum atributo" quando zero) |
| `describeAttribute` | "id: int, chave primária." (forma ER: nome, tipo, chaves) |
| `describeRelationship` | "CLIENTE, exatamente um, faz PEDIDO, zero ou muitos. Relacionamento um para muitos. Não identificador: cada entidade tem identificação própria." |

No relacionamento identificador, a frase diz quem depende de quem: a entidade do lado "muitos" (#22). Em 1:1 e N:N, não dá para saber, e a frase fica genérica.

**Cuidados ao mudar uma frase:** a interface mostra a **primeira frase** da narração como texto visível de entidades, atributos e relacionamentos, para o nome lido começar pelo texto visível (WCAG 2.5.3). Uma mudança aqui muda a tela, a fala e a exportação ao mesmo tempo, e há testes no núcleo e na interface que conferem os textos.

## 6. Exportação em Markdown (`markdownExport.ts`)

`exportMarkdown(diagram)` gera títulos (`#`, `##`, `###`) e listas com as frases da narração, sem tabelas (mais fáceis de navegar com leitor de tela). O resumo de cada entidade omite "Entidade: NOME.", porque o nome já está no título.

## 7. Como estender

**Novo erro**

1. Acrescente o código em `ParseErrorCode` (`model.ts`).
2. Gere o erro com `createError` no ponto do parser onde ele é detectado; passe um `span` se o trecho exato for conhecido.
3. Documente na seção 9 da gramática e crie um teste em `parser.test.ts`.

**Nova construção da sintaxe**

1. Atualize a gramática (seções 1 a 8) antes do código.
2. Acrescente a expressão regular e o ponto de reconhecimento no laço principal, respeitando a ordem da seção 3.1.
3. Se for um novo elemento do modelo, crie o tipo em `model.ts`, o nó em `semanticTree.ts` e a frase em `narration.ts`.
4. Cubra com testes no parser, na árvore e na narração.

**Novo aviso**: acrescente o código em `ParseWarning`, a regra em `findWarnings` e a linha na seção 9.1 da gramática.

## 8. Testes

| Arquivo | O que cobre |
|---|---|
| `parser.test.ts` | Sintaxe válida, cada código de erro, posições (`column`/`length`), avisos |
| `semanticTree.test.ts` | Estrutura, ids, grupos omitidos, `targetId`, autorrelacionamento |
| `narration.test.ts` | Frases, singular e plural, identificador e não identificador |
| `markdownExport.test.ts` | Texto exportado |
| `performance.test.ts` | Meta de 500 ms (falha se algum cenário passar do limite) |

Para rodar só o núcleo: `npx vitest run src/core`.
