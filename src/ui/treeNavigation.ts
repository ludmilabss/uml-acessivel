import type { SemanticNode } from '../core';

/** Nós visíveis na ordem em que aparecem na tela (filhos só de nós expandidos). */
export function flattenVisible(
  root: SemanticNode,
  expandedIds: ReadonlySet<string>,
): SemanticNode[] {
  const visible: SemanticNode[] = [];
  const visit = (node: SemanticNode) => {
    visible.push(node);
    if (expandedIds.has(node.id)) {
      node.children.forEach(visit);
    }
  };
  visit(root);
  return visible;
}

/** Mapa id do nó → id do pai. A raiz não aparece no mapa. */
export function buildParentMap(root: SemanticNode): ReadonlyMap<string, string> {
  const parents = new Map<string, string>();
  const visit = (node: SemanticNode) => {
    for (const child of node.children) {
      parents.set(child.id, node.id);
      visit(child);
    }
  };
  visit(root);
  return parents;
}

/** Ids dos ancestrais, do pai até a raiz. */
export function ancestorIds(id: string, parents: ReadonlyMap<string, string>): string[] {
  const ancestors: string[] = [];
  for (let parent = parents.get(id); parent !== undefined; parent = parents.get(parent)) {
    ancestors.push(parent);
  }
  return ancestors;
}

export function findNode(root: SemanticNode, id: string): SemanticNode | undefined {
  if (root.id === id) {
    return root;
  }
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** A árvore começa com a raiz e os grupos principais (Entidades, Relacionamentos) abertos. */
export function initialExpandedIds(root: SemanticNode): Set<string> {
  return new Set([root.id, ...root.children.map((child) => child.id)]);
}

/** Estado da árvore que sobrevive a uma nova interpretação do código. */
export interface TreeMemory {
  readonly tree: SemanticNode;
  readonly expandedIds: ReadonlySet<string>;
  readonly focusedId: string;
}

function collectIds(root: SemanticNode): Set<string> {
  const ids = new Set<string>();
  const visit = (node: SemanticNode) => {
    ids.add(node.id);
    node.children.forEach(visit);
  };
  visit(root);
  return ids;
}

/**
 * Leva o estado da árvore anterior para a nova: os grupos que ainda existem continuam abertos,
 * e o item atual continua o mesmo ou, se sumiu, vira o ancestral mais próximo que ainda existe.
 * Grupos principais que não existiam antes começam abertos, como na primeira vez.
 */
export function carryOverTreeState(
  memory: TreeMemory | undefined,
  tree: SemanticNode,
): { expandedIds: Set<string>; focusedId: string } {
  if (!memory) {
    return { expandedIds: initialExpandedIds(tree), focusedId: tree.id };
  }

  const nextIds = collectIds(tree);
  const previousIds = collectIds(memory.tree);
  const expandedIds = new Set([...memory.expandedIds].filter((id) => nextIds.has(id)));
  for (const id of initialExpandedIds(tree)) {
    if (!previousIds.has(id)) {
      expandedIds.add(id);
    }
  }

  const previousParents = buildParentMap(memory.tree);
  let focusedId = tree.id;
  for (
    let id: string | undefined = memory.focusedId;
    id !== undefined;
    id = previousParents.get(id)
  ) {
    if (nextIds.has(id)) {
      focusedId = id;
      break;
    }
  }

  // O item atual precisa estar visível: abre o caminho até ele.
  ancestorIds(focusedId, buildParentMap(tree)).forEach((id) => expandedIds.add(id));
  return { expandedIds, focusedId };
}
