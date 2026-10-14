import { describe, expect, it } from 'vitest';
import { buildSemanticTree, parseErDiagram } from './index';
import { generateDiagram, performanceScenarios } from './performanceFixtures';

/** Meta do cronograma (Entrega 3, RNF02): interpretar o diagrama em menos de 500 ms. */
const TIME_LIMIT_MS = 500;
const RUNS = 20;

/**
 * Para ver os tempos medidos (usados em docs/relatorio-desempenho.md):
 * npx vitest run src/core/performance.test.ts --silent=false
 */
describe('desempenho', () => {
  for (const scenario of performanceScenarios) {
    it(`interpreta e monta a árvore do diagrama ${scenario.name} em menos de ${TIME_LIMIT_MS} ms`, () => {
      const source = generateDiagram(scenario);
      const durations: number[] = [];

      for (let run = 0; run < RUNS; run += 1) {
        const start = performance.now();
        const result = parseErDiagram(source);
        const tree = result.diagram ? buildSemanticTree(result.diagram) : undefined;
        durations.push(performance.now() - start);

        expect(result.errors).toEqual([]);
        expect(result.diagram?.entities).toHaveLength(scenario.entityCount);
        expect(tree).toBeDefined();
      }

      const sorted = [...durations].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const max = sorted[sorted.length - 1];
      const lineCount = source.split('\n').length;
      console.info(
        `[desempenho] ${scenario.name}: ${scenario.entityCount} entidades, ${lineCount} linhas; ` +
          `primeira execução ${durations[0].toFixed(2)} ms, mediana ${median.toFixed(2)} ms, ` +
          `máximo ${max.toFixed(2)} ms (${RUNS} execuções)`,
      );

      expect(max).toBeLessThan(TIME_LIMIT_MS);
    });
  }
});
