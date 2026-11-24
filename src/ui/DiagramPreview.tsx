import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { describeDiagram, type Cardinality, type Diagram, type SemanticReference } from '../core';
import {
  FONT_SIZE,
  HEADER_HEIGHT,
  layoutDiagram,
  type Box,
  type DiagramLayout,
  type RelationshipEnd,
} from './diagramLayout';
import { ToggleButton } from './ToggleButton';

interface DiagramPreviewProps {
  readonly diagram?: Diagram;
  /** Elemento focado na árvore, destacado no desenho. */
  readonly highlight?: SemanticReference;
  /** Se o desenho está ampliado (código oculto, desenho em 2/3 da tela). */
  readonly enlarged?: boolean;
  readonly onToggleEnlarge?: () => void;
  /** Texto para a região aria-live (ex.: o novo nível de zoom). */
  readonly onAnnounce?: (text: string) => void;
}

/** Níveis de zoom; "fit" desenha o diagrama inteiro dentro da área. */
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
type Zoom = 'fit' | number;

function percent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

/**
 * Desenho do diagrama, para quem enxerga. A versão para leitor de tela é a árvore:
 * o SVG tem só um nome curto que aponta para ela.
 */
export function DiagramPreview({
  diagram,
  highlight,
  enlarged = false,
  onToggleEnlarge,
  onAnnounce,
}: DiagramPreviewProps) {
  const layout = useMemo(() => (diagram ? layoutDiagram(diagram) : undefined), [diagram]);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const container = containerRef.current;
    const target = layout && highlight ? highlightedBox(layout, highlight) : undefined;
    // Ajustado à área, o diagrama inteiro já está visível: não há o que rolar.
    if (container && target && zoom !== 'fit') {
      scrollIntoContainer(container, scaleBox(target, zoom));
    }
  }, [layout, highlight, zoom]);

  /** Escala em que o diagrama cabe na área; serve de ponto de partida ao sair do "ajustar". */
  function fitScale(): number {
    const container = containerRef.current;
    if (!container || !layout || container.clientWidth === 0 || container.clientHeight === 0) {
      return 1;
    }
    return Math.min(container.clientWidth / layout.width, container.clientHeight / layout.height);
  }

  function changeZoom(direction: 1 | -1) {
    const current = zoom === 'fit' ? fitScale() : zoom;
    const next =
      direction > 0
        ? ZOOM_LEVELS.find((level) => level > current + 0.001)
        : [...ZOOM_LEVELS].reverse().find((level) => level < current - 0.001);
    if (next === undefined) {
      const limit = direction > 0 ? ZOOM_LEVELS[ZOOM_LEVELS.length - 1] : ZOOM_LEVELS[0];
      onAnnounce?.(`Zoom ${direction > 0 ? 'máximo' : 'mínimo'}, ${percent(limit)}.`);
      return;
    }
    setZoom(next);
    onAnnounce?.(`Zoom ${percent(next)}.`);
  }

  function fitToArea() {
    setZoom('fit');
    onAnnounce?.('Diagrama ajustado à área.');
  }

  function handleAreaKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === '+' || event.key === '=') {
      changeZoom(1);
    } else if (event.key === '-') {
      changeZoom(-1);
    } else if (event.key === '0') {
      fitToArea();
    } else {
      return;
    }
    event.preventDefault();
  }

  if (!diagram || !layout) {
    return <p className="text-muted">Corrija os erros de sintaxe para ver o diagrama.</p>;
  }

  const zoomButton =
    'focus-ring rounded-sm border-2 border-muted bg-raised px-3 py-0.5 font-semibold text-fg ' +
    'aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-fg';

  return (
    <>
      {/* Grupo com nome: ao chegar pelo Tab, o leitor diz em que painel a pessoa entrou. */}
      <div
        role="group"
        aria-label="Controles da visualização (SVG)"
        className="flex flex-wrap items-center gap-2"
      >
        {/* Primeiro da barra: saindo da árvore, fica a um Tab de distância. */}
        {onToggleEnlarge && (
          <ToggleButton pressed={enlarged} onClick={onToggleEnlarge}>
            Ampliar desenho
          </ToggleButton>
        )}
        <button
          type="button"
          aria-label="Diminuir zoom"
          className={zoomButton}
          onClick={() => changeZoom(-1)}
        >
          −
        </button>
        <button
          type="button"
          aria-pressed={zoom === 'fit'}
          className={zoomButton}
          onClick={fitToArea}
        >
          Ajustar à área
        </button>
        <button
          type="button"
          aria-label="Aumentar zoom"
          className={zoomButton}
          onClick={() => changeZoom(1)}
        >
          +
        </button>
        <span className="text-muted">
          {zoom === 'fit' ? 'Ajustado à área' : `Zoom ${percent(zoom)}`}
        </span>
      </div>
      {/* A área já recebe foco (para rolar); + − 0 mudam o zoom sem ir até os botões. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={containerRef}
        // Área rolável precisa receber foco para quem só usa teclado conseguir rolar (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Área do diagrama"
        aria-keyshortcuts="+ - 0"
        className="focus-ring overflow-auto rounded-sm border-2 border-line bg-raised lg:min-h-0 lg:flex-1"
        onKeyDown={handleAreaKeyDown}
      >
        <svg
          role="img"
          aria-labelledby={titleId}
          // Ajustado: ocupa a área e mantém a proporção (viewBox). Com zoom: tamanho fixo, com rolagem.
          width={zoom === 'fit' ? '100%' : layout.width * zoom}
          height={zoom === 'fit' ? '100%' : layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          fontSize={FONT_SIZE}
          className="block font-mono"
        >
          <title id={titleId}>
            {`Desenho do diagrama. ${describeDiagram(diagram)} Para navegar, use a árvore semântica.`}
          </title>

          {layout.relationships.map((relationship) => {
            const active =
              highlight?.kind === 'relationship' &&
              highlight.relationshipIndex === relationship.index;
            return (
              <g
                key={relationship.index}
                data-relationship={relationship.index}
                data-highlighted={active || undefined}
              >
                <path
                  d={relationship.path}
                  fill="none"
                  strokeWidth={active ? 4 : 2}
                  strokeDasharray={relationship.identifying ? undefined : '7 5'}
                  className={active ? 'stroke-focus' : 'stroke-fg'}
                />
                <CardinalityMark end={relationship.start} active={active} />
                <CardinalityMark end={relationship.end} active={active} />
                <text
                  x={relationship.labelPosition.x}
                  y={relationship.labelPosition.y}
                  textAnchor="middle"
                  fontWeight={active ? 'bold' : undefined}
                  // Contorno na cor do fundo para o rótulo continuar legível sobre a linha.
                  paintOrder="stroke"
                  strokeWidth={6}
                  strokeLinejoin="round"
                  className="fill-fg stroke-raised font-sans"
                >
                  {relationship.label}
                </text>
              </g>
            );
          })}

          {layout.entities.map((entity) => {
            const active = highlight?.kind === 'entity' && highlight.entityName === entity.name;
            const { box } = entity;
            return (
              <g key={entity.name} data-entity={entity.name} data-highlighted={active || undefined}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  rx={4}
                  strokeWidth={active ? 5 : 2}
                  className={`fill-raised ${active ? 'stroke-focus' : 'stroke-fg'}`}
                />
                <text
                  x={box.x + box.width / 2}
                  y={box.y + HEADER_HEIGHT / 2}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontWeight="bold"
                  className="fill-fg"
                >
                  {entity.name}
                </text>
                {entity.attributes.length > 0 && (
                  <line
                    x1={box.x}
                    x2={box.x + box.width}
                    y1={box.y + HEADER_HEIGHT}
                    y2={box.y + HEADER_HEIGHT}
                    strokeWidth={2}
                    className="stroke-fg"
                  />
                )}
                {entity.attributes.map((attribute) => {
                  const rowActive =
                    highlight?.kind === 'attribute' &&
                    highlight.entityName === entity.name &&
                    highlight.attributeName === attribute.name;
                  const row = attribute.box;
                  return (
                    <g
                      key={attribute.name}
                      data-attribute={attribute.name}
                      data-highlighted={rowActive || undefined}
                    >
                      {rowActive && (
                        <rect
                          x={row.x + 4}
                          y={row.y}
                          width={row.width - 8}
                          height={row.height}
                          rx={3}
                          fill="none"
                          strokeWidth={3}
                          className="stroke-focus"
                        />
                      )}
                      <text
                        x={row.x + 12}
                        y={row.y + row.height / 2}
                        dominantBaseline="central"
                        className="fill-fg"
                      >
                        {attribute.text}
                      </text>
                      {attribute.keys && (
                        <text
                          x={row.x + row.width - 12}
                          y={row.y + row.height / 2}
                          dominantBaseline="central"
                          textAnchor="end"
                          fontWeight="bold"
                          className="fill-muted"
                        >
                          {attribute.keys}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

/**
 * Símbolos de cardinalidade (notação "pé de galinha", a mesma do Mermaid), desenhados num
 * eixo local: x = 0 na borda da caixa, x crescendo para fora, ao longo da linha.
 * O máximo (um ou muitos) fica junto da caixa; o mínimo (zero ou um), mais afastado.
 */
function CardinalityMark({ end, active }: { end: RelationshipEnd; active: boolean }) {
  const { max, min } = cardinalityParts(end.cardinality);
  const degrees = (end.angle * 180) / Math.PI;
  return (
    <g
      transform={`translate(${end.point.x} ${end.point.y}) rotate(${degrees})`}
      data-cardinality={end.cardinality}
      fill="none"
      strokeWidth={active ? 3 : 2}
      className={active ? 'stroke-focus' : 'stroke-fg'}
    >
      {max === 'many' ? <path d="M 0 -8 L 14 0 L 0 8 M 0 0 L 14 0" /> : <path d="M 8 -8 L 8 8" />}
      {min === 'zero' ? (
        <circle cx={max === 'many' ? 22 : 18} cy={0} r={5} className="fill-raised" />
      ) : (
        <path d={max === 'many' ? 'M 20 -8 L 20 8' : 'M 14 -8 L 14 8'} />
      )}
    </g>
  );
}

function cardinalityParts(cardinality: Cardinality): { max: 'one' | 'many'; min: 'zero' | 'one' } {
  switch (cardinality) {
    case 'exactlyOne':
      return { max: 'one', min: 'one' };
    case 'zeroOrOne':
      return { max: 'one', min: 'zero' };
    case 'oneOrMany':
      return { max: 'many', min: 'one' };
    case 'zeroOrMany':
      return { max: 'many', min: 'zero' };
  }
}

function scaleBox(box: Box, scale: number): Box {
  return {
    x: box.x * scale,
    y: box.y * scale,
    width: box.width * scale,
    height: box.height * scale,
  };
}

function highlightedBox(layout: DiagramLayout, highlight: SemanticReference): Box | undefined {
  switch (highlight.kind) {
    case 'entity':
      return layout.entities.find((entity) => entity.name === highlight.entityName)?.box;
    case 'attribute':
      return layout.entities
        .find((entity) => entity.name === highlight.entityName)
        ?.attributes.find((attribute) => attribute.name === highlight.attributeName)?.box;
    case 'relationship': {
      const relationship = layout.relationships[highlight.relationshipIndex];
      if (!relationship) {
        return undefined;
      }
      const { start, end } = relationship;
      const x = Math.min(start.point.x, end.point.x);
      const y = Math.min(start.point.y, end.point.y);
      return {
        x,
        y,
        width: Math.abs(start.point.x - end.point.x),
        height: Math.abs(start.point.y - end.point.y),
      };
    }
  }
}

/**
 * Rola só a área do diagrama, sem mexer na página (scrollIntoView rolaria a página inteira
 * e tiraria da tela a árvore, onde está o foco).
 */
function scrollIntoContainer(container: HTMLElement, box: Box) {
  const margin = 24;
  const { scrollLeft, scrollTop, clientWidth, clientHeight } = container;
  let left = scrollLeft;
  let top = scrollTop;
  if (box.x - margin < scrollLeft) {
    left = box.x - margin;
  } else if (box.x + box.width + margin > scrollLeft + clientWidth) {
    left = box.x + box.width + margin - clientWidth;
  }
  if (box.y - margin < scrollTop) {
    top = box.y - margin;
  } else if (box.y + box.height + margin > scrollTop + clientHeight) {
    top = box.y + box.height + margin - clientHeight;
  }
  container.scrollLeft = Math.max(0, left);
  container.scrollTop = Math.max(0, top);
}
