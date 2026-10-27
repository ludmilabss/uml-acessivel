import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SemanticNode } from '../core';
import {
  ancestorIds,
  buildParentMap,
  findNode,
  flattenVisible,
  initialExpandedIds,
} from './treeNavigation';

interface SemanticTreeProps {
  readonly tree: SemanticNode;
  /** Id do título que nomeia a árvore para o leitor de tela. */
  readonly labelledBy: string;
  /** Id de um texto com instruções de uso, lido pelo leitor de tela ao chegar na árvore. */
  readonly describedBy?: string;
  /** Avisa o texto lido do item focado (ou undefined quando o foco sai da árvore). */
  readonly onFocusChange?: (spokenText: string | undefined) => void;
}

/**
 * Árvore navegável pelo padrão WAI-ARIA Treeview:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 *
 * Usa "roving tabindex": só o item focado tem tabIndex 0, então Tab entra e sai
 * da árvore com uma única parada, e as setas movem o foco dentro dela.
 * Para começar do zero quando o diagrama muda, o componente pai troca a `key`.
 */
export function SemanticTree({ tree, labelledBy, describedBy, onFocusChange }: SemanticTreeProps) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() =>
    initialExpandedIds(tree),
  );
  const [focusedId, setFocusedId] = useState(tree.id);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const shouldMoveFocus = useRef(false);

  const parents = useMemo(() => buildParentMap(tree), [tree]);
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
      ? `${node.description} Enter leva à entidade ${target.label}`
      : node.description;
    return text.replace(/\.$/, '');
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
        aria-label={accessibleName(node)}
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
            onFocusChange?.(accessibleName(node));
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
          className={`tree-row flex cursor-pointer items-baseline gap-2 rounded-sm border-[3px] border-transparent py-0.5 pr-2 font-mono ${
            node.kind === 'attribute' || node.kind === 'relationship' ? '' : 'font-bold'
          } ${node.targetId ? 'text-accent' : ''}`}
          style={{ paddingLeft: `${(level - 1) * 1.25 + 0.25}rem` }}
        >
          <span className="w-4 shrink-0 text-center">{rowMarker(node, isExpanded)}</span>
          <span>
            {node.kind === 'entity' && 'Entidade · '}
            {node.label}
          </span>
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
      className="text-base"
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

function isGroup(node: SemanticNode): boolean {
  return (
    node.kind === 'entityGroup' ||
    node.kind === 'attributeGroup' ||
    node.kind === 'relationshipGroup'
  );
}
