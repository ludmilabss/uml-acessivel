import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSemanticTree, parseErDiagram, type SemanticReference } from './core';
import { describeParseResult } from './ui/announcements';
import { DiagramEditor } from './ui/DiagramEditor';
import { DiagramPreview } from './ui/DiagramPreview';
import { ErrorList } from './ui/ErrorList';
import { exampleDiagram } from './ui/exampleDiagram';
import { SemanticTree, type TreeFocus } from './ui/SemanticTree';
import { ShortcutsDialog } from './ui/ShortcutsDialog';
import { ToggleButton } from './ui/ToggleButton';
import { lineRange } from './ui/textPosition';
import {
  loadEnlargePreview,
  loadShowPreview,
  loadTheme,
  saveEnlargePreview,
  saveShowPreview,
  saveTheme,
  themeNames,
  type Theme,
} from './ui/preferences';

const EDITOR_ID = 'codigo-diagrama';
const EDITOR_HINT_ID = 'codigo-diagrama-dica';
const ERRORS_ID = 'codigo-diagrama-erros';
const TREE_HINT_ID = 'arvore-instrucoes';

function App() {
  const [source, setSource] = useState(exampleDiagram);
  const [result, setResult] = useState(() => parseErDiagram(exampleDiagram));
  // Muda a cada interpretação: recria a árvore, com foco e expansão do zero.
  const [version, setVersion] = useState(0);
  // O id muda a cada anúncio, para o leitor de tela repetir mesmo um texto igual ao anterior.
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const [treeFocus, setTreeFocus] = useState<TreeFocus>();
  // Continua destacado no desenho depois que o foco sai da árvore (ex.: para rolar o diagrama).
  const [highlight, setHighlight] = useState<SemanticReference>();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [showPreview, setShowPreview] = useState(loadShowPreview);
  const [enlargePreview, setEnlargePreview] = useState(loadEnlargePreview);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveShowPreview(showPreview);
  }, [showPreview]);

  useEffect(() => {
    saveEnlargePreview(enlargePreview);
  }, [enlargePreview]);

  const tree = useMemo(
    () => (result.diagram ? buildSemanticTree(result.diagram) : undefined),
    [result],
  );
  const hasErrors = result.errors.length > 0;

  function announce(text: string) {
    setAnnouncement((current) => ({ id: current.id + 1, text }));
  }

  function togglePreview() {
    const next = !showPreview;
    setShowPreview(next);
    if (!next) {
      setEnlargePreview(false);
    }
    announce(
      next
        ? 'Visualização visível, abaixo da árvore.'
        : 'Visualização oculta. A árvore ocupa a coluna inteira.',
    );
  }

  function toggleEnlargePreview() {
    const next = !enlargePreview;
    setEnlargePreview(next);
    if (next) {
      setShowPreview(true);
    }
    announce(
      next
        ? 'Desenho ampliado. O código fica oculto e a árvore fica à esquerda.'
        : 'Desenho no tamanho normal. O código voltou a aparecer.',
    );
  }

  function interpret() {
    const next = parseErDiagram(source);
    setResult(next);
    setVersion((current) => current + 1);
    announce(describeParseResult(next));
    setTreeFocus(undefined);
    setHighlight(undefined);
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
          {/* Seta própria: a nativa fica colada na borda e não pode ser afastada. */}
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
        <ToggleButton pressed={showPreview} onClick={togglePreview}>
          Mostrar visualização
        </ToggleButton>
        <ShortcutsDialog />
      </div>

      <main
        className={`grid flex-1 grid-cols-1 bg-surface lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] ${
          showPreview && !enlargePreview
            ? 'lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]'
            : 'lg:grid-rows-[minmax(0,1fr)]'
        }`}
      >
        {!enlargePreview && (
          <Panel
            number={1}
            titleId="titulo-codigo"
            title="Código do diagrama"
            className={`lg:border-r-2 ${showPreview ? 'lg:row-span-2' : ''}`}
          >
            <DiagramEditor
              id={EDITOR_ID}
              value={source}
              hasErrors={hasErrors}
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
        )}

        <Panel
          number={2}
          titleId="titulo-arvore"
          title="Árvore semântica"
          className={enlargePreview ? 'lg:border-r-2' : showPreview ? 'lg:border-b-2' : ''}
        >
          {/* Lida pelo leitor de tela ao chegar na árvore (aria-describedby), onde a ajuda é útil. */}
          <p id={TREE_HINT_ID} className="sr-only">
            Use as setas para navegar. Seta para a direita abre um grupo. Enter em um relacionamento
            leva à outra entidade.
          </p>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto">
            {tree ? (
              <SemanticTree
                key={version}
                tree={tree}
                labelledBy="titulo-arvore"
                describedBy={TREE_HINT_ID}
                onFocusChange={(focus) => {
                  setTreeFocus(focus);
                  if (focus) {
                    setHighlight(focus.reference);
                  }
                }}
              />
            ) : (
              <p className="text-muted">Corrija os erros de sintaxe para ver a árvore.</p>
            )}
          </div>
        </Panel>

        {showPreview && (
          <Panel number={3} titleId="titulo-visualizacao" title="Visualização (SVG)">
            <DiagramPreview
              diagram={result.diagram}
              highlight={highlight}
              enlarged={enlargePreview}
              onToggleEnlarge={toggleEnlargePreview}
              onAnnounce={announce}
            />
          </Panel>
        )}
      </main>

      <footer className="border-t-2 border-line bg-surface px-6 py-2">
        {/* Região sempre presente no DOM: o leitor de tela só anuncia mudanças em regiões que já existiam. */}
        <p role="status" aria-live="polite" className="font-semibold">
          <span key={announcement.id}>{announcement.text}</span>
        </p>
        {/* Para quem enxerga: repete a narração do item focado. Não é aria-live, pois o leitor já lê o foco. */}
        <p className="text-muted">
          {treeFocus
            ? `Foco: ${treeFocus.text}`
            : !announcement.text && 'Interprete o código ou navegue pela árvore.'}
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
