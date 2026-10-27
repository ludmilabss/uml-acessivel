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
