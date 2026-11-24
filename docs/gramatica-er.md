# Gramática do erDiagram suportada no MVP

> Documento de referência para o parser (#5), os tipos do modelo (#4) e os diagramas de teste (#7).
> Base: sintaxe `erDiagram` do Mermaid. O MVP aceita um **subconjunto** dela. O que não está listado aqui é rejeitado com erro claro (ver seção 8).

**Status:** rascunho para revisão · **Requisitos:** RF01, RF02, RF09

---

## 1. Estrutura geral

Um diagrama é um texto com:

1. Uma linha de cabeçalho `erDiagram` (a primeira linha que não for comentário nem estiver em branco)
2. Zero ou mais declarações de **entidade isolada**, linhas de **relacionamento** e **blocos de entidade**, em qualquer ordem
4. Comentários e linhas em branco, que são ignorados

```
erDiagram
    CLIENTE ||..o{ PEDIDO : faz

    CLIENTE {
        int id PK
        string nome
    }
```

Regras gerais:

- A indentação é livre (espaços ou tabs) e não tem significado.
- Espaços ou tabs no início e no fim de uma linha são ignorados. Onde a sintaxe separa itens, é necessário ao menos um espaço ou tab; exceto junto à vírgula das chaves, onde espaços são opcionais.
- Cada instrução ocupa **uma linha**, exceto o bloco de entidade (abre com `{`, fecha com `}`).
- Maiúsculas e minúsculas são diferentes (`Cliente` e `CLIENTE` são entidades distintas), exceto nas palavras reservadas `erDiagram`, `PK`, `FK` e `UK`, que devem ser escritas exatamente assim.

## 2. Comentários

Linha que, depois de ignorada a indentação inicial, começa com `%%`. Vale a linha inteira. Comentário no meio ou no fim de uma instrução **não** é suportado.

```
%% isto é um comentário
```

## 3. Identificadores (nomes de entidade, tipo e atributo)

| Item | Regra |
|---|---|
| Entidade | Começa com letra ou `_`; depois letras, dígitos, `_` ou `-` |
| Tipo de atributo | Começa com letra; depois letras, dígitos ou `_` (ex.: `int`, `string`, `decimal`, `date`) |
| Nome de atributo | Começa com letra ou `_`; depois letras, dígitos ou `_` |

- Letras = `A-Z` e `a-z`. **Acentos e `ç` não são aceitos em identificadores** (ex.: `preço`). Usar `preco`.
- O tipo é texto livre dentro dessa regra; o parser **não valida** se o tipo "existe" (`string`, `texto` e `xyz` são todos aceitos).

## 4. Entidades

Uma entidade passa a existir de duas formas:

**a) Com bloco de atributos**

```
CLIENTE {
    int id PK
    string nome
}
```

- O `{` fica na **mesma linha** do nome da entidade.
- Os atributos ficam um por linha.
- O `}` fica **sozinho** na sua linha.

**b) Apenas citada em um relacionamento** (sem bloco). Nesse caso ela existe com **zero atributos**.

```
CLIENTE ||..o{ PEDIDO : faz
```

**c) Declarada isoladamente** (sem atributos nem relacionamentos). Nesse caso ela existe com **zero atributos**.

```
CLIENTE
```

Restrições:

- Um bloco só é válido com **pelo menos um atributo** (bloco vazio `{ }` é erro).
- Uma entidade pode ter **no máximo um bloco** (bloco repetido é erro).
- A mesma entidade pode ser declarada isoladamente e depois receber um bloco ou participar de relacionamentos. Isso não cria outra entidade.

## 5. Atributos

Formato de cada linha dentro do bloco:

```
tipo nome [chaves] ["comentário"]
```

| Parte | Obrigatória? | Descrição |
|---|---|---|
| `tipo` | Sim | Ver seção 3 |
| `nome` | Sim | Ver seção 3 |
| `chaves` | Não | Uma ou mais de `PK`, `FK`, `UK`, separadas por vírgula |
| `"comentário"` | Não | Texto não vazio entre aspas duplas, no fim da linha |

**Chaves**

| Chave | Significado | Narração sugerida |
|---|---|---|
| `PK` | Chave primária | "chave primária" |
| `FK` | Chave estrangeira | "chave estrangeira" |
| `UK` | Chave única | "chave única" |

