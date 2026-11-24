import type { Cardinality, Diagram, Entity, Relationship } from '../core';

export const FONT_SIZE = 16;
// Fonte monoespaçada: cada caractere ocupa ~0,6 do tamanho da fonte.
const CHAR_WIDTH = FONT_SIZE * 0.6;
export const HEADER_HEIGHT = 36;
export const ROW_HEIGHT = 26;
const PADDING_X = 12;
const PADDING_BOTTOM = 10;
// Espaço entre colunas para o rótulo e os símbolos de cardinalidade.
const COLUMN_GAP = 170;
const ROW_GAP = 56;
const MARGIN = 24;
const SELF_LOOP_REACH = 70;
const PARALLEL_OFFSET = 18;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AttributeLayout {
  readonly name: string;
  readonly text: string;
  readonly keys: string;
  readonly box: Box;
}

export interface EntityLayout {
  readonly name: string;
  readonly box: Box;
  readonly attributes: readonly AttributeLayout[];
}

export interface RelationshipEnd {
  readonly point: Point;
  /** Ângulo (radianos) que aponta da caixa para fora, ao longo da linha. */
  readonly angle: number;
  readonly cardinality: Cardinality;
}

export interface RelationshipLayout {
  readonly index: number;
  readonly path: string;
  readonly start: RelationshipEnd;
  readonly end: RelationshipEnd;
  readonly identifying: boolean;
  readonly label: string;
  readonly labelPosition: Point;
}

export interface DiagramLayout {
  readonly width: number;
  readonly height: number;
  readonly entities: readonly EntityLayout[];
  readonly relationships: readonly RelationshipLayout[];
}

/**
 * Posiciona as entidades em colunas, da esquerda para a direita, seguindo a direção
 * dos relacionamentos (entidade da esquerda → entidade da direita), e traça as linhas.
 */
export function layoutDiagram(diagram: Diagram): DiagramLayout {
  if (diagram.entities.length === 0) {
    return { width: MARGIN * 2, height: MARGIN * 2, entities: [], relationships: [] };
  }
  const columns = assignColumns(diagram.entities, diagram.relationships);
  const sizes = new Map(diagram.entities.map((entity) => [entity.name, entitySize(entity)]));

  const byColumn: Entity[][] = [];
  for (const entity of diagram.entities) {
    (byColumn[columns.get(entity.name)!] ??= []).push(entity);
  }
  const nonEmptyColumns = byColumn.filter((column) => column !== undefined);

  const columnHeight = (column: Entity[]) =>
    column.reduce((total, entity) => total + sizes.get(entity.name)!.height, 0) +
    ROW_GAP * (column.length - 1);
  const tallest = Math.max(...nonEmptyColumns.map(columnHeight));

  const boxes = new Map<string, Box>();
  let x = MARGIN;
  for (const column of nonEmptyColumns) {
    const columnWidth = Math.max(...column.map((entity) => sizes.get(entity.name)!.width));
    // Colunas mais baixas ficam centralizadas na altura da mais alta.
    let y = MARGIN + (tallest - columnHeight(column)) / 2;
    for (const entity of column) {
      const size = sizes.get(entity.name)!;
      boxes.set(entity.name, { x, y, width: size.width, height: size.height });
      y += size.height + ROW_GAP;
    }
    x += columnWidth + COLUMN_GAP;
  }

  const entities = diagram.entities.map((entity) => layoutEntity(entity, boxes.get(entity.name)!));
  const relationships = layoutRelationships(diagram.relationships, boxes);

  const hasSelfLoop = (name: string) =>
    diagram.relationships.some((r) => r.leftEntity === name && r.rightEntity === name);
  const right = Math.max(
    ...entities.map(
      ({ name, box }) => box.x + box.width + (hasSelfLoop(name) ? SELF_LOOP_REACH + 40 : 0),
    ),
  );
  const bottom = Math.max(...entities.map(({ box }) => box.y + box.height));

  return { width: right + MARGIN, height: bottom + MARGIN, entities, relationships };
}

