import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { SemanticNode, SemanticReference } from '../core';
import {
  ancestorIds,
  buildParentMap,
  carryOverTreeState,
  findNode,
  flattenVisible,
  type TreeMemory,
} from './treeNavigation';
import { forSpeech } from './pronunciation';

interface SemanticTreeProps {
  readonly tree: SemanticNode;
  /** Estado guardado da interpretação anterior, para não fechar tudo a cada reinterpretação. */
  readonly memory?: TreeMemory;
  readonly onMemoryChange?: (memory: TreeMemory) => void;
  /** Id do título que nomeia a árvore para o leitor de tela. */
  readonly labelledBy: string;
  /** Id de um texto com instruções de uso, lido pelo leitor de tela ao chegar na árvore. */
  readonly describedBy?: string;
  /** Avisa o item focado (ou undefined quando o foco sai da árvore). */
  readonly onFocusChange?: (focus: TreeFocus | undefined) => void;
}

/**
 * Árvore navegável pelo padrão WAI-ARIA Treeview:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * Usa "roving tabindex": só o item focado tem tabIndex 0, então Tab entra e sai
 * da árvore com uma única parada, e as setas movem o foco dentro dela.
 * Para começar do zero quando o diagrama muda, o componente pai troca a `key`.
 */
export interface TreeFocus {
  /** Texto lido pelo leitor de tela, sem o ajuste de pronúncia. */
  readonly text: string;
  /**
   * Elemento do diagrama correspondente. Num grupo de uma entidade ("Atributos (3)"),
   * é a própria entidade.
   */
  readonly reference?: SemanticReference;
}

