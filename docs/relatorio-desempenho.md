# Relatório de desempenho do parser e da árvore semântica

> Entrega 3 · Requisito **RNF02**: interpretar o diagrama em menos de **500 ms**.

**Resultado:** meta atendida com folga. No pior caso medido (500 entidades, cerca de 7.500 linhas), o tempo máximo foi de **21,5 ms** no Node e de **16,6 ms** no Chrome. Somando o tempo para o React mostrar a árvore e o desenho na tela, o pior caso no navegador foi de **cerca de 90 ms**, menos de 20% do limite.

## O que foi medido

O tempo de `parseErDiagram` (texto → modelo, com validação) somado ao de `buildSemanticTree` (modelo → árvore navegável, com os textos de narração). É o caminho completo entre colar o código e ter a árvore pronta para a interface. A renderização no React não entra nesta medição.

## Como foi medido

- Teste automatizado: [`src/core/performance.test.ts`](../src/core/performance.test.ts). Ele **falha** se alguma execução passar de 500 ms, então a meta é conferida em todo `npm test` (e no CI, quando o #2 estiver pronto).
- Diagramas gerados por [`src/core/performanceFixtures.ts`](../src/core/performanceFixtures.ts). Cada entidade tem um bloco com `PK`, atributos com comentário entre aspas e `FK`. Há cerca de dois relacionamentos por entidade, um identificador e outro não identificador com rótulo entre aspas.
- Cada cenário roda **20 vezes** seguidas. O relatório traz a primeira execução (sem aquecimento do JavaScript), a mediana e o máximo.
- O teste foi repetido 3 vezes. A tabela mostra a pior das 3 rodadas em cada coluna.

Para reproduzir:

```bash
npx vitest run src/core/performance.test.ts --silent=false
```

## Resultados

Ambiente: MacBook Air (Apple M5), Node.js 26.3.0, Vitest 5.0.3, em 27/10/2026.

| Cenário | Entidades | Linhas | 1ª execução | Mediana | Máximo | Meta |
|---|---|---|---|---|---|---|
| Pequeno | 10 | 98 | 1,09 ms | 0,09 ms | 1,09 ms | ✅ < 500 ms |
| Médio | 100 | 1.498 | 1,58 ms | 1,58 ms | 4,19 ms | ✅ < 500 ms |
| Grande | 500 | 7.498 | 10,98 ms | 9,50 ms | 21,50 ms | ✅ < 500 ms |

## Análise

- O tempo cresce de forma aproximadamente **linear** com o tamanho do diagrama: 10 vezes mais entidades (de 10 para 100) resultam em cerca de 10 vezes mais tempo de mediana (de 0,09 ms para 0,96–1,58 ms).
- Diagramas de uso real no MVP (exercícios de banco de dados, com 5 a 30 entidades) ficam **abaixo de 2 ms**, então a interpretação parece instantânea para quem usa.
- A variação entre rodadas (o máximo do cenário grande foi de 12,98 ms a 21,50 ms) vem do coletor de lixo do JavaScript e de outros processos da máquina, não do parser.
- Máquinas mais lentas que a usada aqui ainda têm uma margem de mais de 20 vezes até a meta.

## No navegador (#25)

Com a interface pronta, a medição foi repetida dentro do navegador, em duas partes:

- **Interpretar:** o mesmo do teste do Node (parser + árvore), agora no motor do navegador.
- **Mostrar:** o tempo para o React desenhar a árvore semântica e o desenho em SVG na tela. É a parte que a pessoa sente ao interpretar o código.

**Como foi medido:** a página [`bench.html`](../bench.html) (código em [`src/bench/main.tsx`](../src/bench/main.tsx)) usa os mesmos diagramas e roda cada cenário 20 vezes. A medição usa o **build de produção** (o React em modo de desenvolvimento é bem mais lento e exageraria os tempos). Foram 4 rodadas; a tabela mostra a pior delas em cada coluna. O Chrome arredonda o relógio para 0,1 ms, por segurança.

Para reproduzir:

```bash
npm run bench:build
npm run bench:preview
# abra http://localhost:4174/bench.html; o resultado aparece na página
```

Ambiente: MacBook Air (Apple M5), Google Chrome 158, em 24/11/2026.

| Cenário | Entidades | Interpretar (1ª / mediana / máx.) | Mostrar (1ª / mediana / máx.) | Pior total | Meta |
|---|---|---|---|---|---|
| Pequeno | 10 | 1,3 / 0,1 / 2,4 ms | 11,6 / 0,9 / 11,6 ms | 14,0 ms | ✅ < 500 ms |
| Médio | 100 | 1,5 / 0,8 / 4,3 ms | 8,7 / 7,4 / 11,2 ms | 15,5 ms | ✅ < 500 ms |
| Grande | 500 | 8,2 / 6,8 / 16,6 ms | 44,0 / 43,6 / 73,6 ms | 90,2 ms | ✅ < 500 ms |

**Análise:**

- Interpretar no Chrome custa o mesmo que no Node (os dois usam o V8), confirmando a medição anterior.
- **Mostrar na tela é a parte mais cara**, e cresce com o tamanho do diagrama: 0,9 ms (mediana) com 10 entidades e cerca de 43 ms com 500, por causa do SVG e dos itens da árvore.
- A primeira execução do cenário pequeno é mais lenta (11,6 ms) porque inclui o aquecimento do React; as seguintes ficam abaixo de 1 ms.
- Mesmo no pior caso (500 entidades), interpretar e mostrar somam cerca de 90 ms, bem abaixo dos 500 ms. Diagramas de exercício (5 a 30 entidades) ficam na casa de poucos milissegundos.

## Limitações

- A medição no navegador foi feita só no Chrome do Mac. Safari e Firefox usam outros motores e podem ter números diferentes; vale repetir a página neles.
- Os diagramas são sintéticos. Diagramas com muitos erros de sintaxe não foram medidos, porque o parser segue para a próxima linha a cada erro e o custo deve ser parecido.