function assignColumns(
  entities: readonly Entity[],
  relationships: readonly Relationship[],
): Map<string, number> {
  const column = new Map(entities.map((entity) => [entity.name, 0]));
  const edges = relationships.filter((r) => r.leftEntity !== r.rightEntity);

  // Caminho mais longo a partir das origens; o limite evita laço infinito em ciclos.
  for (let pass = 0; pass < entities.length; pass += 1) {
    let changed = false;
    for (const { leftEntity, rightEntity } of edges) {
      const next = column.get(leftEntity)! + 1;
      if (next < entities.length && next > column.get(rightEntity)!) {
        column.set(rightEntity, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }

  // Uma origem fica logo antes da primeira entidade para onde aponta, e não sempre na coluna 0,
  // para a linha não atravessar outra coluna.
  const hasIncoming = new Set(edges.map((r) => r.rightEntity));
  for (const { name } of entities) {
    const targets = edges
      .filter((r) => r.leftEntity === name)
      .map((r) => column.get(r.rightEntity)!);
    if (!hasIncoming.has(name) && targets.length > 0) {
      column.set(name, Math.max(0, Math.min(...targets) - 1));
    }
  }
  return column;
}

function attributeText(attribute: Entity['attributes'][number]): { text: string; keys: string } {
  return { text: `${attribute.name}: ${attribute.type}`, keys: attribute.keys.join(', ') };
}

function entitySize(entity: Entity): { width: number; height: number } {
  const rowWidths = entity.attributes.map((attribute) => {
    const { text, keys } = attributeText(attribute);
    return (text.length + (keys ? keys.length + 3 : 0)) * CHAR_WIDTH;
  });
  const width = Math.max(entity.name.length * CHAR_WIDTH, ...rowWidths, 80) + PADDING_X * 2;
  const height =
    HEADER_HEIGHT +
    (entity.attributes.length > 0 ? entity.attributes.length * ROW_HEIGHT + PADDING_BOTTOM : 0);
  return { width: Math.ceil(width), height };
}

function layoutEntity(entity: Entity, box: Box): EntityLayout {
  return {
    name: entity.name,
    box,
    attributes: entity.attributes.map((attribute, index) => ({
      name: attribute.name,
      ...attributeText(attribute),
      box: {
        x: box.x,
        y: box.y + HEADER_HEIGHT + 4 + index * ROW_HEIGHT,
        width: box.width,
        height: ROW_HEIGHT,
      },
    })),
  };
}

function layoutRelationships(
  relationships: readonly Relationship[],
  boxes: ReadonlyMap<string, Box>,
): RelationshipLayout[] {
  // Relacionamentos repetidos entre o mesmo par ganham linhas paralelas.
  const pairKey = (r: Relationship) => [r.leftEntity, r.rightEntity].sort().join('\u0000');
  const pairTotals = new Map<string, number>();
  relationships.forEach((r) => pairTotals.set(pairKey(r), (pairTotals.get(pairKey(r)) ?? 0) + 1));
  const pairSeen = new Map<string, number>();

  return relationships.map((relationship, index) => {
    const key = pairKey(relationship);
    const order = pairSeen.get(key) ?? 0;
    pairSeen.set(key, order + 1);

    const common = {
      index,
      identifying: relationship.kind === 'identifying',
      label: relationship.label,
    };
    const leftBox = boxes.get(relationship.leftEntity)!;

    if (relationship.leftEntity === relationship.rightEntity) {
      const reach = SELF_LOOP_REACH + order * PARALLEL_OFFSET;
      const right = leftBox.x + leftBox.width;
      const start = { x: right, y: leftBox.y + leftBox.height * 0.3 };
      const end = { x: right, y: leftBox.y + leftBox.height * 0.7 };
      return {
        ...common,
        path: `M ${start.x} ${start.y} C ${right + reach} ${start.y - 20}, ${right + reach} ${end.y + 20}, ${end.x} ${end.y}`,
        start: { point: start, angle: 0, cardinality: relationship.leftCardinality },
        end: { point: end, angle: 0, cardinality: relationship.rightCardinality },
        labelPosition: { x: right + reach * 0.75 + 8, y: leftBox.y + leftBox.height / 2 },
      };
    }

    const rightBox = boxes.get(relationship.rightEntity)!;
    const from = center(leftBox);
    const to = center(rightBox);
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const shift = (order - (pairTotals.get(key)! - 1) / 2) * PARALLEL_OFFSET;
    const normal = {
      x: (-(to.y - from.y) / length) * shift,
      y: ((to.x - from.x) / length) * shift,
    };
    const origin = { x: from.x + normal.x, y: from.y + normal.y };
    const target = { x: to.x + normal.x, y: to.y + normal.y };

    const start = boxExit(leftBox, origin, target);
    const end = boxExit(rightBox, target, origin);
    return {
      ...common,
      path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
      start: {
        point: start,
        angle: Math.atan2(end.y - start.y, end.x - start.x),
        cardinality: relationship.leftCardinality,
      },
      end: {
        point: end,
        angle: Math.atan2(start.y - end.y, start.x - end.x),
        cardinality: relationship.rightCardinality,
      },
      labelPosition: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8 },
    };
  });
}

function center(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Ponto em que a semirreta que sai de `origin` (dentro da caixa) rumo a `target` cruza a borda. */
export function boxExit(box: Box, origin: Point, target: Point): Point {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const limits = [
    dx > 0 ? (box.x + box.width - origin.x) / dx : dx < 0 ? (box.x - origin.x) / dx : Infinity,
    dy > 0 ? (box.y + box.height - origin.y) / dy : dy < 0 ? (box.y - origin.y) / dy : Infinity,
  ];
  const t = Math.min(...limits);
  return { x: origin.x + dx * t, y: origin.y + dy * t };
}