- Combinação com vírgula: `PK, FK` (ex.: chave primária composta que também é estrangeira).
- Mais de um atributo `PK` na mesma entidade é permitido (chave composta).
- A mesma chave repetida no mesmo atributo (`PK, PK`) é erro.
- Nomes de atributo **não podem se repetir** dentro da mesma entidade.
- Espaços em torno da vírgula são opcionais: `PK,FK` e `PK, FK` são equivalentes.
- Não há caractere de escape no MVP: texto entre aspas não pode conter aspas duplas nem quebra de linha.

Exemplos válidos:

```
int id PK
string email UK
int cliente_id FK
int pedido_id PK, FK
string nome "nome completo do cliente"
decimal preco
```

## 6. Relacionamentos

Formato:

```
ENTIDADE_A  OPERADOR  ENTIDADE_B : rótulo
```

O operador é escrito **sem espaços**, em três partes:

```
[lado esquerdo][ligação][lado direito]
   ||            --         o{
```

### 6.1 Cardinalidade (os símbolos)

O símbolo **ao lado de uma entidade** diz **quantas instâncias dela** participam do relacionamento.

| Lado esquerdo | Lado direito | Significado | Narração sugerida |
|---|---|---|---|
| `\|\|` | `\|\|` | Exatamente um | "exatamente um" |
| `\|o` | `o\|` | Zero ou um | "zero ou um" |
| `}o` | `o{` | Zero ou muitos | "zero ou muitos" |
| `}\|` | `\|{` | Um ou muitos | "um ou muitos" |

> Nas células da tabela, a barra `|` aparece com uma barra invertida só por causa da formatação do Markdown. No código, escreva `||`, `|o`, `}o`, `}|`, `o|`, `o{`, `|{`.

### 6.2 Ligação (identificador ou não)

| Símbolo | Tipo | Quando usar |
|---|---|---|
| `--` | **Identificador** | A entidade filha depende da pai para ser identificada (ex.: item de pedido) |
| `..` | **Não identificador** | A entidade filha existe por conta própria |

### 6.3 Rótulo

- É **obrigatório**.
- Sem aspas, deve seguir `rótulo-simples`: começa com letra ou `_`; depois aceita letras, dígitos, `_` ou `-` (`faz`, `contem`, `faz-pedido`).
- Com espaços ou acentos: entre aspas duplas, `"aparece em"`, `"possui endereço"`.
- Acentos só são aceitos **dentro de aspas**.
- O texto entre aspas deve ser não vazio e não pode conter aspas duplas nem quebra de linha. Não há caractere de escape no MVP.

### 6.4 Tipo do relacionamento (derivado)

Para a narração e a árvore semântica, o parser classifica o relacionamento pela cardinalidade **máxima** de cada lado (`||` e `|o` = um; `}o` e `}|` = muitos):

| Esquerdo × Direito | Classificação |
|---|---|
| um × um | 1:1 |
| um × muitos | 1:N |
| muitos × um | N:1 |
| muitos × muitos | N:N |

Exemplo de narração: `CLIENTE ||..o{ PEDIDO : faz` → "CLIENTE, exatamente um, faz PEDIDO, zero ou muitos. Relacionamento um para muitos. Não identificador: cada entidade tem identificação própria."

No relacionamento identificador, a narração diz quem depende de quem (a entidade do lado "muitos"): `PEDIDO ||--|{ ITEM_PEDIDO : contem` → "… Relacionamento um para muitos. Identificador: ITEM_PEDIDO depende de PEDIDO para ser identificada." Em 1:1 e N:N, a frase fica genérica ("uma entidade depende da outra para ser identificada").

### 6.5 Regras

- As duas entidades devem ter nomes válidos (seção 3). Se ainda não existirem, são criadas.
- Uma entidade pode se relacionar **consigo mesma** (autorrelacionamento).
- Pode haver mais de um relacionamento, inclusive com o mesmo rótulo, entre o mesmo par de entidades. Cada ocorrência é preservada como um relacionamento distinto e identificada pela sua linha de origem.

Exemplos válidos:

```
CLIENTE ||..o{ PEDIDO : faz
PEDIDO ||--|{ ITEM_PEDIDO : contem
PRODUTO ||..o{ ITEM_PEDIDO : "aparece em"
FUNCIONARIO |o..o{ FUNCIONARIO : gerencia
```

## 7. Resumo: construção → exemplo

