# Gramática do erDiagram suportada no MVP

> Documento de referência para o parser (#5), os tipos do modelo (#4) e os diagramas de teste (#7).
> Base: sintaxe `erDiagram` do Mermaid. O MVP aceita um **subconjunto** dela. O que não está listado aqui é rejeitado com erro claro (ver seção 8).

**Status:** rascunho para revisão · **Requisitos:** RF01, RF02, RF09

---

## 1. Estrutura geral

Um diagrama é um texto com:

1. Uma linha de cabeçalho `erDiagram` (a primeira linha que não for comentário nem estiver em branco)
2. Zero ou mais linhas de **relacionamento**
3. Zero ou mais **blocos de entidade**, em qualquer ordem
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
- Cada instrução ocupa **uma linha**, exceto o bloco de entidade (abre com `{`, fecha com `}`).
- Maiúsculas e minúsculas são diferentes (`Cliente` e `CLIENTE` são entidades distintas), exceto nas palavras reservadas `erDiagram`, `PK`, `FK` e `UK`, que devem ser escritas exatamente assim.

## 2. Comentários

Linha que começa com `%%`. Vale a linha inteira. Comentário no meio ou no fim de uma instrução **não** é suportado.

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

Restrições:

- Um bloco só é válido com **pelo menos um atributo** (bloco vazio `{ }` é erro).
- Uma entidade pode ter **no máximo um bloco** (bloco repetido é erro).

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
| `"comentário"` | Não | Texto entre aspas duplas, no fim da linha |

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
- Uma palavra sem espaços: `faz`, `contem`.
- Com espaços ou acentos: entre aspas duplas, `"aparece em"`, `"possui endereço"`.
- Acentos só são aceitos **dentro de aspas**.

### 6.4 Tipo do relacionamento (derivado)

Para a narração e a árvore semântica, o parser classifica o relacionamento pela cardinalidade **máxima** de cada lado (`||` e `|o` = um; `}o` e `}|` = muitos):

| Esquerdo × Direito | Classificação |
|---|---|
| um × um | 1:1 |
| um × muitos | 1:N |
| muitos × um | N:1 |
| muitos × muitos | N:N |

Exemplo de narração: `CLIENTE ||..o{ PEDIDO : faz` → "Cliente, exatamente um, faz Pedido, zero ou muitos. Relacionamento um para muitos, não identificador."

### 6.5 Regras

- As duas entidades devem ter nomes válidos (seção 3). Se ainda não existirem, são criadas.
- Uma entidade pode se relacionar **consigo mesma** (autorrelacionamento).
- Pode haver **mais de um** relacionamento entre o mesmo par de entidades (rótulos diferentes).

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

| Código | Situação | Mensagem sugerida |
|---|---|---|
| E01 | Falta o cabeçalho `erDiagram` | "Linha 1: o diagrama deve começar com erDiagram." |
| E02 | Linha não reconhecida | "Linha 5: instrução não reconhecida." |
| E03 | Bloco de entidade sem `}` | "Linha 8: o bloco da entidade CLIENTE não foi fechado." |
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

## 10. Gramática formal (referência rápida)

```
diagrama        = cabecalho , { linha } ;
cabecalho       = "erDiagram" ;
linha           = comentario | relacionamento | bloco | vazia ;

comentario      = "%%" , texto ;

relacionamento  = entidade , operador , entidade , ":" , rotulo ;
operador        = lado_esq , ligacao , lado_dir ;
lado_esq        = "||" | "|o" | "}o" | "}|" ;
lado_dir        = "||" | "o|" | "o{" | "|{" ;
ligacao         = "--" | ".." ;
rotulo          = palavra | '"' , texto , '"' ;

bloco           = entidade , "{" , atributo , { atributo } , "}" ;
atributo        = tipo , nome , [ chaves ] , [ '"' , texto , '"' ] ;
chaves          = chave , { "," , chave } ;
chave           = "PK" | "FK" | "UK" ;

entidade        = (letra | "_") , { letra | digito | "_" | "-" } ;
tipo            = letra , { letra | digito | "_" } ;
nome            = (letra | "_") , { letra | digito | "_" } ;
```

## 11. Ponte para o modelo de dados (#4)

| Conceito da gramática | O que o modelo precisa guardar |
|---|---|
| Diagrama | Lista de entidades e lista de relacionamentos |
| Entidade | Nome; atributos (lista, possivelmente vazia); linha de origem |
| Atributo | Tipo; nome; chaves (PK, FK, UK); comentário opcional; linha de origem |
| Relacionamento | Entidade da esquerda e da direita; cardinalidade de cada lado; identificador (sim ou não); rótulo; linha de origem |
| Cardinalidade | Um dos quatro valores: exatamente um, zero ou um, zero ou muitos, um ou muitos |

A **linha de origem** serve para a validação (RF09) e para o foco entre o texto e a árvore.