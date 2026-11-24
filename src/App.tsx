import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildSemanticTree, parseErDiagram, type SemanticReference } from './core';
import { describeParseResult } from './ui/announcements';
import { DiagramEditor } from './ui/DiagramEditor';
import { DIAGRAM_AREA_ID, DiagramPreview } from './ui/DiagramPreview';
import { ErrorList } from './ui/ErrorList';
import { exampleDiagram } from './ui/exampleDiagram';
import { SemanticTree, type TreeFocus } from './ui/SemanticTree';
import type { TreeMemory } from './ui/treeNavigation';
import { ShortcutsDialog } from './ui/ShortcutsDialog';
import { LabeledSelect } from './ui/LabeledSelect';
import { SPEECH_RATES, isSpeaking, isSpeechSupported, speak, stopSpeaking } from './ui/speech';
import { ToggleButton } from './ui/ToggleButton';
import { lineRange } from './ui/textPosition';
import { forSpeech } from './ui/pronunciation';
import {
  loadEnlargePreview,
  loadVoiceEnabled,
  loadVoiceRate,
  loadShowPreview,
  loadTheme,
  saveEnlargePreview,
  saveVoiceEnabled,
  saveVoiceRate,
  saveShowPreview,
  saveTheme,
  themeNames,
  type Theme,
} from './ui/preferences';

const EDITOR_ID = 'codigo-diagrama';

type PanelTarget = 'codigo' | 'arvore' | 'desenho';
const PANEL_SHORTCUTS: Readonly<Record<string, PanelTarget>> = {
  Digit1: 'codigo',
  Digit2: 'arvore',
  Digit3: 'desenho',
};
const EDITOR_HINT_ID = 'codigo-diagrama-dica';
const ERRORS_ID = 'codigo-diagrama-erros';
const TREE_HINT_ID = 'arvore-instrucoes';

