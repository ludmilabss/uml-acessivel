/**
 * Benchmark no navegador (#25). Abra com `npm run dev` em /bench.html.
 * Mede, para os mesmos diagramas do teste de desempenho:
 * - interpretar: parser + árvore semântica (o que o teste do Node mede, agora no navegador);
 * - mostrar: o React desenhar a árvore e o SVG na tela.
 */
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { buildSemanticTree, parseErDiagram } from '../core';
import { generateDiagram, performanceScenarios } from '../core/performanceFixtures';
import { DiagramPreview } from '../ui/DiagramPreview';
import { SemanticTree } from '../ui/SemanticTree';

const RUNS = 20;

interface Stats {
  readonly first: number;
  readonly median: number;
  readonly max: number;
}

function stats(durations: number[]): Stats {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    first: durations[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted[sorted.length - 1],
  };
}

function measure() {
  const stage = document.getElementById('palco')!;
  return performanceScenarios.map((scenario) => {
    const source = generateDiagram(scenario);
    const interpret: number[] = [];
    const render: number[] = [];

    for (let run = 0; run < RUNS; run += 1) {
      const start = performance.now();
      const diagram = parseErDiagram(source).diagram!;
      const tree = buildSemanticTree(diagram);
      interpret.push(performance.now() - start);

      const root = createRoot(stage);
      const renderStart = performance.now();
      flushSync(() =>
        root.render(
          <>
            <h2 id="titulo">Árvore</h2>
            <SemanticTree tree={tree} labelledBy="titulo" />
            <DiagramPreview diagram={diagram} />
          </>,
        ),
      );
      render.push(performance.now() - renderStart);
      root.unmount();
    }

    return {
      cenario: scenario.name,
      entidades: scenario.entityCount,
      linhas: source.split('\n').length,
      interpretar: stats(interpret),
      mostrar: stats(render),
    };
  });
}

const results = measure();
document.getElementById('resultado')!.textContent = JSON.stringify(
  { navegador: navigator.userAgent, execucoes: RUNS, resultados: results },
  null,
  2,
);
document.getElementById('estado')!.textContent = 'Medição concluída.';
console.log(`BENCH ${JSON.stringify(results)}`);
