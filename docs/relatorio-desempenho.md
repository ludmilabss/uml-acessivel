# Relatório de desempenho do parser e da árvore semântica

> Entrega 3 · Requisito **RNF02**: interpretar o diagrama em menos de **500 ms**.

**Resultado:** meta atendida com folga. No pior caso medido (500 entidades, cerca de 7.500 linhas), o tempo máximo foi de **21,5 ms**, cerca de 4% do limite.

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

## Limitações

- As medições foram feitas no Node.js, não no navegador. Os motores são parecidos (o Chrome e o Node usam o V8), mas os números no navegador podem variar. Na Entrega 4, com a interface pronta, vale medir também o tempo até a árvore aparecer na tela.
- Os diagramas são sintéticos. Diagramas com muitos erros de sintaxe não foram medidos, porque o parser segue para a próxima linha a cada erro e o custo deve ser parecido.
