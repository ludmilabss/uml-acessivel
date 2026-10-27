import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSemanticTree, parseErDiagram } from './core';
import { describeParseResult } from './ui/announcements';
import { DiagramEditor } from './ui/DiagramEditor';
import { DiagramPreview } from './ui/DiagramPreview';
import { ErrorList } from './ui/ErrorList';
import { exampleDiagram } from './ui/exampleDiagram';
import { SemanticTree } from './ui/SemanticTree';
import { lineRange } from './ui/textPosition';
import { loadTheme, saveTheme, themeNames, type Theme } from './ui/theme';

const EDITOR_ID = 'codigo-diagrama';
const EDITOR_HINT_ID = 'codigo-diagrama-dica';
const ERRORS_ID = 'codigo-diagrama-erros';

function App() {
  const [source, setSource] = useState(exampleDiagram);
  const [result, setResult] = useState(() => parseErDiagram(exampleDiagram));
  // Muda a cada interpretação: recria a árvore (foco e expansão do zero) e força um novo anúncio.
  const [version, setVersion] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [focusedDescription, setFocusedDescription] = useState<string>();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

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
    setFocusedDescription(undefined);
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
    <div className="flex min-h-screen flex-col bg-app text-fg lg:h-screen">
      <header className="flex items-center gap-4 border-b-2 border-line bg-raised px-6 py-3">
        <Logo />
        <div>
          <h1 className="text-2xl font-bold">UML Acessível</h1>
          <p className="text-muted">
            Atalhos: Ctrl+Enter interpretar · Tab chega à árvore · Enter segue relacionamento
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b-2 border-line bg-surface px-6 py-2">
        <label className="flex items-center gap-2 font-semibold">
          Tema
          {/* A seta nativa fica colada na borda e não dá para afastar; usamos uma própria, na cor do tema. */}
          <span className="relative inline-flex items-center">
            <select
              value={theme}
              className="focus-ring appearance-none rounded-sm border-2 border-muted bg-raised py-1 pr-10 pl-3 text-fg"
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              {(Object.keys(themeNames) as Theme[]).map((option) => (
                <option key={option} value={option}>
                  {themeNames[option]}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 12 8"
              className="pointer-events-none absolute right-3 h-2 w-3 text-fg"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m1 1.5 5 5 5-5" />
            </svg>
          </span>
        </label>
      </div>

      <main className="grid flex-1 grid-cols-1 bg-surface lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          number={1}
          titleId="titulo-codigo"
          title="Código do diagrama"
          className="lg:row-span-2 lg:border-r-2"
        >
          <DiagramEditor
            id={EDITOR_ID}
            value={source}
            hasErrors={hasErrors}
            labelledBy="titulo-codigo"
            describedBy={hasErrors ? `${EDITOR_HINT_ID} ${ERRORS_ID}` : EDITOR_HINT_ID}
            textareaRef={textareaRef}
            onChange={setSource}
            onSubmit={interpret}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="focus-ring rounded-sm border-2 border-accent bg-accent px-4 py-1.5 font-semibold text-accent-fg"
              onClick={interpret}
            >
              Interpretar diagrama
            </button>
            <p id={EDITOR_HINT_ID} className="text-muted">
              ou Ctrl + Enter (Cmd + Enter no Mac) no campo
            </p>
          </div>
          <ErrorList id={ERRORS_ID} errors={result.errors} onSelectLine={selectLine} />
        </Panel>

        <Panel
          number={2}
          titleId="titulo-arvore"
          title="Árvore semântica"
          className="lg:border-b-2"
        >
          <details className="text-muted">
            <summary className="focus-ring cursor-pointer rounded-sm font-semibold">
              Como navegar pelo teclado
            </summary>
            <ul className="mt-1 list-disc pl-5">
              <li>Seta para cima e para baixo: item anterior e próximo</li>
              <li>Seta para a direita: abre o grupo ou entra no primeiro item</li>
              <li>Seta para a esquerda: fecha o grupo ou volta para o item pai</li>
              <li>Home e End: primeiro e último item</li>
              <li>Enter em um relacionamento (↳): vai até a outra entidade</li>
            </ul>
          </details>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
            {tree ? (
              <SemanticTree
                key={version}
                tree={tree}
                labelledBy="titulo-arvore"
                onFocusChange={setFocusedDescription}
              />
            ) : (
              <p className="text-muted">Corrija os erros de sintaxe para ver a árvore.</p>
            )}
          </div>
        </Panel>

        <Panel number={3} titleId="titulo-visualizacao" title="Visualização (SVG)">
          <DiagramPreview />
        </Panel>
      </main>

      <footer className="border-t-2 border-line bg-surface px-6 py-2">
        {/* Região sempre presente no DOM: o leitor de tela só anuncia mudanças em regiões que já existiam. */}
        <p role="status" aria-live="polite" className="font-semibold">
          <span key={version}>{announcement}</span>
        </p>
        {/* Para quem enxerga: repete a narração do item focado. Não é aria-live, pois o leitor já lê o foco. */}
        <p className="text-muted">
          {focusedDescription
            ? `Foco: ${focusedDescription}`
            : !announcement && 'Interprete o código ou navegue pela árvore.'}
        </p>
      </footer>
    </div>
  );
}

interface PanelProps {
  readonly number: number;
  readonly titleId: string;
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
}

function Panel({ number, titleId, title, className = '', children }: PanelProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col gap-3 border-line p-4 lg:min-h-0 ${className}`}
    >
      <h2 id={titleId} className="text-lg font-bold">
        <span aria-hidden="true">Painel {number} · </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 44 32"
      className="h-10 w-12 shrink-0 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <circle cx="9" cy="7" r="5" />
      <circle cx="9" cy="25" r="5" />
      <circle cx="36" cy="16" r="5" fill="currentColor" />
      <path d="M14 9 31 15M14 23l17-6" />
    </svg>
  );
}

export default App;