| Construção | Exemplo |
|---|---|
| Cabeçalho | `erDiagram` |
| Comentário | `%% texto` |
| Entidade com bloco | `CLIENTE {` … `}` |
| Entidade só em relacionamento | `CLIENTE ||..o{ PEDIDO : faz` |
| Atributo simples | `string nome` |
| Atributo com chave | `int id PK` |
| Várias chaves | `int pedido_id PK, FK` |
| Atributo com comentário | `string nome "nome completo"` |
| Relacionamento identificador | `PEDIDO ||--\|{ ITEM_PEDIDO : contem` |
| Relacionamento não identificador | `CLIENTE ||..o{ PEDIDO : faz` |
| Rótulo com espaço | `PRODUTO ||..o{ ITEM_PEDIDO : "aparece em"` |

## 8. Fora do MVP

| Recurso do Mermaid | Por que ficou de fora |
|---|---|
| Nome de entidade entre aspas (`"MEU CLIENTE"`) | Exige tratar nomes com espaço em toda a árvore e na narração; baixo ganho no MVP |
| Alias de entidade (`p[Pessoa]`) | Cria dois nomes para a mesma entidade e complica a navegação |
| Cardinalidade em texto (`one or zero`, `zero or more`) | Duplica a sintaxe de símbolos; os símbolos já cobrem todos os casos |
| Ligação em texto (`to`, `optionally to`) | Mesmo motivo acima |
| Tipos com parênteses ou colchetes (`varchar(10)`, `string[]`) | Complica o tokenizador; o tamanho do tipo não muda a navegação |
| Acentos e `ç` em identificadores | Simplifica o tokenizador; acentos continuam permitidos em rótulos e comentários entre aspas |
| Comentário no meio ou no fim da linha | Exige tokenizador mais sofisticado |
| Rótulo vazio (`""`) | Um relacionamento sem rótulo não tem o que ser narrado |
| Configuração e estilo (`---` frontmatter, `direction`, `style`, `classDef`, `class`) | São recursos visuais, e o foco do projeto é a navegação semântica |
| Outros tipos de diagrama (classes, sequência, casos de uso, estado) | Previstos para versões futuras |
| Mais de um diagrama por entrada | Fora do escopo; um diagrama por vez |

Qualquer uma dessas construções deve gerar **erro**, não ser ignorada em silêncio.

## 9. Erros que o parser deve reportar (RF09)

Toda mensagem informa **a linha** e **o motivo**, em texto claro (será anunciada por leitor de tela e síntese de voz).