function App() {
  const [source, setSource] = useState(exampleDiagram);
  const [result, setResult] = useState(() => parseErDiagram(exampleDiagram));
  // Muda a cada interpretação: recria a árvore, que recupera grupos abertos e item atual da memória.
  const [version, setVersion] = useState(0);
  // Estado da árvore entre interpretações (inclusive depois de uma com erro, sem árvore).
  const [treeMemory, setTreeMemory] = useState<TreeMemory>();
  // O id muda a cada anúncio, para o leitor de tela repetir mesmo um texto igual ao anterior.
  // urgent: vai para a região assertive, que interrompe o que o leitor de tela está falando.
  const [announcement, setAnnouncement] = useState({ id: 0, text: '', urgent: false });
  const [treeFocus, setTreeFocus] = useState<TreeFocus>();
  // Continua destacado no desenho depois que o foco sai da árvore (ex.: para rolar o diagrama).
  const [highlight, setHighlight] = useState<SemanticReference>();
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [showPreview, setShowPreview] = useState(loadShowPreview);
  const [enlargePreview, setEnlargePreview] = useState(loadEnlargePreview);
  const speechSupported = isSpeechSupported();
  const [voiceEnabled, setVoiceEnabled] = useState(() => speechSupported && loadVoiceEnabled());
  const [voiceRate, setVoiceRate] = useState(() => loadVoiceRate(SPEECH_RATES));
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

  useEffect(() => {
    saveVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  useEffect(() => {
    saveVoiceRate(voiceRate);
  }, [voiceRate]);

  // Esc cala a voz em qualquer lugar da página (sem impedir o Esc de fechar o diálogo).
  useEffect(() => {
    if (!voiceEnabled) {
      return;
    }
    const stopOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSpeaking()) {
        stopSpeaking();
      }
    };
    document.addEventListener('keydown', stopOnEscape);
    return () => document.removeEventListener('keydown', stopOnEscape);
  }, [voiceEnabled]);

  /** Mostra na barra de status, avisa o leitor de tela (aria-live) e, com a voz ligada, fala. */
  function announce(text: string, urgent = false) {
    setAnnouncement((current) => ({ id: current.id + 1, text, urgent }));
    if (voiceEnabled) {
      speak(text, voiceRate);
    }
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    const text = next ? 'Voz ligada.' : 'Voz desligada.';
    setAnnouncement((current) => ({ id: current.id + 1, text, urgent: false }));
    if (next) {
      speak(text, voiceRate);
    } else {
      stopSpeaking();
    }
  }

  function changeVoiceRate(rate: number) {
    setVoiceRate(rate);
    // Fala já na nova velocidade, para a pessoa ouvir a diferença.
    speak(`Velocidade ${rateLabel(rate)}.`, rate);
  }

  // Painel que estava oculto no momento do atalho: recebe o foco logo depois de aparecer.
  const pendingFocus = useRef<PanelTarget>(undefined);
  // Linha do código a selecionar quando o código, oculto pelo "Ampliar desenho", aparecer.
  const pendingLine = useRef<number>(undefined);

  useEffect(() => {
    if (pendingLine.current !== undefined) {
      selectLine(pendingLine.current);
      pendingLine.current = undefined;
    }
    if (pendingFocus.current) {
      focusPanel(pendingFocus.current);
      pendingFocus.current = undefined;
    }
  });

  /**
   * Alt + Shift + 1, 2 ou 3 (Option no Mac) leva o foco ao painel de mesmo número, de qualquer
   * lugar. Usa a tecla física (event.code): no Mac, Option + Shift + número gera um símbolo.
   */
  useEffect(() => {
    const goToPanel = (event: KeyboardEvent) => {
      const target = PANEL_SHORTCUTS[event.code];
      if (!target || !event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      event.preventDefault();
      if (target === 'codigo' && enlargePreview) {
        pendingFocus.current = target;
        setEnlargePreview(false);
      } else if (target === 'desenho' && !showPreview) {
        pendingFocus.current = target;
        setShowPreview(true);
      } else {
        focusPanel(target);
      }
    };
    document.addEventListener('keydown', goToPanel);
    return () => document.removeEventListener('keydown', goToPanel);
    // Sem lista de dependências: reinscreve a cada renderização, para usar sempre o estado atual.
  });

  function focusPanel(target: PanelTarget) {
    if (target === 'codigo') {
      textareaRef.current?.focus();
      return;
    }
    if (target === 'desenho') {
      const area = document.getElementById(DIAGRAM_AREA_ID);
      if (area) {
        area.focus();
      } else {
        announce('Não há desenho: corrija os erros de sintaxe no código.');
      }
      return;
    }
    const currentItem = document.querySelector<HTMLElement>(
      '[role="tree"] [role="treeitem"][tabindex="0"]',
    );
    if (currentItem) {
      currentItem.focus();
      return;
    }
    // Sem árvore (código com erros): leva à lista de erros, onde dá para corrigir.
    document.querySelector<HTMLElement>(`#${ERRORS_ID} button`)?.focus();
    announce('Não há árvore: corrija os erros de sintaxe. O foco está na lista de erros.');
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

  /** Da árvore para o código: seleciona a linha de origem do item e anuncia qual é. */
  function goToCode(line: number | undefined) {
    if (line === undefined) {
      announce('Este item não tem uma linha no código.');
      return;
    }
    const lineText = source.split('\n')[line - 1]?.trim() ?? '';
    if (enlargePreview) {
      pendingLine.current = line;
      setEnlargePreview(false);
    } else {
      selectLine(line);
    }
    // Ao receber o foco, o VoiceOver lê o campo de código inteiro. O anúncio urgente, logo
    // depois, interrompe essa leitura e diz só a linha de destino.
    window.setTimeout(
      () => announce(forSpeech(`Linha ${line} do código: ${lineText}.`), true),
      300,
    );
  }

  function selectLine(line: number) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const { start, end } = lineRange(source, line);
    // Seleciona antes de focar: no instante do foco a linha já está selecionada, e o VoiceOver
    // lê a seleção em vez do código inteiro. Repete depois, caso o navegador mova o cursor.
    textarea.setSelectionRange(start, end);
    textarea.focus();
    textarea.setSelectionRange(start, end);
  }

  return (
    <div className="flex min-h-screen flex-col bg-app text-fg lg:h-screen">
      {/* Primeira parada do Tab: some até receber foco (WCAG 2.4.1). */}
      <a
        href="#titulo-arvore"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-sm focus:border-2 focus:border-accent focus:bg-raised focus:px-3 focus:py-1 focus:font-semibold focus:text-fg focus-ring"
        onClick={(event) => {
          event.preventDefault();
          focusPanel('arvore');
        }}
      >
        Ir para a árvore
      </a>
      <header className="flex items-center gap-4 border-b-2 border-line bg-raised px-6 py-3">
        <Logo />
        <div>
          <h1 className="text-2xl font-bold">UML Acessível</h1>
          <p className="text-muted">
            Atalhos: Alt+Shift+1, 2 e 3 vão aos painéis · Ctrl+Enter interpreta · Enter segue
            relacionamento
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b-2 border-line bg-surface px-6 py-2">
        <LabeledSelect
          label="Tema"
          value={theme}
          options={(Object.keys(themeNames) as Theme[]).map((option) => ({
            value: option,
            label: themeNames[option],
          }))}
          onChange={setTheme}
        />
        <ToggleButton pressed={showPreview} onClick={togglePreview}>
          Mostrar visualização
        </ToggleButton>
        {speechSupported ? (
          <>
            <ToggleButton pressed={voiceEnabled} onClick={toggleVoice}>
              Voz
            </ToggleButton>
            {voiceEnabled && (
              <LabeledSelect
                label="Velocidade"
                value={String(voiceRate)}
                options={SPEECH_RATES.map((rate) => ({
                  value: String(rate),
                  label: rateLabel(rate),
                }))}
                onChange={(value) => changeVoiceRate(Number(value))}
              />
            )}
          </>
        ) : (
          <span className="text-muted">Voz indisponível neste navegador</span>
        )}
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
                memory={treeMemory}
                onMemoryChange={setTreeMemory}
                tree={tree}
                labelledBy="titulo-arvore"
                describedBy={TREE_HINT_ID}
                onGoToCode={goToCode}
                onFocusChange={(focus) => {
                  setTreeFocus(focus);
                  if (focus) {
                    setHighlight(focus.reference);
                    if (voiceEnabled) {
                      speak(focus.text, voiceRate);
                    }
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
        {/* Texto visível; o leitor de tela recebe o mesmo texto pelas regiões abaixo. */}
        <p aria-hidden="true" className="font-semibold">
          {announcement.text}
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          <span key={announcement.id}>{announcement.urgent ? '' : announcement.text}</span>
        </p>
        <p role="alert" className="sr-only">
          <span key={announcement.id}>{announcement.urgent ? announcement.text : ''}</span>
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

/** Ex.: 1.25 → "1,25". Sem "x", que a voz leria como "xis". */
function rateLabel(rate: number): string {
  const number = rate.toLocaleString('pt-BR');
  if (rate === 1) {
    return `${number} (normal)`;
  }
  if (rate === SPEECH_RATES[0]) {
    return `${number} (mais lenta)`;
  }
  if (rate === SPEECH_RATES[SPEECH_RATES.length - 1]) {
    return `${number} (mais rápida)`;
  }
  return number;
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