export function SemanticTree({
  tree,
  memory,
  onMemoryChange,
  labelledBy,
  describedBy,
  onFocusChange,
}: SemanticTreeProps) {
  // Começa do estado da interpretação anterior, se houver (grupos abertos e item atual).
  const [initialState] = useState(() => carryOverTreeState(memory, tree));
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(initialState.expandedIds);
  const [focusedId, setFocusedId] = useState(initialState.focusedId);

  useEffect(() => {
    onMemoryChange?.({ tree, expandedIds, focusedId });
  }, [tree, expandedIds, focusedId, onMemoryChange]);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const shouldMoveFocus = useRef(false);

  const parents = useMemo(() => buildParentMap(tree), [tree]);
  const entityNames = useMemo(() => collectEntityNames(tree), [tree]);
  const visibleNodes = useMemo(() => flattenVisible(tree, expandedIds), [tree, expandedIds]);

  // O foco só muda depois da renderização, quando o item de destino já existe no DOM.
  useEffect(() => {
    if (shouldMoveFocus.current) {
      shouldMoveFocus.current = false;
      itemRefs.current.get(focusedId)?.focus();
    }
  }, [focusedId, expandedIds]);

  function moveFocus(id: string | undefined) {
    if (id === undefined) {
      return;
    }
    shouldMoveFocus.current = true;
    setFocusedId(id);
  }

  function setExpanded(id: string, expanded: boolean) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (expanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function jumpTo(targetId: string) {
    setExpandedIds((previous) => new Set([...previous, ...ancestorIds(targetId, parents)]));
    moveFocus(targetId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>, node: SemanticNode) {
    // Os itens são aninhados: só o item que recebeu a tecla deve reagir, não os ancestrais.
    if (event.target !== event.currentTarget) {
      return;
    }

    const index = visibleNodes.findIndex((visible) => visible.id === node.id);
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    switch (event.key) {
      case 'ArrowDown':
        moveFocus(visibleNodes[index + 1]?.id);
        break;
      case 'ArrowUp':
        moveFocus(visibleNodes[index - 1]?.id);
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded) {
          setExpanded(node.id, true);
        } else if (hasChildren) {
          moveFocus(node.children[0].id);
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded) {
          setExpanded(node.id, false);
        } else {
          moveFocus(parents.get(node.id));
        }
        break;
      case 'Home':
        moveFocus(visibleNodes[0].id);
        break;
      case 'End':
        moveFocus(visibleNodes[visibleNodes.length - 1].id);
        break;
      case 'Enter':
        if (node.targetId) {
          jumpTo(node.targetId);
        } else if (hasChildren) {
          setExpanded(node.id, !isExpanded);
        }
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /**
   * Começa pelo texto visível (WCAG 2.5.3), para o controle por voz.
   * Sem ponto final: o leitor de tela já pausa antes do estado ("expandido").
   */
  function accessibleName(node: SemanticNode): string {
    if (isGroup(node)) {
      return node.label;
    }
    const target = node.targetId ? findNode(tree, node.targetId) : undefined;
    const text = target
      ? `${node.description} Pressione Enter para ir até a entidade ${target.label}`
      : node.description;
    return text.replace(/\.$/, '');
  }

  function nearestReference(node: SemanticNode): SemanticReference | undefined {
    for (let id: string | undefined = node.id; id !== undefined; id = parents.get(id)) {
      const reference = findNode(tree, id)?.reference;
      if (reference) {
        return reference;
      }
    }
    return undefined;
  }

  function renderNode(node: SemanticNode, level: number, position: number, setSize: number) {
    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && expandedIds.has(node.id);

    return (
      <li
        key={node.id}
        ref={(element) => {
          if (element) {
            itemRefs.current.set(node.id, element);
          } else {
            itemRefs.current.delete(node.id);
          }
        }}
        // Sem aria-selected, que faria o leitor repetir "selecionado" em todo item.
        // O WAI-ARIA 1.2 não o exige em treeitem; a regra do jsx-a11y está desatualizada.
        // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
        role="treeitem"
        aria-label={forSpeech(accessibleName(node))}
        aria-level={level}
        aria-posinset={position}
        aria-setsize={setSize}
        aria-expanded={hasChildren ? isExpanded : undefined}
        tabIndex={node.id === focusedId ? 0 : -1}
        className="tree-item"
        onKeyDown={(event) => handleKeyDown(event, node)}
        onFocus={(event) => {
          if (event.target === event.currentTarget) {
            setFocusedId(node.id);
            onFocusChange?.({ text: accessibleName(node), reference: nearestReference(node) });
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          moveFocus(node.id);
          if (hasChildren) {
            setExpanded(node.id, !isExpanded);
          }
        }}
      >
        {/* Só visual: o leitor de tela lê o aria-label do item e não deve parar neste texto. */}
        <span
          aria-hidden="true"
          // Negrito só nos nomes (em renderRowText); grupos ficam em peso normal.
          className="tree-row flex cursor-pointer items-baseline gap-2 rounded-sm border-[3px] border-transparent py-0.5 pr-2"
          style={{ paddingLeft: `${(level - 1) * 1.25 + 0.25}rem` }}
        >
          <span className="w-4 shrink-0 text-center">{rowMarker(node, isExpanded)}</span>
          <span>{renderRowText(node, entityNames, targetEntityName(tree, node))}</span>
        </span>
        {isExpanded && (
          <ul role="group">
            {node.children.map((child, childIndex) =>
              renderNode(child, level + 1, childIndex + 1, node.children.length),
            )}
          </ul>
        )}
      </li>
    );
  }

  return (
    <ul
      role="tree"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Focável (fora da ordem do Tab) só para repassar o foco ao item atual. Com a raiz aberta,
      // o cursor do VoiceOver para primeiro na árvore como um todo; sem isso, o foco do teclado
      // não chegava a nenhum item e as setas não funcionavam.
      tabIndex={-1}
      className="text-base outline-none"
      onFocus={(event) => {
        // Só ao entrar (foco vindo de fora). Saindo, o VoiceOver também passa pela árvore como
        // um todo; repassar ali prenderia o cursor dentro dela.
        const comingFromInside = event.currentTarget.contains(event.relatedTarget as Node | null);
        if (event.target === event.currentTarget && !comingFromInside) {
          itemRefs.current.get(focusedId)?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onFocusChange?.(undefined);
        }
      }}
    >
      {renderNode(tree, 1, 1, 1)}
    </ul>
  );
}

function rowMarker(node: SemanticNode, isExpanded: boolean): string {
  if (node.children.length > 0) {
    return isExpanded ? '▾' : '▸';
  }
  return node.targetId ? '↳' : '·';
}

/**
 * Texto da linha na tela. Em entidades, atributos e relacionamentos é a primeira frase da
 * narração, para o nome lido começar exatamente pelo texto visível (WCAG 2.5.3).
 */
function visibleText(node: SemanticNode): string {
  if (node.kind === 'diagram' || isGroup(node)) {
    return node.label;
  }
  const end = node.description.indexOf('. ');
  return (end === -1 ? node.description : node.description.slice(0, end)).replace(/\.$/, '');
}

/**
 * Destaca os nomes (entidades e atributos) e deixa o resto da frase em cor secundária.
 * Só muda o estilo: as palavras são as de visibleText, e o 2.5.3 continua cumprido.
 */
/** Nome da entidade para onde o Enter leva, quando o item tem destino. */
function targetEntityName(tree: SemanticNode, node: SemanticNode): string | undefined {
  const target = node.targetId ? findNode(tree, node.targetId) : undefined;
  return target?.reference?.kind === 'entity' ? target.reference.entityName : undefined;
}

function renderRowText(
  node: SemanticNode,
  entityNames: ReadonlySet<string>,
  targetName?: string,
): ReactNode {
  const text = visibleText(node);
  if (node.reference?.kind === 'attribute') {
    return renderAttributeText(node.reference.attributeName, text);
  }
  const names = namesToHighlight(node, entityNames);
  if (names.size === 0) {
    return text;
  }

  const highlighted = new Set<string>();
  return text.split(/([A-Za-z_][A-Za-z0-9_-]*)/).map((part, index) => {
    // Na entidade, só a primeira ocorrência é o nome ("Entidade: Entidade").
    const isName = names.has(part) && (node.kind === 'relationship' || !highlighted.has(part));
    if (isName) {
      highlighted.add(part);
      return (
        // A cor de destaque marca só a entidade para onde o Enter leva.
        <strong
          key={index}
          className={`font-mono ${part === targetName ? 'text-accent' : 'text-fg'}`}
        >
          {part}
        </strong>
      );
    }
    return (
      <span key={index} className="text-muted">
        {part}
      </span>
    );
  });
}

/**
 * Forma de diagrama ER: nome : tipo e a chave numa etiqueta. As palavras são as da
 * narração ("id: int, chave primária"), só a pontuação muda.
 */
function renderAttributeText(name: string, text: string): ReactNode {
  const [type, ...keys] = text.slice(name.length + 2).split(', ');
  return (
    <>
      <strong className="font-mono text-fg">{name}</strong>
      <span className="text-muted"> : </span>
      <span className="font-mono">{type}</span>
      {keys.length > 0 && ' '}
      {keys.length > 0 && (
        <span className="ml-1 rounded-sm border border-muted px-1.5 text-muted">
          {keys.join(', ')}
        </span>
      )}
    </>
  );
}

function namesToHighlight(node: SemanticNode, entityNames: ReadonlySet<string>): Set<string> {
  switch (node.reference?.kind) {
    case 'entity':
      return new Set([node.reference.entityName]);
    case 'attribute':
      return new Set([node.reference.attributeName]);
    case 'relationship':
      return new Set(entityNames);
    default:
      return new Set();
  }
}

function collectEntityNames(tree: SemanticNode): Set<string> {
  const names = new Set<string>();
  const visit = (node: SemanticNode) => {
    if (node.reference?.kind === 'entity') {
      names.add(node.reference.entityName);
    }
    node.children.forEach(visit);
  };
  visit(tree);
  return names;
}

function isGroup(node: SemanticNode): boolean {
  return (
    node.kind === 'entityGroup' ||
    node.kind === 'attributeGroup' ||
    node.kind === 'relationshipGroup'
  );
}