**Coluna (#29):** a mensagem não fala a coluna ("Linha 3, coluna 18" é difícil de usar sem enxergar e as linhas do erDiagram são curtas). Quando dá para saber qual trecho causou o erro (E05 chave desconhecida, E06 operador inválido, E11 aspas abertas, E12 chave repetida), o erro traz `column` e `length`, e o editor seleciona exatamente esse trecho ao ativar o erro. O leitor de tela lê o trecho selecionado. Nos demais erros, o editor seleciona a linha inteira.

| Código | Situação | Mensagem sugerida |
|---|---|---|
| E01 | Falta o cabeçalho `erDiagram` na primeira linha útil | "Linha 1: a primeira linha útil do diagrama deve ser erDiagram." |
| E02 | Linha não reconhecida | "Linha 5: instrução não reconhecida." |
| E03 | Bloco de entidade sem `}`. Aponta a linha onde o bloco abriu. Se outra entidade (`NOME {`) ou um relacionamento aparece antes do `}`, diz antes de qual linha ele falta, e a linha seguinte é lida normalmente (sem E04/E09 em cascata) | "Linha 2: o bloco da entidade CLIENTE não foi fechado: falta \"}\" antes da linha 5." |
| E04 | Atributo sem tipo ou sem nome | "Linha 6: o atributo precisa de tipo e nome." |
| E05 | Chave desconhecida (ex.: `XK`) | "Linha 6: chave 'XK' desconhecida. Use PK, FK ou UK." |
| E06 | Símbolo de cardinalidade inválido | "Linha 3: símbolo de cardinalidade inválido." |
| E07 | Relacionamento sem rótulo | "Linha 3: o relacionamento precisa de um rótulo depois de ':'." |
| E08 | Entidade com dois blocos | "Linha 12: a entidade CLIENTE já foi definida na linha 4." |
| E09 | Atributo repetido na entidade | "Linha 7: o atributo 'id' já existe na entidade CLIENTE." |
| E10 | Bloco de entidade vazio | "Linha 4: a entidade CLIENTE não tem atributos." |
| E11 | Aspas não fechadas | "Linha 9: aspas não fechadas." |
| E12 | Chave repetida no atributo | "Linha 6: a chave PK está repetida." |
| E13 | Recurso fora do MVP | "Linha 2: este recurso ainda não é suportado." |
| E14 | Texto entre aspas vazio | "Linha 3: o texto entre aspas não pode ser vazio." |

### 9.1 Avisos (não bloqueiam a árvore)

Avisos apontam algo provavelmente esquecido, mas válido no Mermaid. O diagrama é interpretado normalmente, e os avisos aparecem numa lista separada, com estilo neutro, e no anúncio da interpretação.

| Código | Situação | Mensagem sugerida |
|---|---|---|
| W01 | Entidade com chave estrangeira (`FK`) que não participa de nenhum relacionamento | "Linha 8: a entidade ITEM tem chave estrangeira (pedido_id), mas não participa de nenhum relacionamento." |

**Por que só isso (#30):** no `erDiagram`, `FK` é só uma marcação; o código não diz para qual entidade a chave aponta. Por isso não dá para validar o destino da FK, e tratar como erro bloquearia diagramas que o Mermaid aceita. Uma FK numa entidade sem relacionamentos, porém, quase sempre é um relacionamento esquecido.

## 10. Resultado do parser e posições de origem

O parser é independente da interface e deve devolver um resultado explícito:

- `diagram`: o modelo do diagrama, presente somente se não houver erros;
- `errors`: lista de `ParseError`, possivelmente com mais de um erro;
- cada `ParseError`: código, mensagem e linha de origem (numeração iniciada em 1).

O parser deve continuar a analisar linhas independentes depois de um erro, quando isso for seguro, para comunicar mais de um problema de uma vez. A interface não deve construir a árvore semântica nem o SVG a partir de `diagram` enquanto houver erros.

Cada elemento válido guarda posições de origem:

- entidade: `firstMentionLine` (primeira declaração ou referência) e `declarationLine` (linha do bloco, se houver);
- atributo e relacionamento: `line`;
- diagrama: linha do cabeçalho.

Essas posições servem para mensagens de validação e para uma futura sincronização entre editor, árvore e SVG.

## 11. Gramática formal (referência rápida)

```
diagrama        = { ignorada } , cabecalho , { linha } ;
cabecalho       = "erDiagram" ;
linha           = comentario | relacionamento | bloco | entidade-isolada | vazia ;
ignorada        = comentario | vazia ;
vazia           = { espaco } ;

comentario      = "%%" , texto ;

relacionamento  = entidade , operador , entidade , ":" , rotulo ;
operador        = lado_esq , ligacao , lado_dir ;
lado_esq        = "||" | "|o" | "}o" | "}|" ;
lado_dir        = "||" | "o|" | "o{" | "|{" ;
ligacao         = "--" | ".." ;
rotulo          = rotulo-simples | texto-citado ;
rotulo-simples  = (letra | "_") , { letra | digito | "_" | "-" } ;
texto-citado    = '"' , texto-nao-vazio-sem-aspas , '"' ;

entidade-isolada = entidade ;
bloco           = entidade , "{" , atributo , { atributo } , "}" ;
atributo        = tipo , nome , [ chaves ] , [ texto-citado ] ;
chaves          = chave , { "," , chave } ;
chave           = "PK" | "FK" | "UK" ;

entidade        = (letra | "_") , { letra | digito | "_" | "-" } ;
tipo            = letra , { letra | digito | "_" } ;
nome            = (letra | "_") , { letra | digito | "_" } ;
```

Nesta notação, os separadores entre itens aceitam um ou mais espaços ou tabs, as bordas das linhas são ignoradas e espaços junto à vírgula das chaves são opcionais. `texto` não contém quebra de linha nem aspas duplas; em `texto-citado`, ele também não pode ser vazio.

## 12. Ponte para o modelo de dados (#4)

| Conceito da gramática | O que o modelo precisa guardar |
|---|---|
| Diagrama | Lista de entidades e lista de relacionamentos |
| Entidade | Nome; atributos (lista, possivelmente vazia); primeira menção; linha do bloco, se houver |
| Atributo | Tipo; nome; chaves (PK, FK, UK); comentário opcional; linha de origem |
| Relacionamento | Entidade da esquerda e da direita; cardinalidade de cada lado; identificador (sim ou não); rótulo; linha de origem |
| Cardinalidade | Um dos quatro valores: exatamente um, zero ou um, zero ou muitos, um ou muitos |

A **linha de origem** serve para a validação (RF09) e para o foco entre o texto e a árvore.
