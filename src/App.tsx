import { useMemo, useRef, useState } from 'react';
import { buildSemanticTree, parseErDiagram } from './core';
import { describeParseResult } from './ui/announcements';
import { DiagramEditor } from './ui/DiagramEditor';
import { DiagramPreview } from './ui/DiagramPreview';
import { ErrorList } from './ui/ErrorList';
import { exampleDiagram } from './ui/exampleDiagram';
import { SemanticTree } from './ui/SemanticTree';
import { lineRange } from './ui/textPosition';

const EDITOR_ID = 'codigo-diagrama';
const EDITOR_HINT_ID = 'codigo-diagrama-dica';
const ERRORS_ID = 'codigo-diagrama-erros';

function App() {
  const [source, setSource] = useState(exampleDiagram);
  const [result, setResult] = useState(() => parseErDiagram(exampleDiagram));
  // Muda a cada interpretação: recria a árvore (foco e expansão do zero) e força um novo anúncio.
  const [version, setVersion] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tree = useMemo(
    () => (result.diagram ? buildSemanticTree(result.diagram) : undefined),
    [result],
  );
  const hasErrors = result.errors.length > 0;

  function interpret() {
    const next = parseErDiagram(source);
    setResult(next);
    setVersion((current) => current + 1);
    setAnnouncement(describeParseResult(next));
  }

  function selectLine(line: number) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const { start, end } = lineRange(source, line);
    textarea.focus();
    textarea.setSelectionRange(start, end);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b-2 border-gray-300 px-6 py-4">
        <h1 className="text-3xl font-bold">UML Acessível</h1>
        <p className="mt-1 text-gray-700">
          Escreva ou cole um diagrama ER na sintaxe erDiagram do Mermaid e navegue por ele pelo
          teclado.
        </p>
      </header>

      <main className="grid gap-6 p-6 lg:grid-cols-3">
        <section aria-labelledby="titulo-codigo" className="flex flex-col gap-4">
          <h2 id="titulo-codigo" className="text-xl font-bold">
            Código
          </h2>
          <DiagramEditor
            id={EDITOR_ID}
            value={source}
            hasErrors={hasErrors}
            describedBy={hasErrors ? `${EDITOR_HINT_ID} ${ERRORS_ID}` : EDITOR_HINT_ID}
            textareaRef={textareaRef}
            onChange={setSource}
            onSubmit={interpret}
          />
          <p id={EDITOR_HINT_ID} className="text-sm text-gray-700">
            Atalho: Ctrl + Enter (ou Cmd + Enter no Mac) interpreta o código sem sair do campo.
          </p>
          {/* Região sempre presente no DOM: o leitor de tela só anuncia mudanças em regiões que já existiam. */}
          <p role="status" aria-live="polite" className="font-medium">
            <span key={version}>{announcement}</span>
          </p>
          <ErrorList id={ERRORS_ID} errors={result.errors} onSelectLine={selectLine} />
        </section>

        <section aria-labelledby="titulo-arvore" className="flex flex-col gap-4">
          <h2 id="titulo-arvore" className="text-xl font-bold">
            Árvore semântica
          </h2>
          <details className="text-sm text-gray-700">
            <summary className="focus-ring cursor-pointer rounded font-medium">
              Como navegar pelo teclado
            </summary>
            <ul className="mt-2 list-disc pl-5">
              <li>Seta para cima e para baixo: item anterior e próximo</li>
              <li>Seta para a direita: abre o grupo ou entra no primeiro item</li>
              <li>Seta para a esquerda: fecha o grupo ou volta para o item pai</li>
              <li>Home e End: primeiro e último item</li>
              <li>Enter em um relacionamento: vai até a outra entidade</li>
            </ul>
          </details>
          {tree ? (
            <SemanticTree key={version} tree={tree} labelledBy="titulo-arvore" />
          ) : (
            <p className="text-gray-700">Corrija os erros de sintaxe para ver a árvore.</p>
          )}
        </section>

        <section aria-labelledby="titulo-visualizacao" className="flex flex-col gap-4">
          <h2 id="titulo-visualizacao" className="text-xl font-bold">
            Visualização
          </h2>
          <DiagramPreview />
        </section>
      </main>
    </div>
  );
}

export default App;
