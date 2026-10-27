import type { Attribute, Diagram, Entity, Relationship } from './model';
import {
  describeAttribute,
  describeDiagram,
  describeEntity,
  describeGroup,
  describeRelationship,
} from './narration';

export type SemanticNodeKind =
  | 'diagram'
  | 'entityGroup'
  | 'entity'
  | 'attributeGroup'
  | 'attribute'
  | 'relationshipGroup'
  | 'relationship';

/** Elemento do modelo representado pelo nó, usado para destacar o SVG ou consultar detalhes. */
export type SemanticReference =
  | { readonly kind: 'entity'; readonly entityName: string }
  | { readonly kind: 'attribute'; readonly entityName: string; readonly attributeName: string }
  | { readonly kind: 'relationship'; readonly relationshipIndex: number };

export interface SemanticNode {
  /** Único na árvore. Usa ":" como separador, caractere que não existe nos identificadores da gramática. */
  readonly id: string;
  readonly kind: SemanticNodeKind;
  /** Texto curto para exibição visual. */
  readonly label: string;
  /** Texto completo para leitor de tela, narração e exportação. */
  readonly description: string;
  readonly children: readonly SemanticNode[];
  readonly line?: number;
  readonly reference?: SemanticReference;
  /** Nó de destino ao ativar o item (ex.: Enter em um relacionamento leva à outra entidade). */
  readonly targetId?: string;
}

/**
 * Projeta um diagrama válido em uma árvore navegável:
 *
 * Diagrama
 * ├── Entidades
 * │   └── ENTIDADE
 * │       ├── Atributos
 * │       └── Relacionamentos (da entidade, com destino na outra entidade)
 * └── Relacionamentos (todos, na ordem do código)
 *
 * Grupos sem itens são omitidos para não criar nós expansíveis vazios.
 */
export function buildSemanticTree(diagram: Diagram): SemanticNode {
  const children: SemanticNode[] = [];

  if (diagram.entities.length > 0) {
    children.push(
      createGroupNode(
        'entities',
        'entityGroup',
        diagram.entities.map((entity) => createEntityNode(entity, diagram.relationships)),
      ),
    );
  }

  if (diagram.relationships.length > 0) {
    children.push(
      createGroupNode(
        'relationships',
        'relationshipGroup',
        diagram.relationships.map((relationship, index) =>
          createRelationshipNode(relationship, index, `relationship:${index}`),
        ),
      ),
    );
  }

  return {
    id: 'diagram',
    kind: 'diagram',
    label: 'Diagrama ER',
    description: describeDiagram(diagram),
    children,
    line: diagram.headerLine,
  };
}

export function entityNodeId(entityName: string): string {
  return `entity:${entityName}`;
}

type GroupKind = Extract<SemanticNodeKind, 'entityGroup' | 'attributeGroup' | 'relationshipGroup'>;

const groupNames: Readonly<
  Record<GroupKind, { readonly title: string; readonly singular: string; readonly plural: string }>
> = {
  entityGroup: { title: 'Entidades', singular: 'entidade', plural: 'entidades' },
  attributeGroup: { title: 'Atributos', singular: 'atributo', plural: 'atributos' },
  relationshipGroup: {
    title: 'Relacionamentos',
    singular: 'relacionamento',
    plural: 'relacionamentos',
  },
};

function createGroupNode(
  id: string,
  kind: GroupKind,
  children: readonly SemanticNode[],
): SemanticNode {
  const names = groupNames[kind];
  return {
    id,
    kind,
    label: `${names.title} (${children.length})`,
    description: describeGroup(children.length, names.singular, names.plural),
    children,
  };
}

function createEntityNode(entity: Entity, relationships: readonly Relationship[]): SemanticNode {
  const id = entityNodeId(entity.name);
  const relatedIndexes = relationships.flatMap((relationship, index) =>
    relationship.leftEntity === entity.name || relationship.rightEntity === entity.name
      ? [index]
      : [],
  );
  const children: SemanticNode[] = [];

  if (entity.attributes.length > 0) {
    children.push(
      createGroupNode(
        `${id}:attributes`,
        'attributeGroup',
        entity.attributes.map((attribute) => createAttributeNode(attribute, entity.name, id)),
      ),
    );
  }

  if (relatedIndexes.length > 0) {
    children.push(
      createGroupNode(
        `${id}:relationships`,
        'relationshipGroup',
        relatedIndexes.map((index) => {
          const relationship = relationships[index];
          const otherEntity =
            relationship.leftEntity === entity.name
              ? relationship.rightEntity
              : relationship.leftEntity;
          return createRelationshipNode(
            relationship,
            index,
            `${id}:relationship:${index}`,
            entityNodeId(otherEntity),
          );
        }),
      ),
    );
  }

  return {
    id,
    kind: 'entity',
    label: entity.name,
    description: describeEntity(entity, relatedIndexes.length),
    children,
    line: entity.declarationLine ?? entity.firstMentionLine,
    reference: { kind: 'entity', entityName: entity.name },
  };
}

function createAttributeNode(
  attribute: Attribute,
  entityName: string,
  entityId: string,
): SemanticNode {
  const keys = attribute.keys.length > 0 ? ` [${attribute.keys.join(', ')}]` : '';
  return {
    id: `${entityId}:attribute:${attribute.name}`,
    kind: 'attribute',
    label: `${attribute.name}: ${attribute.type}${keys}`,
    description: describeAttribute(attribute),
    children: [],
    line: attribute.line,
    reference: { kind: 'attribute', entityName, attributeName: attribute.name },
  };
}

function createRelationshipNode(
  relationship: Relationship,
  index: number,
  id: string,
  targetId?: string,
): SemanticNode {
  return {
    id,
    kind: 'relationship',
    label: `${relationship.leftEntity} ${relationship.label} ${relationship.rightEntity}`,
    description: describeRelationship(relationship),
    children: [],
    line: relationship.line,
    reference: { kind: 'relationship', relationshipIndex: index },
    targetId,
  };
}
